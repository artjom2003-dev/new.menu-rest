"""
Scrape restaurant menus from their websites using Playwright.
Uses DOM-based extraction (not regex on raw HTML).

Usage:
    cd restaurant_pipeline
    python scripts/scrape_menus.py
"""
import sys
import os
import json
import re
import asyncio
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
INPUT_FILE = PROJECT_ROOT / "restaurants_to_check.json"
CSV_FILE = PROJECT_ROOT / "menu_scrape_results.csv"
JSON_FILE = PROJECT_ROOT / "menu_scrape_full.json"

# JS code to extract menu items from DOM — runs inside the browser
EXTRACT_JS = """
() => {
    const results = [];
    const seen = new Set();

    // Strategy 1: Find elements containing price patterns (₽, руб, р.)
    // Then look at their parent/sibling for dish name
    const allElements = document.querySelectorAll('*');
    const priceRegex = /^\\s*(\\d{2,6})\\s*[₽руб.р]*\\s*$/;
    const priceRegex2 = /^\\s*от?\\s*(\\d{2,6})\\s*[₽руб.р]*\\s*$/;

    for (const el of allElements) {
        if (el.children.length > 0) continue; // only leaf nodes
        const text = (el.textContent || '').trim();
        if (!text) continue;

        const m = text.match(priceRegex) || text.match(priceRegex2);
        if (!m) continue;

        const price = parseInt(m[1]);
        if (price < 30 || price > 50000) continue;

        // Look for dish name in parent, previous sibling, or nearby elements
        let name = null;

        // Check parent's other children
        const parent = el.parentElement;
        if (parent) {
            // Look for text nodes in parent that aren't the price
            for (const child of parent.children) {
                if (child === el) continue;
                const childText = (child.textContent || '').trim();
                if (childText.length >= 3 && childText.length <= 120 && !childText.match(/^\\d+\\s*[₽руб]/)) {
                    // Check it's not a weight/description
                    if (!childText.match(/^\\d+\\s*(г|мл|гр|ml)$/i)) {
                        name = childText;
                        break;
                    }
                }
            }

            // Try grandparent
            if (!name && parent.parentElement) {
                const gp = parent.parentElement;
                for (const child of gp.children) {
                    if (child === parent) continue;
                    const childText = (child.textContent || '').trim();
                    if (childText.length >= 3 && childText.length <= 120
                        && !childText.match(/^\\d+\\s*[₽руб]/)
                        && !childText.match(/^\\d+\\s*(г|мл)$/i)) {
                        name = childText;
                        break;
                    }
                }
            }
        }

        // Previous element sibling
        if (!name && el.previousElementSibling) {
            const prevText = (el.previousElementSibling.textContent || '').trim();
            if (prevText.length >= 3 && prevText.length <= 120 && !prevText.match(/^\\d/)) {
                name = prevText;
            }
        }

        if (name && !seen.has(name.toLowerCase())) {
            // Clean name
            name = name.replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim();
            if (name.length >= 3 && name.length <= 120) {
                seen.add(name.toLowerCase());
                results.push({ name, price });
            }
        }
    }

    // Strategy 2: Text-based — find lines with "Name ... Price"
    const body = document.body ? document.body.innerText : '';
    const lines = body.split('\\n').map(l => l.trim()).filter(l => l);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length < 5 || line.length > 150) continue;

        // "Dish Name 450" pattern
        const m2 = line.match(/^(.{3,80})\\s+(\\d{2,5})\\s*[₽руб.р]*\\s*$/);
        if (m2) {
            const name = m2[1].trim().replace(/[.…·—–\\-]+$/, '').trim();
            const price = parseInt(m2[2]);
            if (price >= 30 && price <= 50000 && name.length >= 3 && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                results.push({ name, price });
            }
        }

        // Price on next line
        if (i + 1 < lines.length) {
            const next = lines[i + 1].trim();
            const pm = next.match(/^(\\d{2,5})\\s*[₽руб.р]*$/);
            if (pm && line.length >= 3 && line.length <= 80 && !line.match(/^\\d/)) {
                const price = parseInt(pm[1]);
                if (price >= 30 && price <= 50000 && !seen.has(line.toLowerCase())) {
                    seen.add(line.toLowerCase());
                    results.push({ name: line, price });
                }
            }
        }
    }

    // Strategy 3: Common menu CSS patterns
    const menuSelectors = [
        '.menu-item', '.dish', '.product', '.food-item', '.menu__item',
        '[class*="menu-item"]', '[class*="dish"]', '[class*="product-card"]',
        '[class*="food"]', '[class*="catalog-item"]', '[class*="menuItem"]',
        '.item-card', '.card-product', '.menu-card',
    ];
    for (const sel of menuSelectors) {
        const items = document.querySelectorAll(sel);
        for (const item of items) {
            // Find name (h2, h3, .name, .title, first significant text)
            let name = null;
            for (const ns of ['h2', 'h3', 'h4', '.name', '.title', '[class*="name"]', '[class*="title"]']) {
                const nameEl = item.querySelector(ns);
                if (nameEl) {
                    name = (nameEl.textContent || '').trim();
                    if (name.length >= 3 && name.length <= 120) break;
                    name = null;
                }
            }

            // Find price
            let price = null;
            for (const ps of ['.price', '[class*="price"]', '[class*="cost"]', 'span:last-child']) {
                const priceEl = item.querySelector(ps);
                if (priceEl) {
                    const pt = (priceEl.textContent || '').replace(/[^\\d]/g, '');
                    if (pt) {
                        const p = parseInt(pt);
                        if (p >= 30 && p <= 50000) { price = p; break; }
                    }
                }
            }

            if (name && price && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                results.push({ name, price });
            }
        }
    }

    return results;
}
"""


