# CuproAgent

后续优化与验收依据见 [CuproAgent 优化计划](../docs/optimization-plan.md)，包含认证安全、会话与流式状态、前端性能及 RAG 优化的优先级和进度。

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

## 密码找回

密码找回分为申请邮件和通过邮件链接设置新密码两个步骤。后端的邮件配置见 [密码重置配置示例](../CuproExpress/password-reset.env.example)。开发环境需显式启用模拟邮件并从后端 `.local-mail/` 打开链接；生产通过 SMTP 投递。前端从链接 fragment 读取一次性 Token 后立即清除 URL 中的凭据，成功重置后返回登录表单。

密码找回浏览器回归：`node tests/browser-password-reset.mjs`（需 Playwright 和本机 Chrome；可按下文设置 `PLAYWRIGHT_MODULE` 和 `TEST_BROWSER_CHANNEL`），脚本自动启动临时 Vite，认证接口使用模拟响应，覆盖邮件申请、链接落地、密码确认、成功和无效链接。

## 认证刷新

普通 Axios 请求、SSE 的首次 401 和会话恢复统一使用 `syncSessionAfterRefresh()`，同一页面共享一个刷新 Promise。迟到的 401 会复用已更新的 Access Token；业务请求最多重试一次，登录等公开认证请求不触发自动刷新。登出或切换会话后，已发出的刷新不能恢复旧会话。

支持 Web Locks 的浏览器会按 API 地址在同源标签页之间串行执行登录、退出和刷新；页面内另有队列。没有 Web Locks 时，对后端 `409 / refresh_conflict` 最多额外重试两次，使用最新 HttpOnly Cookie，不在 localStorage、sessionStorage 或 BroadcastChannel 传输 Token。长时间延迟的无锁跨页竞争仍可能需要重新登录。

只有确认刷新认证失败才清空会话；503 等暂时错误保留当前状态。停止 SSE 后，即使共享刷新完成，也不会重新发送该流式请求。

双标签页浏览器验证：`node tests/browser-auth-refresh.mjs`（与密码找回脚本使用相同的 Playwright / Chrome 配置）。脚本启动临时 Vite 和两个同源标签页，使用模拟接口验证真实 Web Locks、HttpOnly Cookie 轮换以及 Axios/SSE/恢复共用刷新。

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
│  ├─ api/                 # http、auth、users、conversations、stream；index 保留统一出口
│  ├─ components/          # 公共组件，以及 chat/、users/ 功能组件
│  ├─ composables/         # 登录表单、聊天流程/消息/滚动、用户管理、视口状态
│  ├─ i18n/                # 简易国际化入口
│  ├─ locales/             # zh / en 文案
│  ├─ router/              # 路由和权限守卫
│  ├─ styles/              # element-plus.scss 集中管理组件库覆盖；其余为公共变量
│  ├─ utils/               # 鉴权存储、聊天数据、提示消息等工具
│  └─ views/               # Login、Home、Usermanagement
├─ public/
├─ vite.config.js
└─ package.json
```

页面负责组合界面，功能组件负责各自的交互与布局，composable 管理状态和业务流程，API 模块处理通信和响应格式。普通布局样式留在组件；Element Plus 的内部类、主题变量及覆盖统一放在 `src/styles/element-plus.scss`，并通过页面或组件类名限制作用范围。

消息响应在 API 入口归一化，内部消息的 `content` 始终为字符串。旧数组响应和旧 SSE 事件格式仍在入口兼容。保留权限、表单校验、刷新重试、防重复提交和异步会话定位等必要判断。

## 重构验证

```bash
npm test
npm run build
```

`npm test` 覆盖响应格式兼容、分页数据、并发 401 刷新、SSE 分片与中断。浏览器回归脚本为 `tests/browser-regression.mjs`，使用模拟接口验证登录、聊天及桌面/移动端用户管理，不写入真实后端。

浏览器回归需要测试环境提供 Playwright 和浏览器。启动前端后运行 `npm run test:browser`；可用 `TEST_BASE_URL` 指定地址（默认 `http://127.0.0.1:5175`），用 `PLAYWRIGHT_MODULE` 指定现有 Playwright 模块，用 `TEST_BROWSER_CHANNEL=chrome` 使用本机 Chrome。截图与布局数据输出至已忽略的 `.test-output/`。

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
| 认证 | `/auth/login`、`/auth/register`、`/auth/refresh`、`/auth/logout`、`/auth/forgot-password`、`/auth/reset-password`、`/auth/me` |
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
- Access Token 仅保存在页面内存中，Refresh Token 由后端写入 HttpOnly Cookie。

## 可配置项

| 变量 | 默认行为 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://当前主机:3000` | 后端 API 地址 |

## 页面说明

- `/login`：登录、注册、申请密码找回，以及邮件链接进入的新密码表单。
- `/`：主对话页，包含会话侧栏、模型选择、本地/联网开关、消息流式输出。
- `/usermanagement`：管理员用户管理页。

## 相关项目

- CuproExpress：后端 API、AI 编排、数据库和 RAG 服务。
