#!/usr/bin/env python3
"""
Deal Hunter — Scraper Runner
Runs the BizBuySell scraper, processes results, and POSTs deals to the API.
Designed to be called from GitHub Actions or manually.

Usage:
  python scraper/run_scrape.py [--send-digest] [--dry-run]

Environment variables:
  APP_URL          - Base URL of the Deal Hunter app (default: http://localhost:3000)
  SCRAPE_API_SECRET - API secret for authentication
"""

import argparse
import json
import os
import sys
import time
import hashlib
import subprocess
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional
from urllib.parse import quote

# Add parent dir to path so we can import the scraper module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from deal_hunter_scraper import (
    CRITERIA,
    Deal,
    parse_listing_card,
    process_deal,
    passes_financial_filters,
    build_search_urls_with_filters,
)


def scrape_with_playwright(urls: list[str]) -> list[dict]:
    """Run Playwright to scrape listing pages and return raw listing data."""
    urls_json = json.dumps(urls[:20])  # Limit to avoid rate limiting

    script = f"""
const {{ chromium }} = require('playwright');

(async () => {{
    const browser = await chromium.launch({{
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
        ],
    }});

    const context = await browser.newContext({{
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: {{ width: 1440, height: 900 }},
        locale: 'en-US',
    }});

    const page = await context.newPage();

    // Remove webdriver flag
    await page.addInitScript(() => {{
        Object.defineProperty(navigator, 'webdriver', {{ get: () => false }});
    }});

    const urls = {urls_json};
    const allListings = [];
    const seen = new Set();

    for (const url of urls) {{
        try {{
            console.error(`Scraping: ${{url}}`);
            const response = await page.goto(url, {{ timeout: 30000, waitUntil: 'domcontentloaded' }});
            console.error(`  Status: ${{response?.status()}}`);

            // Wait for content to render
            await page.waitForTimeout(3000);

            // Try multiple selector strategies for BizBuySell
            const listings = await page.evaluate(() => {{
                const results = [];

                // Strategy 1: Look for links to business-opportunity pages
                const links = document.querySelectorAll('a[href*="/businesses-for-sale/"], a[href*="business-opportunity"]');
                const seenHrefs = new Set();

                for (const link of links) {{
                    const href = link.getAttribute('href') || '';
                    if (seenHrefs.has(href)) continue;
                    seenHrefs.add(href);

                    // Walk up to find the listing card container
                    let card = link.closest('[class*="listing"], [class*="result"], [class*="card"], article, .row');
                    if (!card) card = link.parentElement?.parentElement || link.parentElement;

                    const title = link.textContent?.trim() || '';
                    if (!title || title.length < 5) continue;

                    const text = card?.textContent || '';
                    const html = card?.outerHTML || link.outerHTML;
                    results.push({{ title, href, text, html }});
                }}

                // Strategy 2: If no results, try broader selectors
                if (results.length === 0) {{
                    const cards = document.querySelectorAll('[class*="listing"], [class*="search-result"], [class*="bizCard"]');
                    for (const card of cards) {{
                        const titleEl = card.querySelector('a, h2, h3, h4');
                        if (!titleEl) continue;
                        const title = titleEl.textContent?.trim() || '';
                        const href = titleEl.getAttribute('href') || '';
                        if (!title || title.length < 5) continue;
                        results.push({{ title, href, text: card.textContent || '', html: card.outerHTML }});
                    }}
                }}

                return results;
            }});

            for (const l of listings) {{
                if (l.title && !seen.has(l.title)) {{
                    seen.add(l.title);
                    allListings.push(l);
                }}
            }}

            console.error(`  Found ${{listings.length}} listings`);

            // Random delay between pages to avoid rate limiting
            const delay = 2000 + Math.random() * 3000;
            await page.waitForTimeout(delay);
        }} catch (e) {{
            console.error(`  Error: ${{e.message}}`);
        }}
    }}

    console.log(JSON.stringify(allListings));
    await browser.close();
}})();
"""

    try:
        result = subprocess.run(
            ["node", "-e", script],
            capture_output=True,
            text=True,
            timeout=600,
        )

        # Always show stderr so we can see per-URL status
        if result.stderr.strip():
            for line in result.stderr.strip().split('\n'):
                print(f"  [playwright] {line}")

        if result.returncode != 0:
            print(f"Playwright exited with code {result.returncode}", file=sys.stderr)

        if result.stdout.strip():
            return json.loads(result.stdout.strip())
    except subprocess.TimeoutExpired:
        print("Scraper timed out after 10 minutes", file=sys.stderr)
    except json.JSONDecodeError as e:
        print(f"Failed to parse scraper output: {e}", file=sys.stderr)
    except FileNotFoundError:
        print("Node.js not found — is it installed?", file=sys.stderr)

    return []


