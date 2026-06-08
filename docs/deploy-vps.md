# VPS 部署

这套部署把前端静态文件和后端 API 打进同一个 Docker 镜像。容器内只监听 `4000`，Express 同时服务 `/api/*` 和 Vite 构建后的前端页面。

## VPS 准备

在 VPS 上安装 Docker 和 Docker Compose plugin，然后创建部署目录：

```bash
sudo mkdir -p /opt/music-wiki-game
sudo chown "$USER":"$USER" /opt/music-wiki-game
```

如果先不用域名，可以直接让容器监听公网：

```bash
cd /opt/music-wiki-game
cp .env.example .env
# 如果要直接用 http://VPS_IP:4000 访问，把 .env 改成 APP_BIND=0.0.0.0
docker compose up -d
```

访问 `http://你的VPS_IP:4000`。

## 部署到 dyrox.cat/musicwiki

当前 Dockerfile 默认用 `VITE_BASE_PATH=/musicwiki/` 构建前端，所以生产资源和 API 都会走 `/musicwiki/...`。

VPS 的 `/opt/music-wiki-game/.env` 建议保持：

```env
APP_BIND=127.0.0.1
APP_PORT=4000
```

然后把 `deploy/nginx-musicwiki.conf` 里的两个 `location` 放进现有的 `dyrox.cat` HTTPS server block：

```nginx
location = /musicwiki {
    return 301 /musicwiki/;
}

location ^~ /musicwiki/ {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_pass http://127.0.0.1:4000/;
}
```

注意 `proxy_pass` 末尾的 `/` 必须保留，它负责把 `/musicwiki/api/health` 转成容器内的 `/api/health`。

改完测试并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://dyrox.cat/musicwiki/
curl https://dyrox.cat/musicwiki/api/health
```

Caddy 根域名反代可参考 `deploy/Caddyfile.example`，但 `dyrox.cat/musicwiki` 这个场景用上面的 nginx location 更合适。

## GitHub Actions 自动部署

仓库已经包含 `.github/workflows/deploy.yml`。它会在 push 到 `main` 时：

1. 构建 Docker 镜像
2. 推送到 GHCR：`ghcr.io/<owner>/<repo>:<sha>`
3. SSH 到 VPS
4. 上传 `deploy/compose.yml` 和 `deploy/.env.example`
5. `docker compose pull && docker compose up -d`

需要在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 配置：

| Secret | 说明 |
|---|---|
| `VPS_HOST` | VPS IP 或域名 |
| `VPS_USER` | SSH 用户 |
| `VPS_SSH_KEY` | 私钥内容，建议专门生成 deploy key |
| `VPS_PORT` | 可选，默认 `22` |
| `DEPLOY_PATH` | 可选，默认 `/opt/music-wiki-game` |

第一次部署后，如果需要改运行参数，直接在 VPS 的 `/opt/music-wiki-game/.env` 里改。CI 不会覆盖已有 `.env`。

## 手动部署

本地或 CI 构建并推送镜像后，在 VPS 上执行：

```bash
cd /opt/music-wiki-game
IMAGE=ghcr.io/OWNER/REPO:latest docker compose pull app
IMAGE=ghcr.io/OWNER/REPO:latest docker compose up -d --remove-orphans
```

查看状态：

```bash
docker compose ps
docker compose logs -f app
curl http://127.0.0.1:4000/api/health
```
