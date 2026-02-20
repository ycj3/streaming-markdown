# quickstart-harmony

HarmonyOS 快速示例应用，用于演示 `@ycj3/streaming-markdown` 的流式渲染与 Gemini SSE 接入。

> [English Version](./README_EN.md)

## 目录说明

- `entry/`：HarmonyOS 前端页面
- `backend/`：Gemini SSE relay 服务
- `PRODUCTION_CHECKLIST.md`：生产接入清单

## 快速启动

### 1) 启动后端

```bash
cd backend
npm install
export GEMINI_API_KEY="你的 Gemini API Key"
npm run dev
```

### 2) 配置前端请求地址

在 `entry/src/main/ets/pages/Index.ets` 中确认 `endpoint` 为你可访问的后端地址（真机不要用 `127.0.0.1`）。

### 3) 运行应用

在 DevEco Studio 打开 `apps/quickstart-harmony` 并运行。

## 调试

后端详细日志：

```bash
export DEBUG_QUICKSTART=1
npm run dev
```

## 相关文档

- 后端说明：`backend/README.md`
- 生产接入清单：`PRODUCTION_CHECKLIST.md`
