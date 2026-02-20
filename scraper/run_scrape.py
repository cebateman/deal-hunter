#!/usr/bin/env python3
"""
Deal Hunter — Scraper Runner
Scrapes BizBuySell + broker sites, processes results, and POSTs deals to the API.
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
from urllib.parse import quote, urljoin

import requests
from bs4 import BeautifulSoup

# Add parent dir to path so we can import the scraper module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from deal_hunter_scraper import (
    CRITERIA,
    Deal,
    parse_listing_card,
    parse_detail_page,
    process_deal,
    passes_financial_filters,
    build_search_urls_with_filters,
)


def fetch_criteria_from_api(app_url: str) -> dict | None:
    """Fetch deal criteria from the web app's API, if available."""
    base = app_url.rstrip("/").replace("http://", "https://")
    url = f"{base}/api/criteria"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if "ev_min" in data:
                return data
    except Exception as e:
        print(f"Could not fetch criteria from API: {e}", file=sys.stderr)
    return None


def apply_api_criteria(api_criteria: dict) -> None:
    """Override the in-memory CRITERIA dict with values from the API."""
    CRITERIA["ev_min"] = api_criteria.get("ev_min", CRITERIA["ev_min"])
    CRITERIA["ev_max"] = api_criteria.get("ev_max", CRITERIA["ev_max"])
    CRITERIA["revenue_min"] = api_criteria.get("revenue_min", CRITERIA["revenue_min"])
    CRITERIA["revenue_max"] = api_criteria.get("revenue_max", CRITERIA["revenue_max"])
    CRITERIA["ebitda_min"] = api_criteria.get("ebitda_min", CRITERIA["ebitda_min"])
    CRITERIA["max_multiple"] = api_criteria.get("max_multiple", CRITERIA["max_multiple"])
    CRITERIA["geography"] = api_criteria.get("geography", CRITERIA["geography"])

    if api_criteria.get("preferred_traits"):
        CRITERIA["preferred_traits"] = api_criteria["preferred_traits"]
    if api_criteria.get("avoid_traits"):
        CRITERIA["avoid_traits"] = api_criteria["avoid_traits"]
    if api_criteria.get("target_industries"):
        CRITERIA["target_industries"] = api_criteria["target_industries"]
    if api_criteria.get("search_keywords"):
        CRITERIA["search_keywords"] = api_criteria["search_keywords"]

SOURCES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources.json")

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


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


def scrape_detail_pages(listing_urls: list[str]) -> dict[str, str]:
    """Visit individual listing detail pages with Playwright and return {url: html}."""
    if not listing_urls:
        return {}

    # Limit to avoid excessive runtime (detail pages take ~4s each)
    urls_to_visit = listing_urls[:50]
    urls_json = json.dumps(urls_to_visit)

    script = f"""
const {{ chromium }} = require('playwright');

(async () => {{
    const browser = await chromium.launch({{
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    }});

    const context = await browser.newContext({{
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: {{ width: 1440, height: 900 }},
        locale: 'en-US',
    }});

    const page = await context.newPage();
    await page.addInitScript(() => {{
        Object.defineProperty(navigator, 'webdriver', {{ get: () => false }});
    }});

    const urls = {urls_json};
    const results = {{}};

    for (const url of urls) {{
        try {{
            console.error(`Detail: ${{url}}`);
            const response = await page.goto(url, {{ timeout: 20000, waitUntil: 'domcontentloaded' }});
            console.error(`  Status: ${{response?.status()}}`);

            await page.waitForTimeout(2000);
            const html = await page.content();
            results[url] = html;

            const delay = 1500 + Math.random() * 2500;
            await page.waitForTimeout(delay);
        }} catch (e) {{
            console.error(`  Error: ${{e.message}}`);
        }}
    }}

    console.log(JSON.stringify(results));
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

        if result.stderr.strip():
            for line in result.stderr.strip().split('\n'):
                print(f"  [detail] {line}")

        if result.returncode != 0:
            print(f"Detail scraper exited with code {result.returncode}", file=sys.stderr)

        if result.stdout.strip():
            return json.loads(result.stdout.strip())
    except subprocess.TimeoutExpired:
        print("Detail scraper timed out", file=sys.stderr)
    except json.JSONDecodeError as e:
        print(f"Failed to parse detail scraper output: {e}", file=sys.stderr)
    except FileNotFoundError:
        print("Node.js not found", file=sys.stderr)

    return {}


def load_broker_sources() -> list[dict]:
    """Load broker sites from sources.json that don't require JS or login."""
    try:
        with open(SOURCES_FILE) as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Could not load sources.json: {e}", file=sys.stderr)
        return []

    brokers = []
    for broker in data.get("brokers", []):
        if broker.get("requires_login"):
            continue
        brokers.append(broker)
    return brokers


