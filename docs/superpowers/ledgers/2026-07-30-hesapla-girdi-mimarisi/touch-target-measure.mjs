import { chromium } from 'playwright';

const URL = process.env.TARGET_URL || 'http://localhost:3000/hesapla';
const SCROLLS = (process.env.SCROLLS || '0,40,100,263').split(',').map(Number);

const browser = await chromium.launch();
const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const geometry = await page.evaluate(() => {
    const q = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height, cls: el.className };
    };
    const se = document.scrollingElement;
    const cs = (sel) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).paddingBottom : null;
    };
    return {
        viewport: { w: innerWidth, h: innerHeight },
        scrollHeight: se.scrollHeight,
        maxScroll: se.scrollHeight - innerHeight,
        mainPaddingBottom: cs('main'),
        screenPaddingBottom: cs('[data-cta]'),
        bottomNav: q('nav[class*="bottomNav"], [class*="bottomNav"]'),
        stickyBar: q('[class*="StickyActionBar_bar"], [class*="bar__"]'),
    };
});

const results = [];
for (const y of SCROLLS) {
    await page.evaluate((yy) => { document.scrollingElement.scrollTop = yy; }, y);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
        const sel = 'button, input, select, textarea, a[href], [role="button"], [role="switch"], [tabindex]:not([tabindex="-1"])';
        const out = [];
        for (const el of document.querySelectorAll(sel)) {
            const rect = el.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) continue;
            if (rect.bottom <= 0 || rect.top >= innerHeight) continue;
            const cx = Math.min(Math.max(rect.left + rect.width / 2, 1), innerWidth - 1);
            const cy = Math.min(Math.max(rect.top + rect.height / 2, 1), innerHeight - 1);
            const hit = document.elementFromPoint(cx, cy);
            const self = hit === el || el.contains(hit) || (hit && hit.contains(el));
            const name = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 45);
            let hitDesc = 'null';
            if (hit) {
                const owner = hit.closest('[class*="bottomNav"],[class*="bar"],[class*="Sticky"]');
                hitDesc = `${hit.tagName}.${String(hit.className).slice(0, 40)}` + (owner ? ` | owner=${String(owner.className).slice(0, 40)}` : '');
            }
            out.push({
                name,
                tag: el.tagName,
                rect: { top: Math.round(rect.top), bottom: Math.round(rect.bottom) },
                matchesSelf: self,
                hit: self ? '' : hitDesc,
                isPortal: hit ? hit.tagName === 'NEXTJS-PORTAL' : false,
            });
        }
        return { scrollTop: document.scrollingElement.scrollTop, items: out };
    });
    results.push({ requested: y, ...r });
}

console.log(JSON.stringify({ geometry, results }, null, 2));
await browser.close();
