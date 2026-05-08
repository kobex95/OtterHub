# OtterHub

<p align="center">
  <img width="100" alt="OtterHub icon" src="public/otterhub-icon.svg">
</p>
<p align="center"><strong>Stash your files like an otter</strong></p>

<p align="center">
  基于 Cloudflare KV + Telegram Bot API 的免费私人云盘
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Cloudflare-Pages%20%2B%20KV%20%2B%20R2-orange?logo=cloudflare" />
  <img src="https://img.shields.io/badge/Storage-Telegram-blue?logo=telegram" />
  <img src="https://img.shields.io/badge/Frontend-Next.js-black?logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" />
</p>

---

## 👋 为什么有 OtterHub？

现有基于 **Cloudflare + Telegram** 的文件存储方案，例如：

- [Telegraph-Image](https://github.com/cf-pages/Telegraph-Image)
- [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed)

它们都很优秀，但要么偏向**图床与轻量分享**，要么为了通用性引入了**较高的复杂度**，并不完全适合**长期自用的私人云盘**。

### OtterHub 的定位

> 像水獭一样，把文件悄悄藏好，需要时再拿出来 🦦

OtterHub 是一个 **为个人使用场景定制** 的私人云盘方案：

- 基于 **Cloudflare Pages + KV**（最终一致性，上传后存在短暂同步延迟）
- 使用 **Telegram Bot** 作为实际文件存储（本地开发使用 R2）
- 通过 **分片上传** 突破 20MB 单文件限制
- 支持 **HTTP Range**，适合视频 / 大文件访问
- 架构克制、状态最小化，优先长期可维护性

它不追求"什么都支持"，而是专注于**刚好够用、稳定、好维护**。

---

## 🚀 快速开始

### 前置要求

| 依赖 | 说明 |
|------|------|
| Node.js 18+ | 运行环境 |
| Cloudflare 账号 | 免费即可，部署需要 |
| Telegram Bot Token | 生产存储需要；本地开发可跳过 |

### 1. 安装并启动

```bash
# 克隆项目
git clone https://github.com/kobex95/OtterHub.git && cd otterhub

# 安装所有 Workspaces 依赖
npm install

# 构建前端（首次运行需要）
npm run build

# 启动开发环境
npm run dev
```

### 2. 访问网站

| 服务 | 地址 |
|------|------|
| 前端 | `http://localhost:3000` |
| 后端 | `http://localhost:8080` |

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env，至少填写 PASSWORD（登录密码）
```

> [!NOTE]
> 开发环境默认采用本地 R2 存储，无需 Telegram 配置即可上传和测试。
> 如需使用 Telegram 存储，额外设置 `TG_CHAT_ID` 和 `TG_BOT_TOKEN`。

### 4. 运行测试

```bash
npm run ci-test
```

---

## 📦 Cloudflare 部署

### 1. Fork 并创建 Pages 项目

在 Cloudflare Dashboard 创建 Pages 项目：
- **构建命令**: `npm install && npm run build`
- **构建输出目录**: `frontend/out`

### 2. 配置环境变量

在 Pages 项目 **Settings → Environment Variables** 中添加：

```env
PASSWORD=your_password          # 必填：登录密码
JWT_SECRET=your_jwt_secret      # 推荐：JWT 签名密钥
TG_CHAT_ID=your_tg_chat_id      # 必填：Telegram Chat ID
TG_BOT_TOKEN=your_tg_bot_token  # 必填：Telegram Bot Token
API_TOKEN=your_api_token        # 可选：API 调用 Token
```

> 💡 `TG_CHAT_ID` 和 `TG_BOT_TOKEN` 获取方式见[常见问题](#-常见问题)

### 3. 绑定 KV Namespace

1. 创建 KV 命名空间 `oh_file_url`
2. 在 Pages 项目 **Settings → Bindings** 中添加 KV 绑定，变量名设为 `oh_file_url`

### 4. （可选）绑定 Workers AI

启用图片自动分析功能：
1. Pages 项目 → **Settings → Functions → AI Bindings**
2. 添加绑定，**变量名填 `AI`**

### 5. 重新部署

回到部署页面重试部署，使配置生效。

---

## ✨ 核心能力

| 功能 | 说明 |
|------|------|
| 📁 私人文件存储 | 支持图片/音频/视频/文档，KV Key 按类型前缀划分 |
| 📦 大文件支持 | 分片上传（≤20MB/片），最大 1GB |
| 🎬 实时预览 | 图片/音频/视频/文本直接在线预览 |
| 🗑️ 回收站 | 30 天自动清理，支持恢复和永久删除 |
| 🔒 安全与私密 | JWT + Cookie 密码登录，NSFW 客户端检测 |
| 🔍 管理与检索 | 搜索/收藏/标签/筛选/排序/批量操作 |
| 🤖 AI 图片分析 | 自动生成图片描述，便于检索 |
| 🌓 日夜模式 | 自动/手动切换 |
| 📱 移动端适配 | 基础移动端响应式 |

---

## 🔧 技术原理

### 文件上传流程

1. **初始化** → `GET /upload/chunk` 创建 KV 记录，返回文件 key
2. **分片上传** → 前端拆分文件（≤20MB/片），逐个 `POST /upload/chunk` 暂存临时 KV
3. **异步上传 Telegram** → 使用 `waitUntil` 将分片上传到 Telegram，获取 `file_id`
4. **合并完成** → 将所有 `file_id` 写入最终 KV，删除临时分片

### 文件下载流程

1. **读取元数据** → 从 KV 获取文件信息和分片 `file_id` 列表
2. **流式拉取** → 从 Telegram API 边拉取边返回客户端
3. **断点续传** → 支持 HTTP Range 请求头

### 数据存储结构

**KV Key + Metadata**（以 30MB 文件为例）：
```json
{
  "name": "video:chunk_7yHZkP0bzyUN5VLE.mp4",
  "metadata": {
    "fileName": "示例视频-1080P.mp4",
    "fileSize": 30202507,
    "uploadedAt": 1768059589484,
    "chunkInfo": { "total": 2, "uploadedIndices": [1, 0] }
  }
}
```

**存储容量**：单文件 < 500 字节，KV 免费版 1GB → **理论可存 ≥ 200 万个文件**

---

## ❓ 常见问题

<details>
<summary>1. 上传完成后文件不完整？</summary>

上传使用 `waitUntil` 异步处理，分片全部上传完成前文件可能暂时不完整。
**稍等片刻并刷新页面**即可。
</details>

<details>
<summary>2. 如何突破 Telegram 20MB 单文件限制？</summary>

通过**分片上传 + 流式合并**：前端拆分文件，每个分片独立上传，下载时按序拉取合并。
当前最大支持 **1GB（50 × 20MB）**。
</details>

<details>
<summary>3. Cloudflare Workers 免费版是否够用？</summary>

个人存储场景通常足够。不建议并发上传多个大文件。
> [官方限制文档](https://developers.cloudflare.com/workers/platform/limits/)
</details>

<details>
<summary>4. 如何获取 Telegram Bot Token 和 Chat ID？</summary>

**Bot Token**：
1. Telegram 搜索 `@BotFather`
2. 发送 `/newbot`，按提示操作
3. 保存返回的 Token

**Chat ID**：
- 搜索 `@userinfobot` 发送任意消息获取
- 或访问：`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`

> 详细流程参考：[Telegraph-Image](https://github.com/cf-pages/Telegraph-Image)
</details>

---

## 📂 项目结构

```
OtterHub/
├── frontend/           # Next.js 前端
│   ├── lib/api/        # Hono RPC Client（类型安全）
│   └── ...
├── functions/          # Cloudflare Pages Functions（Hono 后端）
│   ├── routes/         # 业务路由（file / upload / wallpaper 等）
│   ├── middleware/     # 中间件（Auth / CORS）
│   ├── utils/          # 工具库（db-adapter / proxy 等）
│   ├── app.ts          # Hono App 定义
│   └── [[path]].ts     # Pages Functions 入口
├── shared/             # 前后端共享类型/工具
├── test/               # 端到端测试
├── public/             # 静态资源
├── package.json        # Monorepo 配置
├── wrangler.jsonc      # Wrangler 配置
└── .env.example        # 环境变量模板
```

---

## 🔍 参考资料

- [Cloudflare API](https://developers.cloudflare.com/api)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegraph-Image](https://github.com/cf-pages/Telegraph-Image) - 灵感来源
- [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed) - 分片上传设计参考

---

## 📋 TODO

### 已完成
- [x] JWT + Cookie 密码登录/登出
- [x] 分片上传（≤20MB/片），最大 1GB
- [x] HTTP Range 支持（断点续传）
- [x] 回收站（30 天自动清理）
- [x] 批量操作 / 收藏 / 标签 / 筛选 / 排序
- [x] 临时分享链接（一次性/有效期）
- [x] 图片/视频/文本预览
- [x] NSFW 客户端检测
- [x] AI 图片分析
- [x] 日夜模式 / 移动端适配
- [x] API Token 支持

### 待评估
- [ ] 自建 Telegram Bot API Server，单文件上限提升至 2GB
- [ ] KV vs D1 数据库评估（当前 KV 足够）

---

## 🤝 Contributing

欢迎提交 **Issue** 反馈问题或建议，也欢迎 **Pull Request** 一起完善！
觉得有用的话，点个 ⭐️ 支持一下吧！
