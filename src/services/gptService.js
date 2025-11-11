import OpenAI from 'openai';
import TurndownService from 'turndown';
import { config } from '../config/env.js';

const td = new TurndownService({ headingStyle: 'atx' });

let aiClient = null;
let aiModel = null;
// 优先使用 DeepSeek（OpenAI 兼容协议）
if (config.DEEPSEEK_TOKEN) {
  aiClient = new OpenAI({ apiKey: config.DEEPSEEK_TOKEN, baseURL: 'https://api.deepseek.com' });
  aiModel = config.DEEPSEEK_MODEL || 'deepseek-chat';
} else if (config.OPENAI_API_KEY) {
  aiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  aiModel = config.OPENAI_MODEL || 'gpt-4o-mini';
}

/**
 * 使用 GPT 重写/提炼内容为 Markdown。
 * 如果未配置 OpenAI Key，则使用 Turndown 进行基础 HTML->Markdown 转换。
 */
export async function rewriteContent({ html, mode = 'clean' }) {
  const fallbackMarkdown = td.turndown(html || '');
  if (!aiClient) {
    return { markdown: fallbackMarkdown, usedModel: 'turndown-fallback' };
  }

  const systemPrompt =
    '你是一个网页内容清洗与结构化助手。请将输入的网页内容整理为清晰的 Markdown，保留标题、段落、列表与代码块，去除导航、广告、无关链接。若存在表格，使用 Markdown 表格表示。尽可能保留原有层次结构。';

  const userPrompt =
    mode === 'summary'
      ? '请提炼为高质量摘要（含关键要点与引用）。'
      : '请清洗并重写内容，提升可读性与结构化。';

  try {
    const completion = await aiClient.chat.completions.create({
      model: aiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${userPrompt}\n\n=== 原始 HTML ===\n${html}` },
      ],
      temperature: 0.3,
    });

    const markdown = completion.choices?.[0]?.message?.content?.trim() || fallbackMarkdown;
    return { markdown, usedModel: aiModel };
  } catch (err) {
    console.error('AI 调用失败，使用降级转换：', err.message);
    return { markdown: fallbackMarkdown, usedModel: 'turndown-fallback' };
  }
}