async def scrape_restaurant(page, url: str, name: str) -> dict:
    result = {
        "url": url, "name": name, "status": "ok",
        "menu_url": None, "dishes_found": 0, "dishes": [], "error": None,
    }

    try:
        resp = await page.goto(url, timeout=15000, wait_until="domcontentloaded")
        if not resp or resp.status >= 400:
            result["status"] = f"http_{resp.status if resp else 'none'}"
            return result

        await page.wait_for_timeout(3000)  # Let JS fully render

        # Find menu link
        menu_link = None
        for selector in [
            'a[href*="/menu"]', 'a[href*="/меню"]',
            'a:has-text("Меню")', 'a:has-text("МЕНЮ")', 'a:has-text("Menu")',
            'a:has-text("меню")', 'a:has-text("Наше меню")',
            'a[href*="catalog"]', 'a[href*="food"]',
            'a[href*="/kitchen"]', 'a[href*="/кухня"]',
        ]:
            try:
                link = await page.query_selector(selector)
                if link:
                    href = await link.get_attribute('href')
                    if href and not href.startswith('#') and 'javascript' not in href:
                        menu_link = href
                        break
            except:
                continue

        # Navigate to menu
        if menu_link:
            if not menu_link.startswith('http'):
                base = url.rstrip('/')
                if menu_link.startswith('/'):
                    # Extract origin
                    from urllib.parse import urlparse
                    parsed = urlparse(url)
                    base = f"{parsed.scheme}://{parsed.netloc}"
                menu_link = base + '/' + menu_link.lstrip('/')
            result["menu_url"] = menu_link
            try:
                await page.goto(menu_link, timeout=15000, wait_until="domcontentloaded")
                await page.wait_for_timeout(3000)
            except:
                pass

        # Extract dishes using DOM-based JS
        dishes = await page.evaluate(EXTRACT_JS)
        result["dishes_found"] = len(dishes)
        result["dishes"] = dishes

        # If nothing found, try direct /menu paths
        if not dishes:
            for path in ['/menu', '/menu/', '/меню', '/kitchen', '/food']:
                try:
                    test_url = url.rstrip('/') + path
                    await page.goto(test_url, timeout=10000, wait_until="domcontentloaded")
                    await page.wait_for_timeout(3000)
                    dishes = await page.evaluate(EXTRACT_JS)
                    if dishes:
                        result["menu_url"] = test_url
                        result["dishes_found"] = len(dishes)
                        result["dishes"] = dishes
                        break
                except:
                    continue

        # Try clicking "Меню" tabs/buttons if still nothing
        if not dishes:
            try:
                await page.goto(url, timeout=15000, wait_until="domcontentloaded")
                await page.wait_for_timeout(2000)
                for btn_sel in ['button:has-text("Меню")', '[role="tab"]:has-text("Меню")', '.tab:has-text("Меню")']:
                    try:
                        btn = await page.query_selector(btn_sel)
                        if btn:
                            await btn.click()
                            await page.wait_for_timeout(2000)
                            dishes = await page.evaluate(EXTRACT_JS)
                            if dishes:
                                result["dishes_found"] = len(dishes)
                                result["dishes"] = dishes
                                break
                    except:
                        continue
            except:
                pass

    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)[:200]

    return result