def scrape_broker_site(broker: dict) -> list[dict]:
    """Scrape a single broker site via HTTP and extract listing links."""
    url = broker["url"]
    name = broker["name"]
    listings = []

    try:
        resp = requests.get(url, headers=HTTP_HEADERS, timeout=20)
        if resp.status_code != 200:
            print(f"  [{name}] HTTP {resp.status_code}")
            return []

        soup = BeautifulSoup(resp.text, "html.parser")

        # Find all links that look like individual listing/detail pages
        for a in soup.find_all("a", href=True):
            href = a["href"]
            text = a.get_text(strip=True)

            # Skip navigation, empty, or very short links
            if not text or len(text) < 8:
                continue

            # Build absolute URL
            full_url = urljoin(url, href)

            # Skip links that point back to the same listing index page
            if full_url.rstrip("/") == url.rstrip("/"):
                continue

            # Skip obviously non-listing links (social, contact, about, etc.)
            skip_patterns = [
                "facebook", "twitter", "linkedin", "instagram", "youtube",
                "mailto:", "tel:", "#", "javascript:", "/contact", "/about",
                "/privacy", "/terms", "/login", "/register", "/blog",
                "/team", "/faq", "/careers",
            ]
            if any(p in full_url.lower() for p in skip_patterns):
                continue

            # Walk up to find the containing card/element for financial data
            card = a.find_parent(["article", "div", "li", "tr"])
            card_html = str(card) if card else str(a)
            card_text = card.get_text(" ", strip=True) if card else text

            listings.append({
                "title": text,
                "href": full_url,
                "text": card_text,
                "html": card_html,
                "source": name,
            })

    except requests.RequestException as e:
        print(f"  [{name}] Request failed: {e}")

    return listings


def scrape_all_brokers() -> list[dict]:
    """Scrape all non-JS, non-login broker sites from sources.json."""
    brokers = load_broker_sources()
    all_listings = []
    seen_titles = set()

    print(f"Scraping {len(brokers)} broker sites...")

    for broker in brokers:
        name = broker["name"]
        requires_js = broker.get("requires_js", False)

        if requires_js:
            print(f"  [{name}] Skipping (requires JS)")
            continue

        print(f"  [{name}] Scraping {broker['url']}")
        listings = scrape_broker_site(broker)

        for l in listings:
            if l["title"] not in seen_titles:
                seen_titles.add(l["title"])
                all_listings.append(l)

        # Fetch detail pages for broker listings (HTTP, up to 10 per broker)
        detail_count = 0
        for l in listings[:10]:
            detail_url = l.get("href", "")
            if not detail_url or "bizbuysell.com" in detail_url:
                continue
            html = fetch_broker_detail_page(detail_url)
            if html:
                l["detail_html"] = html
                detail_count += 1
            time.sleep(0.5)

        print(f"  [{name}] Found {len(listings)} listings, fetched {detail_count} detail pages")

        # Be polite between sites
        time.sleep(1)

    return all_listings


def fetch_broker_detail_page(url: str) -> str | None:
    """Fetch a single broker detail page via HTTP."""
    try:
        resp = requests.get(url, headers=HTTP_HEADERS, timeout=15)
        if resp.status_code == 200:
            return resp.text
    except requests.RequestException:
        pass
    return None


def _extract_financials_from_text(deal: Deal, text: str) -> None:
    """Try to pull financial figures from plain text when HTML parsing missed them."""
    from deal_hunter_scraper import parse_money as _pm

    if not deal.asking_price:
        m = re.search(r"(?:asking|price|listed)[^$]*\$([\d,]+(?:\.\d+)?(?:[MmKk])?)", text, re.IGNORECASE)
        if m:
            deal.asking_price = _pm(m.group(1))
        else:
            # Grab the first dollar amount as a rough asking price
            m = re.search(r"\$([\d,]{6,}(?:\.\d+)?)", text)
            if m:
                deal.asking_price = _pm(m.group(1))

    if not deal.revenue:
        m = re.search(r"(?:revenue|gross)[^$]*\$([\d,]+(?:\.\d+)?(?:[MmKk])?)", text, re.IGNORECASE)
        if m:
            deal.revenue = _pm(m.group(1))

    if not deal.ebitda:
        m = re.search(r"EBITDA[^$]*\$([\d,]+(?:\.\d+)?(?:[MmKk])?)", text, re.IGNORECASE)
        if m:
            deal.ebitda = _pm(m.group(1))

    if not deal.cash_flow_sde:
        m = re.search(r"(?:cash\s*flow|SDE|seller.?s?\s+discretionary)[^$]*\$([\d,]+(?:\.\d+)?(?:[MmKk])?)", text, re.IGNORECASE)
        if m:
            deal.cash_flow_sde = _pm(m.group(1))

    if not deal.year_established:
        m = re.search(r"(?:Established|Founded|Year\s+Est)[^\d]*((?:19|20)\d{2})", text, re.IGNORECASE)
        if m:
            deal.year_established = int(m.group(1))

    if not deal.employees:
        m = re.search(r"(?:Employees?|Staff|Workers?|Team\s+Size)[^\d]*(\d{1,4})", text, re.IGNORECASE)
        if m:
            deal.employees = int(m.group(1))


