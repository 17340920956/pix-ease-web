# PixEase Web

在线图片处理工具，所有处理均在浏览器本地完成，保护隐私安全。

## 功能

- **GIF 编辑器** — 拆帧、合并、压缩、倒放，轻松编辑动态图片
- **格式转换** — JPG、PNG、WEBP、AVIF 等主流格式互转
- **图片压缩** — 智能压缩算法，保持画质同时减小体积
- **像素风格** — 一键转换像素风、GameBoy 复古风格
- **ASCII 艺术** — 将图片转换为字符画
- **像素工坊** — 像素画编辑器，支持图层与动画
- **用户系统** — 注册、登录、找回密码
- **主题切换** — 支持浅色/深色模式

## 技术栈

- [Next.js](https://nextjs.org) (App Router)
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Framer Motion](https://www.framer.com/motion/) — 动画
- [Zustand](https://zustand.docs.pmnd.rs/) — 状态管理
- [Tailwind CSS](https://tailwindcss.com) — 样式
- [Lucide React](https://lucide.dev) — 图标
- [gifuct-js](https://github.com/matt-way/gifuct-js) — GIF 解析

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看。

## 构建部署

```bash
# 构建生产版本
npm run build

# Docker 部署
docker build -t pix-ease-web .
docker run -p 3000:3000 pix-ease-web
```

## 项目结构

```
src/
├── app/            # Next.js App Router 页面
│   ├── login/      # 登录注册页
│   ├── gif-editor/ # GIF 编辑器
│   ├── image-tool/ # 图片工具
│   └── pixel-studio/ # 像素工坊
├── api/            # API 请求层
├── components/     # 公共组件
├── mock/           # Mock 数据
├── store/          # Zustand 状态管理
└── utils/          # 工具函数
```