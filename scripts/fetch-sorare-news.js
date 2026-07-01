import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const SPORTS = ['football', 'mlb', 'nba'];

async function scrapeSport(page, sport) {
  await page.goto(`https://sorare.com/blog/${sport}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  return page.evaluate((sport) => {
    function findContainer(el) {
      let node = el;
      for (let i = 0; i < 6; i++) {
        if (!node) break;
        const hasHeading = node.querySelector('h1,h2,h3,h4,h5');
        const hasDate = Array.from(node.querySelectorAll('a')).some(x => /ago$/.test(x.textContent.trim()));
        if (hasHeading && hasDate) return node;
        node = node.parentElement;
      }
      return el.parentElement;
    }

    const seen = new Set();
    const results = [];
    document.querySelectorAll('a[href^="/blog/"]').forEach(a => {
      const href = a.getAttribute('href');
      const parts = href.split('/').filter(Boolean);
      if (parts.length !== 3 || parts[2] === 'category') return;
      if (seen.has(href)) return;
      const img = a.querySelector('img');
      if (!img) return;
      seen.add(href);

      const container = findContainer(a);
      const heading = container?.querySelector('h1,h2,h3,h4,h5');
      const dateLink = Array.from(container?.querySelectorAll('a') || []).find(x => /ago$/.test(x.textContent.trim()));
      // "Football - 7 days ago" のような文字列から日付部分だけを取り出す
      const rawDate = dateLink ? dateLink.textContent.trim() : '';
      const dateOnly = rawDate.includes(' - ') ? rawDate.split(' - ').pop().trim() : rawDate;

      results.push({
        sport,
        url: 'https://sorare.com' + href,
        title: heading ? heading.textContent.trim() : (img.getAttribute('alt') || '').trim(),
        meta: dateOnly
      });
    });
    return results.slice(0, 8);
  }, sport);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const bySport = {};

  for (const sport of SPORTS) {
    try {
      bySport[sport] = await scrapeSport(page, sport);
    } catch (e) {
      console.error(`Failed to scrape ${sport}:`, e.message);
      bySport[sport] = [];
    }
  }

  await browser.close();

  // 3競技を交互に並べて偏りをなくす（Football, MLB, NBA, Football, MLB, NBA...）
  const interleaved = [];
  const maxLen = Math.max(...SPORTS.map(s => bySport[s].length));
  for (let i = 0; i < maxLen; i++) {
    for (const sport of SPORTS) {
      if (bySport[sport][i]) interleaved.push(bySport[sport][i]);
    }
  }

  const seenUrls = new Set();
  const deduped = interleaved
    .filter(a => a.title && !seenUrls.has(a.url) && seenUrls.add(a.url))
    .slice(0, 5);

  mkdirSync('data', { recursive: true });
  writeFileSync(
    'data/sorare-news.json',
    JSON.stringify({ updatedAt: new Date().toISOString(), articles: deduped }, null, 2)
  );
  console.log(`Saved ${deduped.length} articles`);
})();
