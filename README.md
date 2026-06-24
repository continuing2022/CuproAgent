# CuproAgent

CuproAgent 是面向铜及铜合金知识问答场景的 AI 对话前端。项目基于 Vue 3 + Vite 构建，配套 CuproExpress 后端使用，支持登录注册、会话历史、流式输出、多模型切换、本地知识库 RAG、可选联网搜索和管理员用户管理。

## 功能概览

- 登录、注册、忘记密码和会话恢复。
- Access token 自动注入，401 时自动刷新 refresh token。
- ChatGPT 风格对话界面，支持 Markdown 渲染和安全净化。
- SSE 流式输出，支持中断当前回答。
- 会话列表、历史消息分页加载、重命名和删除。
- 模型切换：Qwen、Kimi、DeepSeek 等。
- 本地/联网开关：默认使用私有知识库，可开启联网搜索。
- 中英文文案切换基础。
- 管理员页面：用户查询、筛选、分页、新增、编辑、删除、批量删除和导出。

## 技术栈

- Vue 3
- Vite 7
- Vue Router
- Element Plus
- Axios
- Markdown-it + DOMPurify
- Lucide Vue Next
- Sass

## 目录结构

```text
CuproAI/
├─ src/
│  ├─ api/                 # Axios 实例、鉴权刷新、SSE 对话请求
│  ├─ components/          # 侧边栏、用户详情弹窗、图标封装
│  ├─ i18n/                # 简易国际化入口
│  ├─ locales/             # zh / en 文案
│  ├─ router/              # 路由和权限守卫
│  ├─ styles/              # 全局样式与变量
│  ├─ utils/               # 鉴权存储、聊天数据、提示消息等工具
│  └─ views/               # Login、Home、Usermanagement
├─ public/
├─ vite.config.js
└─ package.json
```

## 环境要求

- Node.js `^20.19.0 || >=22.12.0`
- npm
- 已启动的 CuproExpress 后端服务

## 快速开始

安装依赖：

```bash
npm install
```

创建 `.env.local`：

```env
VITE_API_BASE_URL=http://localhost:3000
```

启动开发服务器：

```bash
npm run dev
```

默认访问地址通常为 `http://localhost:5173`。

生产构建：

```bash
npm run build
```

本地预览构建产物：

```bash
npm run preview
```

## 后端接口约定

前端默认会请求 `VITE_API_BASE_URL`。如果没有配置该变量，会自动使用当前页面主机名拼出 `http://当前主机:3000`。

主要依赖的后端接口：

| 模块 | 接口 |
| --- | --- |
| 认证 | `/auth/login`、`/auth/register`、`/auth/refresh`、`/auth/logout`、`/auth/forgot-password`、`/auth/me` |
| 用户管理 | `/auth/users`、`/auth/users/stats`、`/auth/users/:id`、`/auth/users/bulk-delete`、`/auth/users/export` |
| 会话 | `/conversations`、`/conversations/:id/messages`、`/conversations/:id` |

`POST /conversations` 使用 `fetch` 直接读取 `text/event-stream`，前端会处理以下事件：

- `started`：后端已创建或确认会话。
- `retrieved`：RAG 或联网搜索检索完成。
- `chunk`：AI 增量文本。
- `done`：回答结束并返回消息 ID。
- `error`：流式请求失败。

## 本地开发建议

先启动后端：

```bash
cd ../CuproExpress
npm run dev
```

再启动前端：

```bash
cd ../CuproAI
npm run dev
```

前端需要后端允许跨域。后端 `.env` 中建议配置：

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## 权限说明

- 未登录用户访问任意页面会被路由守卫重定向到 `/login`。
- 已登录用户访问 `/login` 会自动回到首页。
- `/usermanagement` 需要管理员角色，普通用户会被重定向到首页。
- Access token 保存在前端会话存储中，refresh token 由后端写入 HttpOnly cookie。

## 可配置项

| 变量 | 默认行为 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://当前主机:3000` | 后端 API 地址 |

## 页面说明

- `/login`：登录、注册、忘记密码三种表单模式。
- `/`：主对话页，包含会话侧栏、模型选择、本地/联网开关、消息流式输出。
- `/usermanagement`：管理员用户管理页。

## 相关项目

- CuproExpress：后端 API、AI 编排、数据库和 RAG 服务。
