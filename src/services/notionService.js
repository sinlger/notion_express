import { Client } from '@notionhq/client';
import { config } from '../config/env.js';
import { toNotionBlocks } from '../utils/markdown.js';

let notionInstance = null;
function getNotion() {
  if (!notionInstance) {
    if (!config.NOTION_TOKEN) {
      throw new Error('未配置 NOTION_TOKEN');
    }
    notionInstance = new Client({ auth: config.NOTION_TOKEN });
  }
  return notionInstance;
}

// 读取数据库的标题属性名（type=title），避免硬编码 "Name"
const titlePropCache = new Map();
async function getTitlePropertyName(databaseId) {
  const dbId = databaseId || config.NOTION_DATABASE_ID;
  if (!dbId) throw new Error('未提供 Notion 数据库 ID');
  // 若用户通过环境变量显式指定了标题属性名，直接使用
  if (config.NOTION_TITLE_PROP_NAME) return config.NOTION_TITLE_PROP_NAME;
  if (titlePropCache.has(dbId)) return titlePropCache.get(dbId);
  const notion = getNotion();
  try {
    const db = await notion.databases.retrieve({ database_id: dbId });
    const props = db?.properties;
    if (!props || typeof props !== 'object') {
      console.warn('无法读取数据库属性，回退使用默认属性名 "Name"');
      return 'Name';
    }
    const entry = Object.entries(props).find(([, prop]) => prop?.type === 'title');
    if (!entry) {
      console.warn('未找到 type=title 的属性，回退使用默认属性名 "Name"');
      return 'Name';
    }
    const [titlePropName] = entry;
    titlePropCache.set(dbId, titlePropName);
    return titlePropName;
  } catch (err) {
    console.warn('获取数据库属性失败，回退使用默认属性名 "Name"：', err?.message || err);
    return 'Name';
  }
}

export async function createPageFromMarkdown({ title, markdown, databaseId }) {
  const notion = getNotion();
  const dbId = databaseId || config.NOTION_DATABASE_ID;
  if (!dbId) throw new Error('未提供 Notion 数据库 ID');
  const titlePropName = await getTitlePropertyName(dbId);
  console.log('titlePropName', titlePropName);
  const blocks = toNotionBlocks(markdown || '');

  const page = await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      [titlePropName]: {
        title: [{ text: { content: title?.slice(0, 200) || '未命名' } }],
      },
    },
    children: blocks,
  });

  return { id: page.id, url: page.url };
}

// 根据你的数据库字段创建文章页面
// 字段：type、title、summary、status、category、tags、slug、date、password、icon、markdown
export async function createArticle({
  type,
  title,
  summary,
  status,
  category,
  tags,
  slug,
  date,
  password,
  icon,
  markdown,
  databaseId,
}) {
  const notion = getNotion();
  const dbId = databaseId || config.NOTION_DATABASE_ID;
  if (!dbId) throw new Error('未提供 Notion 数据库 ID');

  // 标题列名称按你的数据库约定为 `title`
  const titlePropName = 'title';

  const properties = {};
  if (title) {
    properties[titlePropName] = {
      title: [{ text: { content: title.slice(0, 200) } }],
    };
  }
  if (summary) {
    properties.summary = {
      rich_text: [{ text: { content: summary } }],
    };
  }
  if (status) {
    // 你的数据库字段列表中，status 为普通 select 类型
    properties.status = { select: { name: status } };
  }
  if (type) {
    // type 也作为 select 类型处理
    properties.type = { select: { name: type } };
  }
  if (category) {
    properties.category = { select: { name: category } };
  }
  if (Array.isArray(tags) && tags.length) {
    properties.tags = { multi_select: tags.map((name) => ({ name })) };
  }
  if (slug) {
    properties.slug = { rich_text: [{ text: { content: slug } }] };
  }
  if (date) {
    properties.date = { date: { start: date } };
  }
  if (password) {
    properties.password = { rich_text: [{ text: { content: password } }] };
  }

  const blocks = toNotionBlocks(markdown || '');

  const pagePayload = {
    parent: { database_id: dbId },
    properties,
    children: blocks,
  };

  // 页级图标支持 emoji 或外链 URL
  if (icon) {
    if (/^:[\w-]+:$/.test(icon) || /^(\p{Emoji}|\p{Extended_Pictographic})$/u.test(icon)) {
      pagePayload.icon = { type: 'emoji', emoji: icon.replace(/^:|:$/g, '') };
    } else if (/^https?:\/\//.test(icon)) {
      pagePayload.icon = { type: 'external', external: { url: icon } };
    }
  }

  const page = await notion.pages.create(pagePayload);
  return { id: page.id, url: page.url };
}