import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import router from './routes/index.js';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './docs/openapi.js';
import { errorHandler } from './middlewares/errorHandler.js';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { fetchHtml, extractTitle } from './services/scrapeService.js';
import { rewriteContent } from './services/gptService.js';
import { createArticle } from './services/notionService.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', router);

// API 文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { explorer: true }));

// 测试页面：用于调试 /api/publish 接口
// 计算视图模板路径并加载
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testPublishHtml = readFileSync(path.join(__dirname, 'views', 'testPublish.html'), 'utf8');

app.get('/test/publish', (req, res) => {
  res.type('html').send(testPublishHtml);
});

// 错误处理中间件应放在路由之后
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// 定时任务：每分钟按顺序执行 抓取→清洗→发布（上海时区）
async function runScheduledPublish() {
  // 生成当天（上海时区）日期，格式 YYYYMMDD，用于拼接测试 URL
  const nowShanghai = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const yyyy = nowShanghai.getFullYear();
  const mm = String(nowShanghai.getMonth() + 1).padStart(2, '0');
  const dd = String(nowShanghai.getDate()).padStart(2, '0');
  const yyyymmdd = `${yyyy}${mm}${dd}`;
  const testUrl = process.env.TEST_URL || `https://clashgithub.com/clashnode-${yyyymmdd}.html`;
  try {
    console.log('[CRON] 开始执行测试流水线：', testUrl);
    // 1) 抓取
    const { html, meta } = await fetchHtml(testUrl);
    const title = extractTitle(html) || testUrl;
    console.log(title)
    console.log(html)
    return false
    // 2) AI 清洗为 Markdown
    const { markdown, usedModel } = await rewriteContent({ html, mode: 'clean' });
    
    // 3) 发布到 Notion（使用你的数据库字段风格）

    const slug = 'cron-test-' + new Date().toISOString().replace(/[:.]/g, '-');
    const date = new Date().toISOString().slice(0, 10);
    const page = await createArticle({
      type: 'post',
      title: `[CRON] ${title}`,
      summary: '自动定时任务测试发布',
      status: 'Draft',
      category: 'Cron',
      tags: ['Test', 'Cron'],
      slug,
      date,
      markdown,
      // 若未提供 databaseId，将使用环境变量 NOTION_DATABASE_ID
    });

    console.log('[CRON] 发布成功：', { url: page.url, usedModel, meta });
  } catch (err) {
    console.error('[CRON] 执行失败：', err?.message || err);
  }
}

// cron.schedule('* * * * *', () => {
//   // 不阻塞计划任务调度，异步执行
//   runScheduledPublish();
// }, { timezone: 'Asia/Shanghai' });
runScheduledPublish();
export default app;