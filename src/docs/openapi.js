export const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Notion Express API',
    version: '1.0.0',
    description:
      '用于抓取网页、用 DeepSeek/OpenAI 清洗为 Markdown，并发布到 Notion 的服务。',
  },
  servers: [
    {
      url: 'http://localhost:{port}',
      variables: {
        port: { default: '3000' },
      },
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: '健康检查',
        responses: {
          200: {
            description: '服务健康状态',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/ingest': {
      post: {
        summary: '接收或抓取 HTML',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: { type: 'string', format: 'uri' },
                  html: { type: 'string' },
                },
                anyOf: [
                  { required: ['url'] },
                  { required: ['html'] },
                ],
              },
            },
          },
        },
        responses: {
          200: {
            description: '返回抓取或传入的 HTML 与标题',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    html: { type: 'string' },
                    title: { type: 'string' },
                    meta: {
                      type: 'object',
                      properties: {
                        status: { type: 'integer' },
                        contentType: { type: 'string' },
                        finalUrl: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: '缺少 url 或 html' },
        },
      },
    },
    '/api/process': {
      post: {
        summary: '用 AI 清洗/提炼为 Markdown',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  html: { type: 'string' },
                  mode: {
                    type: 'string',
                    enum: ['clean', 'summary'],
                    default: 'clean',
                  },
                },
                required: ['html'],
              },
            },
          },
        },
        responses: {
          200: {
            description: '返回 Markdown 与所用模型',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    markdown: { type: 'string' },
                    usedModel: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: '缺少 html' },
        },
      },
    },
    '/api/publish': {
      post: {
        summary: '将 Markdown 发布到 Notion 数据库',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  markdown: { type: 'string' },
                  databaseId: { type: 'string' },
                },
                required: ['markdown'],
              },
            },
          },
        },
        responses: {
          200: {
            description: '创建的 Notion 页面信息',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    page: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        url: { type: 'string', format: 'uri' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: '缺少 markdown' },
        },
      },
    },
    '/api/pipeline/publish-from-url': {
      post: {
        summary: '一体化：抓取 -> AI 处理 -> 发布到 Notion',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: { type: 'string', format: 'uri' },
                  mode: { type: 'string', enum: ['clean', 'summary'], default: 'clean' },
                  title: { type: 'string' },
                  databaseId: { type: 'string' },
                },
                required: ['url'],
              },
            },
          },
        },
        responses: {
          200: {
            description: '发布结果与处理信息',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    page: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        url: { type: 'string', format: 'uri' },
                      },
                    },
                    usedModel: { type: 'string' },
                    meta: {
                      type: 'object',
                      properties: {
                        status: { type: 'integer' },
                        contentType: { type: 'string' },
                        finalUrl: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: '缺少 url' },
        },
      },
    },
  },
};