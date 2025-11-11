import dotenv from 'dotenv';
// 在读取 process.env 之前加载 .env，避免取到空值
dotenv.config();

export const config = {
  PORT: process.env.PORT || '3000',
  // OpenAI（兼容保留）
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  // DeepSeek 配置（优先使用）
  DEEPSEEK_TOKEN: process.env.DEEPSEEK_TOKEN || '',
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  NOTION_TOKEN: process.env.NOTION_TOKEN || '',
  NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID || '',
  // 可选：自定义数据库标题属性名（如“标题”、“名称”等），默认自动探测
  NOTION_TITLE_PROP_NAME: process.env.NOTION_TITLE_PROP_NAME || '',
};