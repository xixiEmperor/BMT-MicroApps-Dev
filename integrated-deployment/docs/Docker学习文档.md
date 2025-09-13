# Docker学习文档 - 从入门到实战

## 📚 目录

1. [Docker简介](#docker简介)
2. [核心概念](#核心概念)
3. [安装和配置](#安装和配置)
4. [基础命令](#基础命令)
5. [镜像管理](#镜像管理)
6. [容器管理](#容器管理)
7. [Dockerfile编写](#dockerfile编写)
8. [数据管理](#数据管理)
9. [网络配置](#网络配置)
10. [Docker Compose](#docker-compose)
11. [最佳实践](#最佳实践)
12. [故障排查](#故障排查)
13. [实战案例](#实战案例)

---

## 1. Docker简介

### 1.1 什么是Docker？

Docker是一个开源的容器化平台，它允许开发者将应用程序及其依赖项打包到一个轻量级、可移植的容器中。

**核心优势：**
- 📦 **一致性**：确保应用在任何环境中都能一致运行
- ⚡ **轻量级**：比虚拟机更少的资源消耗
- 🚀 **快速部署**：秒级启动时间
- 🔄 **可移植性**：一次构建，到处运行
- 📈 **可扩展性**：易于水平扩展
- 🛡️ **隔离性**：应用间相互隔离

### 1.2 Docker vs 虚拟机

| 特性 | Docker容器 | 虚拟机 |
|------|------------|--------|
| 启动时间 | 秒级 | 分钟级 |
| 资源消耗 | 低 | 高 |
| 隔离级别 | 进程级 | 硬件级 |
| 镜像大小 | MB级 | GB级 |
| 性能 | 接近原生 | 有性能损耗 |
| 可移植性 | 优秀 | 一般 |

### 1.3 应用场景

- 🏗️ **应用部署**：简化部署流程
- 🔄 **CI/CD**：持续集成和部署
- 🧪 **开发环境**：统一开发环境
- 📊 **微服务**：微服务架构支持
- ☁️ **云迁移**：应用云化
- 🧪 **测试环境**：快速创建测试环境

---

## 2. 核心概念

### 2.1 Docker架构

```
┌─────────────────┐    ┌─────────────────┐
│   Docker Client │    │  Docker Daemon  │
│                 │    │                 │
│ docker build    │◄──►│  镜像管理       │
│ docker run      │    │  容器管理       │
│ docker pull     │    │  网络管理       │
└─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Docker Registry │
                    │                 │
                    │  Docker Hub     │
                    │  私有仓库       │
                    └─────────────────┘
```

### 2.2 核心组件

#### 2.2.1 Docker Engine
- **Docker Daemon (dockerd)**：后台服务进程
- **Docker Client**：命令行工具
- **REST API**：程序接口

#### 2.2.2 Docker对象
- **镜像 (Image)**：只读模板
- **容器 (Container)**：镜像的运行实例
- **网络 (Network)**：容器间通信
- **数据卷 (Volume)**：数据持久化

### 2.3 镜像和容器

#### 2.3.1 镜像层次结构
```
应用层     │ 您的应用代码
├─────────┤
依赖层     │ Node.js, Python等
├─────────┤
系统层     │ Ubuntu, Alpine等
└─────────┘
```

#### 2.3.2 容器生命周期
```
创建 → 启动 → 运行 → 暂停/恢复 → 停止 → 删除
```

---

## 3. 安装和配置

### 3.1 Windows安装

#### 3.1.1 Docker Desktop安装
```powershell
# 1. 下载Docker Desktop
# https://www.docker.com/products/docker-desktop

# 2. 启用WSL2（推荐）
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 3. 重启系统
Restart-Computer

# 4. 设置WSL2为默认版本
wsl --set-default-version 2
```

#### 3.1.2 验证安装
```bash
# 检查Docker版本
docker --version
docker-compose --version

# 运行测试容器
docker run hello-world
```

### 3.2 Linux安装

#### 3.2.1 Ubuntu/Debian安装
```bash
# 更新包索引
sudo apt-get update

# 安装依赖
sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加Docker仓库
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker Engine
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 添加用户到docker组
sudo usermod -aG docker $USER
```

### 3.3 配置优化

#### 3.3.1 Docker Daemon配置
```json
// /etc/docker/daemon.json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
```

#### 3.3.2 资源限制
```bash
# 限制容器资源使用
docker run --memory="512m" --cpus="1.5" nginx

# 设置重启策略
docker run --restart=unless-stopped nginx
```

---

## 4. 基础命令

### 4.1 系统信息

#### 4.1.1 查看信息
```bash
# 查看Docker版本
docker version

# 查看系统信息
docker info

# 查看帮助
docker --help
docker run --help
```

#### 4.1.2 资源使用
```bash
# 查看磁盘使用情况
docker system df

# 清理未使用的资源
docker system prune

# 清理所有未使用的资源（危险操作）
docker system prune -a
```

### 4.2 镜像命令

#### 4.2.1 镜像查看
```bash
# 列出本地镜像
docker images
docker image ls

# 查看镜像详细信息
docker inspect nginx:latest

# 查看镜像历史
docker history nginx:latest
```

#### 4.2.2 镜像操作
```bash
# 拉取镜像
docker pull nginx:latest
docker pull ubuntu:20.04

# 删除镜像
docker rmi nginx:latest
docker image rm ubuntu:20.04

# 镜像打标签
docker tag nginx:latest myregistry.com/nginx:v1.0

# 推送镜像
docker push myregistry.com/nginx:v1.0
```

### 4.3 容器命令

#### 4.3.1 容器运行
```bash
# 运行容器
docker run nginx
docker run -d nginx                    # 后台运行
docker run -it ubuntu bash            # 交互式运行
docker run -p 8080:80 nginx           # 端口映射
docker run --name web nginx           # 指定容器名称

# 运行并删除
docker run --rm nginx
```

#### 4.3.2 容器管理
```bash
# 查看容器
docker ps                    # 运行中的容器
docker ps -a                 # 所有容器

# 启动/停止容器
docker start container_name
docker stop container_name
docker restart container_name

# 删除容器
docker rm container_name
docker rm -f container_name  # 强制删除运行中的容器

# 进入容器
docker exec -it container_name bash
docker attach container_name
```

---

## 5. 镜像管理

### 5.1 镜像获取

#### 5.1.1 从仓库拉取
```bash
# 拉取官方镜像
docker pull nginx
docker pull nginx:1.20
docker pull nginx:alpine

# 拉取第三方镜像
docker pull mysql:8.0
docker pull redis:6.2-alpine
docker pull node:16-alpine
```

#### 5.1.2 镜像搜索
```bash
# 搜索镜像
docker search nginx
docker search --limit 5 python
```

### 5.2 镜像构建

#### 5.2.1 基础构建
```bash
# 从Dockerfile构建
docker build -t myapp:v1.0 .
docker build -t myapp:latest -f Dockerfile.prod .

# 指定构建上下文
docker build -t myapp https://github.com/user/repo.git
```

#### 5.2.2 多阶段构建
```dockerfile
# 构建阶段
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# 生产阶段
FROM node:16-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 5.3 镜像优化

#### 5.3.1 减小镜像大小
```dockerfile
# 使用轻量级基础镜像
FROM alpine:latest

# 合并RUN命令
RUN apk add --no-cache \
    curl \
    wget \
    && rm -rf /var/cache/apk/*

# 使用.dockerignore
# .dockerignore文件内容：
node_modules
.git
*.md
.env
```

#### 5.3.2 镜像分层优化
```dockerfile
# 不好的例子
COPY . .
RUN npm install

# 好的例子
COPY package*.json ./
RUN npm ci --only=production
COPY . .
```

---

## 6. 容器管理

### 6.1 容器运行配置

#### 6.1.1 基础配置
```bash
# 环境变量
docker run -e NODE_ENV=production -e PORT=3000 myapp

# 工作目录
docker run -w /app myapp

# 用户权限
docker run -u 1000:1000 myapp

# 主机名
docker run -h myhost myapp
```

#### 6.1.2 资源限制
```bash
# 内存限制
docker run -m 512m myapp

# CPU限制
docker run --cpus="1.5" myapp
docker run --cpu-shares=512 myapp

# 磁盘IO限制
docker run --device-read-bps /dev/sda:1mb myapp
```

### 6.2 容器网络

#### 6.2.1 端口映射
```bash
# 单端口映射
docker run -p 8080:80 nginx

# 多端口映射
docker run -p 8080:80 -p 8443:443 nginx

# 指定协议
docker run -p 8080:80/tcp -p 8081:80/udp nginx

# 随机端口
docker run -P nginx
```

#### 6.2.2 网络连接
```bash
# 创建网络
docker network create mynetwork

# 连接到网络
docker run --network mynetwork myapp

# 网络别名
docker run --network mynetwork --network-alias web nginx
```

### 6.3 容器数据

#### 6.3.1 数据卷
```bash
# 创建数据卷
docker volume create mydata

# 使用数据卷
docker run -v mydata:/data myapp

# 绑定挂载
docker run -v /host/path:/container/path myapp

# 只读挂载
docker run -v /host/path:/container/path:ro myapp
```

#### 6.3.2 数据备份
```bash
# 备份数据卷
docker run --rm -v mydata:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .

# 恢复数据卷
docker run --rm -v mydata:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /data
```

---

## 7. Dockerfile编写

### 7.1 Dockerfile基础

#### 7.1.1 基础指令
```dockerfile
# 指定基础镜像
FROM node:16-alpine

# 维护者信息
LABEL maintainer="your-email@example.com"

# 设置工作目录
WORKDIR /app

# 复制文件
COPY package*.json ./
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 运行命令
RUN npm ci --only=production

# 容器启动命令
CMD ["npm", "start"]
```

#### 7.1.2 指令详解

**FROM** - 基础镜像
```dockerfile
FROM ubuntu:20.04
FROM node:16-alpine AS builder
FROM scratch  # 空白镜像
```

**RUN** - 执行命令
```dockerfile
# Shell形式
RUN apt-get update && apt-get install -y curl

# Exec形式（推荐）
RUN ["apt-get", "update"]
RUN ["apt-get", "install", "-y", "curl"]
```

**COPY vs ADD**
```dockerfile
# COPY（推荐）- 简单复制
COPY src/ /app/src/

# ADD - 支持URL和自动解压
ADD https://example.com/file.tar.gz /tmp/
ADD archive.tar.gz /tmp/  # 自动解压
```

### 7.2 最佳实践

#### 7.2.1 镜像优化
```dockerfile
# 多阶段构建
FROM node:16-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:16-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:16-alpine AS runtime
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

EXPOSE 3000
USER node
CMD ["npm", "start"]
```

#### 7.2.2 安全实践
```dockerfile
# 使用非root用户
FROM alpine:latest
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# 最小权限原则
FROM node:16-alpine
RUN apk add --no-cache dumb-init
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

### 7.3 实际案例

#### 7.3.1 Node.js应用
```dockerfile
FROM node:16-alpine

# 安装dumb-init
RUN apk add --no-cache dumb-init

# 创建应用目录
WORKDIR /usr/src/app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制应用代码
COPY . .

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 更改文件所有权
RUN chown -R nextjs:nodejs /usr/src/app
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置启动命令
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

#### 7.3.2 Python应用
```dockerfile
FROM python:3.9-slim

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 安装系统依赖
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 安装Python依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建非root用户
RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app
USER appuser

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

---

## 8. 数据管理

### 8.1 数据卷 (Volumes)

#### 8.1.1 创建和管理
```bash
# 创建数据卷
docker volume create myvolume

# 列出数据卷
docker volume ls

# 查看数据卷详情
docker volume inspect myvolume

# 删除数据卷
docker volume rm myvolume

# 清理未使用的数据卷
docker volume prune
```

#### 8.1.2 使用数据卷
```bash
# 挂载数据卷
docker run -v myvolume:/data nginx

# 匿名数据卷
docker run -v /data nginx

# 数据卷容器
docker create -v /data --name datacontainer alpine
docker run --volumes-from datacontainer nginx
```

### 8.2 绑定挂载 (Bind Mounts)

#### 8.2.1 基础使用
```bash
# 绑定挂载目录
docker run -v /host/path:/container/path nginx

# 只读挂载
docker run -v /host/path:/container/path:ro nginx

# 绑定挂载文件
docker run -v /host/config.conf:/app/config.conf nginx
```

#### 8.2.2 权限处理
```bash
# 指定用户ID
docker run -v /host/path:/container/path -u $(id -u):$(id -g) nginx

# 使用SELinux标签
docker run -v /host/path:/container/path:Z nginx
```

### 8.3 tmpfs挂载

#### 8.3.1 临时文件系统
```bash
# 挂载tmpfs
docker run --tmpfs /tmp nginx

# 指定大小和权限
docker run --tmpfs /tmp:rw,size=100m,mode=1777 nginx
```

### 8.4 数据备份策略

#### 8.4.1 数据卷备份
```bash
#!/bin/bash
# 备份脚本

VOLUME_NAME="myapp_data"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份
docker run --rm \
  -v ${VOLUME_NAME}:/data:ro \
  -v ${BACKUP_DIR}:/backup \
  alpine tar czf /backup/${VOLUME_NAME}_${DATE}.tar.gz -C /data .

echo "Backup completed: ${VOLUME_NAME}_${DATE}.tar.gz"
```

#### 8.4.2 数据库备份
```bash
# MySQL备份
docker exec mysql-container mysqldump -u root -p database_name > backup.sql

# PostgreSQL备份
docker exec postgres-container pg_dump -U postgres database_name > backup.sql

# MongoDB备份
docker exec mongo-container mongodump --db database_name --out /backup/
```

---

## 9. 网络配置

### 9.1 网络类型

#### 9.1.1 默认网络
```bash
# bridge网络（默认）
docker run nginx

# host网络
docker run --network host nginx

# none网络
docker run --network none alpine
```

#### 9.1.2 自定义网络
```bash
# 创建bridge网络
docker network create mynetwork

# 创建overlay网络（Swarm模式）
docker network create -d overlay myoverlay

# 创建macvlan网络
docker network create -d macvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  -o parent=eth0 \
  mymacvlan
```

### 9.2 容器通信

#### 9.2.1 同网络通信
```bash
# 创建网络
docker network create app-network

# 运行容器并连接到网络
docker run -d --name web --network app-network nginx
docker run -d --name db --network app-network mysql

# 容器间可以通过名称通信
docker exec web ping db
```

#### 9.2.2 跨网络通信
```bash
# 将容器连接到多个网络
docker network connect frontend-network web
docker network connect backend-network web

# 断开网络连接
docker network disconnect frontend-network web
```

### 9.3 网络安全

#### 9.3.1 网络隔离
```bash
# 创建隔离的网络
docker network create --internal internal-network

# 运行容器在隔离网络中
docker run --network internal-network alpine
```

#### 9.3.2 端口安全
```bash
# 只绑定到本地接口
docker run -p 127.0.0.1:8080:80 nginx

# 指定协议
docker run -p 8080:80/tcp -p 8081:80/udp nginx
```

---

## 10. Docker Compose

### 10.1 Compose基础

#### 10.1.1 docker-compose.yml结构
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - .:/code
    environment:
      - DEBUG=1
    depends_on:
      - db
      - redis

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine

volumes:
  postgres_data:

networks:
  default:
    driver: bridge
```

#### 10.1.2 基础命令
```bash
# 启动服务
docker-compose up
docker-compose up -d  # 后台运行

# 停止服务
docker-compose down
docker-compose down -v  # 同时删除数据卷

# 查看状态
docker-compose ps
docker-compose logs
docker-compose logs -f web  # 跟踪特定服务日志

# 重启服务
docker-compose restart
docker-compose restart web
```

### 10.2 服务配置

#### 10.2.1 构建配置
```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.prod
      args:
        - NODE_ENV=production
        - API_URL=https://api.example.com
    image: myapp:latest
```

#### 10.2.2 环境配置
```yaml
services:
  web:
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    env_file:
      - .env
      - .env.local
```

#### 10.2.3 依赖关系
```yaml
services:
  web:
    depends_on:
      db:
        condition: service_healthy
    
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 10.3 高级配置

#### 10.3.1 多环境配置
```yaml
# docker-compose.yml (基础配置)
version: '3.8'
services:
  web:
    build: .
    environment:
      - NODE_ENV=${NODE_ENV:-development}

# docker-compose.override.yml (开发环境)
version: '3.8'
services:
  web:
    volumes:
      - .:/app
    ports:
      - "3000:3000"

# docker-compose.prod.yml (生产环境)
version: '3.8'
services:
  web:
    image: myapp:latest
    restart: unless-stopped
```

#### 10.3.2 扩展和覆盖
```bash
# 使用多个配置文件
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up

# 扩展服务实例
docker-compose up --scale web=3

# 配置文件模板
version: '3.8'
x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

services:
  web:
    logging: *default-logging
  db:
    logging: *default-logging
```

### 10.4 实战案例

#### 10.4.1 Web应用栈
```yaml
version: '3.8'

services:
  # Nginx反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - static_files:/usr/share/nginx/html
    depends_on:
      - web
    restart: unless-stopped

  # Web应用
  web:
    build: .
    expose:
      - "3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:password@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    volumes:
      - static_files:/app/public
    depends_on:
      - db
      - redis
    restart: unless-stopped

  # 数据库
  db:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  # 缓存
  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  static_files:

networks:
  default:
    driver: bridge
```

#### 10.4.2 监控栈
```yaml
version: '3.8'

services:
  # Prometheus监控
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  # Grafana可视化
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  # Node Exporter
  node-exporter:
    image: prom/node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'

volumes:
  prometheus_data:
  grafana_data:
```

---

## 11. 最佳实践

### 11.1 镜像最佳实践

#### 11.1.1 镜像大小优化
```dockerfile
# 使用多阶段构建
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

#### 11.1.2 层缓存优化
```dockerfile
# 好的做法：先复制依赖文件
COPY package*.json ./
RUN npm ci

# 再复制源代码
COPY . .
```

#### 11.1.3 .dockerignore使用
```
# .dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.nyc_output
```

### 11.2 安全最佳实践

#### 11.2.1 最小权限原则
```dockerfile
# 创建非root用户
FROM alpine:latest
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# 切换到非root用户
USER appuser
```

#### 11.2.2 镜像扫描
```bash
# 使用Docker Scout扫描镜像
docker scout cves myapp:latest

# 使用Trivy扫描
trivy image myapp:latest
```

#### 11.2.3 秘钥管理
```bash
# 使用Docker secrets (Swarm模式)
echo "mysecret" | docker secret create db_password -

# 在容器中使用
docker service create \
  --secret db_password \
  --name myapp \
  myapp:latest
```

### 11.3 性能最佳实践

#### 11.3.1 资源限制
```yaml
# docker-compose.yml
services:
  web:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

#### 11.3.2 健康检查
```dockerfile
# Dockerfile中定义健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

```yaml
# docker-compose.yml中定义
services:
  web:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 11.4 开发最佳实践

#### 11.4.1 开发环境配置
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  web:
    build:
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    ports:
      - "3000:3000"
```

#### 11.4.2 调试配置
```bash
# 调试Node.js应用
docker run -it --rm \
  -p 3000:3000 \
  -p 9229:9229 \
  -v $(pwd):/app \
  node:16-alpine \
  node --inspect=0.0.0.0:9229 app.js
```

---

## 12. 故障排查

### 12.1 常见问题

#### 12.1.1 容器启动失败
```bash
# 查看容器日志
docker logs container_name
docker logs -f container_name  # 实时查看

# 查看容器详细信息
docker inspect container_name

# 进入容器调试
docker exec -it container_name sh

# 运行临时容器调试
docker run --rm -it ubuntu bash
```

#### 12.1.2 网络问题
```bash
# 查看网络配置
docker network ls
docker network inspect bridge

# 测试容器间连通性
docker exec container1 ping container2

# 查看端口映射
docker port container_name
```

#### 12.1.3 存储问题
```bash
# 查看磁盘使用
docker system df
docker system df -v

# 查看数据卷
docker volume ls
docker volume inspect volume_name

# 清理未使用的资源
docker system prune
docker volume prune
```

### 12.2 性能问题

#### 12.2.1 资源监控
```bash
# 查看容器资源使用
docker stats
docker stats container_name

# 查看系统资源
docker system events
docker system df
```

#### 12.2.2 性能分析
```bash
# 容器进程信息
docker exec container_name ps aux

# 容器内存使用
docker exec container_name free -h

# 容器磁盘使用
docker exec container_name df -h
```

### 12.3 调试技巧

#### 12.3.1 日志调试
```bash
# 查看Docker daemon日志
# Ubuntu/Debian
sudo journalctl -fu docker.service

# CentOS/RHEL
sudo journalctl -fu docker

# 设置日志级别
sudo dockerd --log-level debug
```

#### 12.3.2 网络调试
```bash
# 查看容器网络配置
docker exec container_name ip addr show
docker exec container_name netstat -tlnp

# 抓包调试
docker exec container_name tcpdump -i eth0
```

---

## 13. 实战案例

### 13.1 微服务架构

#### 13.1.1 服务拆分
```yaml
version: '3.8'

services:
  # API网关
  gateway:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./gateway.conf:/etc/nginx/nginx.conf
    depends_on:
      - user-service
      - order-service
      - product-service

  # 用户服务
  user-service:
    build: ./services/user
    environment:
      - DATABASE_URL=postgres://user:pass@user-db:5432/users
    depends_on:
      - user-db

  user-db:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: users
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - user_data:/var/lib/postgresql/data

  # 订单服务
  order-service:
    build: ./services/order
    environment:
      - DATABASE_URL=postgres://user:pass@order-db:5432/orders
    depends_on:
      - order-db
      - redis

  order-db:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - order_data:/var/lib/postgresql/data

  # 商品服务
  product-service:
    build: ./services/product
    environment:
      - DATABASE_URL=postgres://user:pass@product-db:5432/products
    depends_on:
      - product-db

  product-db:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: products
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - product_data:/var/lib/postgresql/data

  # Redis缓存
  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

volumes:
  user_data:
  order_data:
  product_data:
  redis_data:
```

### 13.2 CI/CD流水线

#### 13.2.1 GitHub Actions配置
```yaml
# .github/workflows/docker.yml
name: Docker Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        platforms: linux/amd64,linux/arm64
        push: true
        tags: |
          myregistry/myapp:latest
          myregistry/myapp:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

### 13.3 监控和日志

#### 13.3.1 ELK Stack
```yaml
version: '3.8'

services:
  # Elasticsearch
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  # Logstash
  logstash:
    image: docker.elastic.co/logstash/logstash:7.15.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  # Kibana
  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  # Filebeat
  filebeat:
    image: docker.elastic.co/beats/filebeat:7.15.0
    user: root
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - elasticsearch
      - logstash

volumes:
  elasticsearch_data:
```

### 13.4 高可用部署

#### 13.4.1 Docker Swarm集群
```bash
# 初始化Swarm集群
docker swarm init --advertise-addr 192.168.1.100

# 添加工作节点
docker swarm join --token TOKEN 192.168.1.100:2377

# 部署服务栈
docker stack deploy -c docker-compose.prod.yml myapp

# 扩展服务
docker service scale myapp_web=3

# 滚动更新
docker service update --image myapp:v2.0 myapp_web
```

#### 13.4.2 负载均衡配置
```yaml
version: '3.8'

services:
  web:
    image: myapp:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    networks:
      - webnet

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    deploy:
      replicas: 2
    networks:
      - webnet

networks:
  webnet:
    driver: overlay
```

---

## 📝 总结

本文档全面介绍了Docker的核心概念、基础操作、高级功能和实战应用。通过学习这些内容，您应该能够：

### 掌握的技能

1. ✅ **理解Docker基础概念**和架构原理
2. ✅ **熟练使用Docker命令**进行日常操作
3. ✅ **编写高质量的Dockerfile**
4. ✅ **管理容器、镜像、网络和存储**
5. ✅ **使用Docker Compose**编排多容器应用
6. ✅ **应用安全和性能最佳实践**
7. ✅ **排查和解决常见问题**
8. ✅ **部署生产级应用**

### 最佳实践总结

1. **镜像优化**：使用多阶段构建，减小镜像大小
2. **安全第一**：非root用户运行，定期扫描漏洞
3. **资源管理**：合理设置资源限制和健康检查
4. **数据持久化**：正确使用数据卷和备份策略
5. **网络安全**：合理配置网络和端口映射
6. **监控日志**：建立完善的监控和日志系统
7. **版本控制**：使用标签管理镜像版本
8. **文档维护**：保持配置文档的更新

### 进阶学习方向

- 🚀 **Kubernetes编排**：容器编排进阶
- 🔄 **CI/CD集成**：自动化部署流水线
- 📊 **监控告警**：Prometheus + Grafana
- 🔒 **安全加固**：镜像扫描、秘钥管理
- ☁️ **云原生**：云平台容器服务
- 🏗️ **微服务架构**：服务网格、API网关

---

**版本**: v1.0  
**更新日期**: 2024年12月  
**作者**: BMT开发团队
