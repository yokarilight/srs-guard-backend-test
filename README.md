# SRS Guard 後端

專案需求開發工廠的 NestJS 後端，規格見 `docs/spec.md`。

## 環境需求

- Node.js 20 以上（建議 24）、pnpm
- MongoDB：本機可用 `docker compose up -d` 啟動

## 設定與啟動

```bash
pnpm install
cp .env.example .env   # 已有 .env 時，只需補上 MONGODB_URI 等欄位
docker compose up -d

# 建立第一位管理者（只需執行一次）
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=change-me-now ADMIN_NAME=管理者 pnpm run create-admin

pnpm run start:dev
```

所有 API 都在 `/api` 底下，除了 `POST /api/auth/login` 之外都需要登入（httpOnly cookie `sid`）。

## 測試

```bash
pnpm test       # 單元測試
pnpm test:e2e   # e2e 測試，使用 mongodb-memory-server，不需要啟動 MongoDB
```

## 目前進度

| 模組 | API |
| --- | --- |
| F1 主題管理 | `GET/POST /api/topics`（`?scope=all\|mine`）、`GET/PATCH/DELETE /api/topics/:topicId` |
| F8 驗證（最小版） | `POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/auth/me`、初始化管理者腳本 |
