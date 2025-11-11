function chunkString(str, size = 1800) {
  const out = [];
  for (let i = 0; i < str.length; i += size) out.push(str.slice(i, i + size));
  return out;
}

export function toNotionBlocks(markdown) {
  const paragraphs = markdown
    .split(/\n\s*\n/) // 按空行分段
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks = [];

  paragraphs.forEach((p) => {
    // 简单识别代码块
    if (p.startsWith('```') && p.endsWith('```')) {
      const code = p.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, '');
      blocks.push({
        type: 'code',
        code: {
          language: 'plain text',
          rich_text: [{ type: 'text', text: { content: code.slice(0, 2000) } }],
        },
      });
      return;
    }

    // 标题（# 开头）
    const headingMatch = p.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const type = `heading_${level}`; // heading_1/2/3
      blocks.push({
        type,
        [type]: {
          rich_text: [{ type: 'text', text: { content: text.slice(0, 2000) } }],
        },
      });
      return;
    }

    // 普通段落，按 Notion 文本长度限制分块
    const chunks = chunkString(p, 1800);
    chunks.forEach((c) => {
      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: c } }],
        },
      });
    });
  });

  return blocks;
}