def process_raw_listings(raw_listings: list[dict]) -> list[dict]:
    """Process raw scraper output into Deal objects ready for the API."""
    deals = []

    for raw in raw_listings:
        try:
            deal = parse_listing_card(raw.get("html", ""), "")
            if not deal or not deal.title:
                continue

            # Override with direct data if available
            if raw.get("href"):
                href = raw["href"]
                deal.url = f"https://www.bizbuysell.com{href}" if href.startswith("/") else href

            deal = process_deal(deal)

            if not passes_financial_filters(deal):
                continue

            deal_dict = asdict(deal)
            # Rename fields to match API expectations
            deal_dict["asking_price"] = deal_dict.pop("asking_price", deal.asking_price)
            deal_dict["cash_flow_sde"] = deal_dict.pop("cash_flow_sde", deal.cash_flow_sde)
            deal_dict["year_established"] = deal_dict.pop("year_established", deal.year_established)
            deal_dict["raw_html"] = raw.get("html", "")[:5000]

            deals.append(deal_dict)
        except Exception as e:
            print(f"Error processing listing: {e}", file=sys.stderr)

    return deals


def post_deals_to_api(deals: list[dict], app_url: str, api_secret: str, send_digest: bool = False) -> dict:
    """POST scraped deals to the Deal Hunter API."""
    import urllib.request

    payload = json.dumps({
        "deals": deals,
        "send_digest": send_digest,
        "api_secret": api_secret,
    }).encode()

    req = urllib.request.Request(
        f"{app_url}/api/scrape",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"API error: {e}", file=sys.stderr)
        return {"error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="Deal Hunter Scraper")
    parser.add_argument("--send-digest", action="store_true", help="Send weekly digest email after scraping")
    parser.add_argument("--dry-run", action="store_true", help="Scrape but don't post to API")
    args = parser.parse_args()

    app_url = os.environ.get("APP_URL", "http://localhost:3000")
    api_secret = os.environ.get("SCRAPE_API_SECRET", "")

    print(f"Deal Hunter Scraper — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Target: {app_url}")
    print()

    # Generate URLs to scrape
    urls = build_search_urls_with_filters()
    print(f"Generated {len(urls)} search URLs")

    # Run Playwright scraper
    print("Running Playwright scraper...")
    raw_listings = scrape_with_playwright(urls)
    print(f"Scraped {len(raw_listings)} raw listings")

    # Process listings
    print("Processing listings...")
    deals = process_raw_listings(raw_listings)
    print(f"Processed {len(deals)} deals (after filtering)")

    if args.dry_run:
        print("\n[DRY RUN] Would post these deals:")
        for d in deals[:5]:
            print(f"  - {d.get('title', 'Unknown')} | Score: {d.get('score', 0)} | {d.get('industry', 'Unknown')}")
        if len(deals) > 5:
            print(f"  ... and {len(deals) - 5} more")
        return

    if not deals:
        print("No deals to post. Exiting.")
        return

    # Post to API
    print(f"Posting {len(deals)} deals to API...")
    result = post_deals_to_api(deals, app_url, api_secret, args.send_digest)
    print(f"API response: {json.dumps(result, indent=2)}")

    print("\nDone!")


if __name__ == "__main__":
    main()
