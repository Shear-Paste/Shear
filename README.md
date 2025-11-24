# Shear — Markdown 公共剪贴板

一个现代化、跨端共享的公共剪贴板应用。支持 Markdown 渲染、LaTeX 公式显示、主题切换（浅色/深色/跟随系统），并提供一键复制与可配置的后端 API 地址。

## 项目简介

在不同设备之间，用一个简单的链接和内容标识（SHA256）实现文本的快速共享与读取
结构：前后端分离，前端 Next.js + Shad-cn/ui，后端 Node 原生 HTTP 提供存储与查询接口

## 项目功能

- 主题菜单：浅色 / 深色 / 跟随系统
- 创建剪贴
  - 纯文本编辑框（shadcn 风格），随主题自适应
  - 保存后调用后端返回 SHA256 内容标识，支持复制
- 打开剪贴
  - 输入 SHA256 标识查询 Markdown 内容
  - 三种查看模式：纯文本、分屏（左原文右渲染）、完全渲染
  - 渲染端支持 GFM、代码高亮与 LaTeX 公式显示

## 目录结构
```
backend/
  server.js         # 后端 HTTP 服务与存储逻辑
  storage/          # 运行后自动生成，用于保存剪贴内容（<hash>.md）

# 前端请开发者自行探索。
```

## 快速开始
1) 安装与准备
- Node.js

2) 启动后端
```
node backend/server.js
```
- 默认监听 `http://localhost:8080`

3) 启动前端
```
npm run dev
```
- 打开浏览器访问 `http://localhost:3000/`

或 部署: `npm run build`。

4) 配置后端地址（可选）
- 修改 `frontend/config.json` 中的 `API_BASE_URL` 指向你的后端

## 许可

MIT License

## 欢迎 Star ⭐
如果这个项目对你有帮助，欢迎 Star 支持！也欢迎提 Issue 或 PR 一起完善体验与功能。

