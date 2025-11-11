import { CheerioCrawler } from 'crawlee';

// 站点抓取规则：可按域名覆盖默认行为
// 每个规则可定义：
// - js: 是否使用浏览器（Playwright）进行动态渲染
// - removeSelectors: 在静态抓取时移除的元素选择器数组
// - waitUntil: 浏览器导航的等待策略（'domcontentloaded'/'networkidle'等）
// - waitForSelector: 浏览器模式下等待某个选择器出现
// - scroll: 是否尝试滚动以触发懒加载（浏览器模式）
const siteRules = {
  default: {
    js: false,
    removeSelectors: [],
    waitUntil: 'domcontentloaded',
    waitForSelector: null,
    scroll: false,
  },
  'clashgithub.com': {
    js: false,
    removeSelectors: ['script', 'noscript'],
  },
};

export function registerSiteRule(domain, rule) {
  siteRules[domain] = { ...siteRules.default, ...rule };
}

function getHostname(url) {
  try { return new URL(url).hostname; } catch { return 'default'; }
}

function getRuleForUrl(url) {
  const host = getHostname(url);
  return siteRules[host] || siteRules.default;
}

export async function fetchHtml(url, opts = {}) {
  const rule = { ...getRuleForUrl(url), ...opts };

  // 优先使用浏览器渲染（可选依赖：playwright）。若不可用则回退到 Cheerio。
  if (rule.js) {
    try {
      const { PlaywrightCrawler } = await import('crawlee');
      let output;
      const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: 1,
        requestHandler: async ({ page, request }) => {
          await page.goto(request.url, { waitUntil: rule.waitUntil || 'domcontentloaded' });
          if (rule.waitForSelector) {
            await page.waitForSelector(rule.waitForSelector, { timeout: 15000 }).catch(() => {});
          }
          if (rule.scroll) {
            await page.evaluate(async () => {
              await new Promise((resolve) => {
                let total = 0;
                const distance = 800;
                const timer = setInterval(() => {
                  window.scrollBy(0, distance);
                  total += distance;
                  if (total >= (document.body.scrollHeight || 0)) {
                    clearInterval(timer);
                    resolve();
                  }
                }, 250);
              });
            });
          }
          const html = await page.content();
          output = {
            html,
            meta: { status: 200, contentType: 'text/html', finalUrl: page.url() },
          };
        },
      });
      await crawler.run([url]);
      if (output) return output;
    } catch (e) {
      console.warn('[crawl] 浏览器模式不可用，回退到静态抓取：', e?.message || e);
      // 继续静态抓取
    }
  }

  // 静态抓取：基于 CheerioCrawler
  let output;
  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: 1,
    requestHandler: async ({ request, response, body, $ }) => {
      try {
        if (Array.isArray(rule.removeSelectors) && $) {
          rule.removeSelectors.forEach((sel) => $(sel).remove());
        }
      } catch {}
      output = {
        html: body?.toString?.() ?? '',
        meta: {
          status: response?.statusCode,
          contentType: response?.headers?.['content-type'] ?? '',
          finalUrl: request.loadedUrl || request.url,
        },
      };
    },
  });
  await crawler.run([url]);
  return output;
}

export function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '未命名页面';
}