# 音乐人 WikiGame（网易云风格）

从一位音乐人，只通过**合作歌曲**作为通道，走到另一位音乐人。
界面 1:1 还原网易云音乐歌手页，玩法是 WikiGame 式的图寻路。

> 核心规则：一首歌的 `ar`（艺人数组）里有 ≥2 位艺人，就把这些艺人连成一条边。
> 例：`Dyrox ──《frozen heart.》──> 8bite`。

## 玩法
- **每日挑战** —— 每天同一对起点/终点（BFS 生成，保证有解，可分享成绩）
- **随机挑战** —— 随机抽一对相连歌手，难度 2–5 步
- **自由模式** —— 自己搜起点/终点，挑战能不能连起来

在歌手页里，合作曲会高亮成 `🔗 可通行`，合作者是红色可点的 chip；点合作者就走到下一位歌手。
工具：`提示`（下一步走谁）、`看路线`（最短已知路径）、面包屑可回退、`重开`/`退出`。

## 架构
```
web (React + Vite + TS + Tailwind, :5173)
  └─ /api 代理 → server (Express + TS, :4000)
                   ├─ LRU+TTL 缓存 & 请求去重
                   ├─ 归一化 artist → { info, songs, neighbors(合作者) }
                   └─ BFS 寻路 / 每日·随机出题
                        └─ 数据源：hosted api-enhanced（NeteaseCloudMusicApiEnhanced）
```

数据源是托管的 **api-enhanced** 实例（不是官方开放平台 API）。
基址在 `server/src/config.ts` 的 `NCM_BASE`，可用环境变量 `NCM_BASE` 覆盖。

## 运行
需要 Node 18+ 与 pnpm。

```bash
pnpm -C server install
pnpm -C web install

# 一条命令同时起前后端
pnpm dev          # server:4000 + web:5173

# 或分开起
pnpm -C server dev   # 后端（watch 自动重载）
pnpm -C web dev      # 前端
```

打开 http://localhost:5173 。

> 后端启动时会**预热当天的每日挑战**（一次 BFS，约 10–15s，之后命中缓存即时返回）。

## 主要接口（server）
| 路由 | 说明 |
|---|---|
| `GET /api/search?q=` | 搜索歌手 |
| `GET /api/artist/:id` | 归一化歌手页（含 songs 与 neighbors） |
| `GET /api/path?from=&to=&maxDepth=` | 最短已知路径（提示/看路线） |
| `GET /api/challenge/daily` | 今日挑战（按日期确定性生成 + 缓存） |
| `GET /api/challenge/random` | 随机挑战 |

## 现状 & 待办
已完成：后端代理/缓存/归一化、合作图、BFS 寻路、每日/随机出题、网易云风格歌手页、
自由/每日/随机三种玩法、提示/看路线/面包屑回退、通关结算 + 分享文案。

待打磨（P5）：歌曲试听（`/song/url/v1`，自带解灰）、`专辑/MV/相似歌手` tab（`相似歌手`
需要登录）、移动端适配、每日成绩持久化与排行榜、把合作判定扩展到标题里的 `feat.`。
