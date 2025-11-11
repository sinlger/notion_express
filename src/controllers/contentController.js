import { fetchHtml, extractTitle } from '../services/scrapeService.js';
import { rewriteContent } from '../services/gptService.js';
import { createPageFromMarkdown, createArticle } from '../services/notionService.js';

export async function ingest(req, res, next) {
  try {
    const { url, html } = req.body || {};
    let contentHtml = html;
    let title = '未命名页面';

    if (url) {
      const { html: fetched, meta } = await fetchHtml(url);
      contentHtml = fetched;
      title = extractTitle(fetched) || url;
      return res.json({ html: contentHtml, title, meta });
    }

    if (!contentHtml) return res.status(400).json({ error: '缺少 url 或 html' });

    title = extractTitle(contentHtml);
    res.json({ html: contentHtml, title });
  } catch (err) {
    next(err);
  }
}

export async function processContent(req, res, next) {
  try {
    const { html, mode } = req.body || {};
    if (!html) return res.status(400).json({ error: '缺少 html' });
    const { markdown, usedModel } = await rewriteContent({ html, mode });
    res.json({ markdown, usedModel });
  } catch (err) {
    next(err);
  }
}

export async function publish(req, res, next) {
  try {
    const {
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
    } = req.body || {};
    if (!markdown) return res.status(400).json({ error: '缺少 markdown' });
    const page = await createArticle({
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
    });
    res.json({ page });
  } catch (err) {
    next(err);
  }
}

export async function publishFromUrl(req, res, next) {
  try {
    const {
      url,
      mode = 'clean',
      title: providedTitle,
      databaseId,
      type,
      summary,
      status,
      category,
      tags,
      slug,
      date,
      password,
      icon,
    } = req.body || {};
    if (!url) return res.status(400).json({ error: '缺少 url' });

    const { html, meta } = await fetchHtml(url);
    const title = providedTitle || extractTitle(html) || url;
    const { markdown, usedModel } = await rewriteContent({ html, mode });
    const page = await createArticle({
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
    });
    res.json({ page, usedModel, meta });
  } catch (err) {
    next(err);
  }
}