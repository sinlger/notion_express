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
export async function rewriteContent({ html }) {
  const fallbackMarkdown = td.turndown(html || '');
  if (!aiClient) {
    return { markdown: fallbackMarkdown, usedModel: 'turndown-fallback' };
  }

  const systemPrompt =
    '我是一个专门分享免费的节点的博客博主，请为上面的免费节点生成一篇文章，主要突出免费。注意只允许出现博客文章，禁止出现其他内容，输出要以Markdown 格式返回,。,';



  try {
    const completion = await aiClient.chat.completions.create({
      model: aiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `免费节点内容：${html}` },
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