async def main():
    print("=" * 60)
    print("  MENU SCRAPING v2 (DOM-based extraction)")
    print("=" * 60)

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        restaurants = json.load(f)
    print(f"\nRestaurants: {len(restaurants)}")

    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            locale="ru-RU",
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()

        results = []
        for i, rest in enumerate(restaurants):
            name = rest["name"]
            url = rest["website"]
            our_count = int(rest["dish_count"])

            print(f"\n[{i+1}/{len(restaurants)}] {name} ({our_count} наших)")
            print(f"  {url}")

            result = await scrape_restaurant(page, url, name)
            result["rest_id"] = rest["id"]
            result["our_count"] = our_count

            site_count = result["dishes_found"]

            if site_count > our_count * 2 and site_count > 10:
                verdict = "НАШЕ МЕНЮ НЕПОЛНОЕ"
            elif site_count > 0 and our_count > 0 and abs(site_count - our_count) / max(our_count, 1) < 0.5:
                verdict = "ПРИМЕРНО СОВПАДАЕТ"
            elif site_count == 0:
                verdict = "НЕ НАЙДЕНО"
            elif site_count < our_count * 0.5 and our_count > 5:
                verdict = "У НАС БОЛЬШЕ"
            else:
                verdict = "РАСХОЖДЕНИЕ"

            result["verdict"] = verdict
            results.append(result)

            emoji = {"ПРИМЕРНО СОВПАДАЕТ": "✓", "НАШЕ МЕНЮ НЕПОЛНОЕ": "⚠", "НЕ НАЙДЕНО": "✗", "У НАС БОЛЬШЕ": "◉", "РАСХОЖДЕНИЕ": "△"}
            print(f"  {emoji.get(verdict, '?')} Сайт: {site_count} | Наши: {our_count} | {verdict}")
            for d in result["dishes"][:3]:
                print(f"    {d['name'][:55]} — {d['price']}₽")

        await browser.close()

    # Summary
    print("\n" + "=" * 60)
    print("  ИТОГИ")
    print("=" * 60)
    verdicts = {}
    for r in results:
        verdicts[r["verdict"]] = verdicts.get(r["verdict"], 0) + 1
    for v, cnt in sorted(verdicts.items(), key=lambda x: -x[1]):
        print(f"  {v}: {cnt}")

    total_site = sum(r["dishes_found"] for r in results)
    total_our = sum(r["our_count"] for r in results)
    print(f"\n  Всего на сайтах: {total_site} блюд")
    print(f"  Всего у нас: {total_our} блюд")

    # CSV
    with open(CSV_FILE, 'w', encoding='utf-8-sig') as f:
        f.write("Ресторан;Наших блюд;На сайте;Вердикт;URL меню;Статус;Примеры\n")
        for r in results:
            examples = "; ".join([f"{d['name'][:40]} ({d['price']}₽)" for d in r["dishes"][:5]])
            f.write(f'"{r["name"]}";{r["our_count"]};{r["dishes_found"]};{r["verdict"]};{r.get("menu_url","")};{r["status"]};"{examples}"\n')
    print(f"\nCSV: {CSV_FILE}")

    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"JSON: {JSON_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