def process_raw_listings(raw_listings: list[dict]) -> list[dict]:
    """Process raw scraper output into Deal objects ready for the API."""
    deals = []

    for raw in raw_listings:
        try:
            deal = parse_listing_card(raw.get("html", ""), "")
            if not deal:
                deal = Deal()

            # Fall back to raw scraped data when parse_listing_card couldn't
            # extract fields (common for broker sites whose HTML doesn't match
            # BizBuySell selectors).
            if not deal.title and raw.get("title"):
                deal.title = raw["title"]
            if not deal.description and raw.get("text"):
                deal.description = raw["text"][:500]

            if not deal.title:
                continue

            # Override with direct data if available
            if raw.get("source"):
                deal.source = raw["source"]
            if raw.get("href"):
                href = raw["href"]
                if href.startswith("http"):
                    deal.url = href
                elif href.startswith("/"):
                    deal.url = f"https://www.bizbuysell.com{href}"
                else:
                    deal.url = href

            # Try to extract financials from the raw card text when the HTML
            # parser missed them (broker sites use varied formats).
            if raw.get("text"):
                _extract_financials_from_text(deal, raw["text"])

            # Enrich from the detail page if we scraped it
            if raw.get("detail_html"):
                deal = parse_detail_page(raw["detail_html"], deal)

            deal.date_found = deal.date_found or datetime.now().strftime("%Y-%m-%d")
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
    # Ensure HTTPS to avoid 301 redirects that downgrade POST → GET (→ 405)
    base = app_url.rstrip("/").replace("http://", "https://")
    url = f"{base}/api/scrape"
    payload = {
        "deals": deals,
        "send_digest": send_digest,
        "api_secret": api_secret,
    }

    try:
        resp = requests.post(url, json=payload, timeout=60, allow_redirects=True)
        resp.raise_for_status()
        return resp.json()
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

    # --- Fetch criteria from the web app ---
    print("--- Fetching Deal Criteria ---")
    api_criteria = fetch_criteria_from_api(app_url)
    if api_criteria:
        apply_api_criteria(api_criteria)
        print(f"Loaded criteria from API (updated {api_criteria.get('updated_at', 'unknown')})")
        print(f"  EV range: ${CRITERIA['ev_min']:,.0f} - ${CRITERIA['ev_max']:,.0f}")
        print(f"  EBITDA min: ${CRITERIA['ebitda_min']:,.0f}")
        print(f"  Max multiple: {CRITERIA['max_multiple']}x")
        print(f"  Target industries: {len(CRITERIA['target_industries'])}")
        print(f"  Search keywords: {len(CRITERIA['search_keywords'])}")
    else:
        print("Using default criteria (API not available)")
    print()

    all_raw_listings = []

    # --- Scrape broker sites (HTTP, no JS needed) ---
    print("--- Broker Sites (HTTP) ---")
    broker_listings = scrape_all_brokers()
    print(f"Total broker listings: {len(broker_listings)}")
    all_raw_listings.extend(broker_listings)
    print()

    # --- Scrape BizBuySell (Playwright) ---
    print("--- BizBuySell (Playwright) ---")
    urls = build_search_urls_with_filters()
    print(f"Generated {len(urls)} search URLs")
    print("Running Playwright scraper...")
    bbs_listings = scrape_with_playwright(urls)
    print(f"Scraped {len(bbs_listings)} BizBuySell listings")
    all_raw_listings.extend(bbs_listings)
    print()

    # --- Scrape detail pages for full financials ---
    # Collect listing URLs that point to individual deal pages
    detail_urls = []
    for raw in all_raw_listings:
        href = raw.get("href", "")
        if not href:
            continue
        if href.startswith("/"):
            href = f"https://www.bizbuysell.com{href}"
        # Only visit detail pages (not search/category pages)
        if "bizbuysell.com" in href and (
            "/businesses-for-sale/" in href or "business-opportunity" in href
        ):
            # Skip search index pages (no trailing slug/ID)
            if re.search(r"/\d+/?$", href) or re.search(r"/[a-z].*-[a-z].*-\d+", href):
                detail_urls.append(href)

    # Deduplicate
    detail_urls = list(dict.fromkeys(detail_urls))

    if detail_urls:
        print(f"--- Detail Pages ({len(detail_urls)} listings) ---")
        print("Scraping individual listing pages for full financials...")
        detail_html_map = scrape_detail_pages(detail_urls)
        print(f"Successfully scraped {len(detail_html_map)} detail pages")
        print()

        # Attach detail HTML to raw listings for enrichment during processing
        for raw in all_raw_listings:
            href = raw.get("href", "")
            if href.startswith("/"):
                href = f"https://www.bizbuysell.com{href}"
            if href in detail_html_map:
                raw["detail_html"] = detail_html_map[href]
    else:
        print("No detail page URLs found to enrich.")
        print()

    # Process all listings
    print(f"Processing {len(all_raw_listings)} total raw listings...")
    deals = process_raw_listings(all_raw_listings)
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
