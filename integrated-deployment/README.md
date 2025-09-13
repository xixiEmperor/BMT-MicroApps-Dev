# BMT羽毛球场馆管理系统 - 部署指南

## 🚀 快速开始

### 第一步：环境准备

#### 1.1 检查Docker环境
```bash
# 检查Docker是否安装
docker --version
docker-compose --version

# 如果未安装，请先安装Docker Desktop
```

#### 1.2 复制部署文件
```bash
# 在您的项目根目录下
mkdir deployment
cp -r integrated-deployment/* deployment/
cd deployment
```

#### 1.3 配置环境变量
```bash
# 复制环境变量模板
cp env.example .env

# 编辑环境变量文件（重要！）
nano .env
# 或使用您喜欢的编辑器
```

**必须修改的配置：**
```bash
# 修改这些关键配置
POSTGRES_PASSWORD=your_secure_db_password_here  # 改为强密码
REDIS_PASSWORD=your_secure_redis_password_here  # 改为强密码
JWT_SECRET=your_super_secret_jwt_key_here       # 改为32位以上随机字符串
PROJECT_DOMAIN=your-domain.com                  # 改为您的域名
```

### 第二步：构建前端项目

#### 2.1 构建Vue.js前端
```bash
# 回到项目根目录
cd ..

# 安装依赖（如果还没安装）
npm install
# 或
pnpm install

# 构建生产版本
npm run build
# 或
pnpm run build
```

#### 2.2 构建React管理后台
```bash
# 进入管理后台目录
cd BadmintonFrontend-B

# 安装依赖
npm install

# 构建生产版本
npm run build
```

#### 2.3 复制构建产物
```bash
# 回到部署目录
cd ../deployment

# 创建静态文件目录
mkdir -p dist/admin

# 复制Vue前端构建产物
cp -r ../dist/* ./dist/

# 复制React管理后台构建产物
cp -r ../BadmintonFrontend-B/dist/* ./dist/admin/
```

### 第三步：准备后端服务

#### 3.1 创建后端Dockerfile（如果还没有）
```bash
# 在项目根目录创建 backend/Dockerfile
mkdir -p backend
```

创建 `backend/Dockerfile`：
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

#### 3.2 创建WebSocket服务Dockerfile
创建 `websocket/Dockerfile`：
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "websocket-server.js"]
```

### 第四步：执行部署

#### 4.1 使用自动部署脚本
```bash
# 给脚本执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

#### 4.2 手动部署（可选）
```bash
# 创建必要目录
mkdir -p nginx/logs data/postgres data/redis data/uploads backups

# 启动服务
docker-compose up -d

# 查看启动状态
docker-compose ps
```

### 第五步：验证部署

#### 5.1 检查服务状态
```bash
# 查看所有容器状态
docker-compose ps

# 查看日志
docker-compose logs -f nginx
docker-compose logs -f bmt-backend
docker-compose logs -f bmt-websocket
```

#### 5.2 测试访问
```bash
# 测试前端页面
curl http://localhost

# 测试管理后台
curl http://localhost/admin

# 测试API接口
curl http://localhost/api/health

# 测试WebSocket（需要wscat工具）
# npm install -g wscat
wscat -c ws://localhost/ws/
```

#### 5.3 健康检查
访问以下URL确认服务正常：
- 前端页面：http://localhost
- 管理后台：http://localhost/admin
- 健康检查：http://localhost/health

## 🔧 常用操作命令

### 服务管理
```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启特定服务
docker-compose restart nginx
docker-compose restart bmt-backend

# 查看服务日志
docker-compose logs -f [服务名]

# 进入容器shell
docker-compose exec nginx sh
docker-compose exec bmt-backend sh
```

### 数据管理
```bash
# 备份数据库
docker-compose exec postgres-db pg_dump -U bmt_user bmt_database > backup.sql

# 恢复数据库
docker-compose exec -i postgres-db psql -U bmt_user bmt_database < backup.sql

# 查看Redis数据
docker-compose exec redis-cache redis-cli
```

### 更新部署
```bash
# 更新前端代码
npm run build
cp -r ../dist/* ./dist/
docker-compose restart nginx

# 更新后端代码
docker-compose build bmt-backend
docker-compose up -d bmt-backend

# 更新配置文件
docker-compose restart nginx
```

## 🐛 故障排查

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
netstat -tlnp | grep :80
lsof -i :80

# 停止占用端口的服务
sudo systemctl stop apache2
sudo systemctl stop nginx
```

#### 2. 权限问题
```bash
# 修复文件权限
sudo chown -R $USER:$USER .
chmod +x deploy.sh
```

#### 3. 容器无法启动
```bash
# 查看详细错误日志
docker-compose logs [服务名]

# 重建容器
docker-compose down
docker-compose up -d --force-recreate
```

#### 4. WebSocket连接失败
```bash
# 检查WebSocket服务状态
docker-compose logs bmt-websocket

# 检查Nginx WebSocket配置
docker-compose exec nginx nginx -t
```

### 调试技巧
```bash
# 进入容器调试
docker-compose exec bmt-backend sh
docker-compose exec nginx sh

# 查看容器资源使用
docker stats

# 查看网络连接
docker network ls
docker network inspect bmt-network
```

## 📚 进阶配置

### HTTPS配置
1. 获取SSL证书（Let's Encrypt或购买）
2. 将证书文件放到 `nginx/ssl/` 目录
3. 取消注释 `nginx/conf.d/app.conf` 中的HTTPS配置
4. 重启Nginx服务

### 性能优化
- 调整worker进程数量
- 配置缓存策略
- 启用HTTP/2
- 配置负载均衡

### 监控配置
- 集成Prometheus监控
- 配置日志收集
- 设置告警规则

## 🔒 安全建议

1. **修改默认密码**：数据库、Redis等所有默认密码
2. **配置防火墙**：只开放必要端口
3. **定期备份**：数据库和重要文件
4. **更新镜像**：定期更新Docker镜像
5. **监控日志**：关注异常访问和错误日志

## 📞 技术支持

如遇到问题，请检查：
1. Docker和Docker Compose版本
2. 端口是否被占用
3. 配置文件语法是否正确
4. 服务日志中的错误信息

---

**版本**: v1.0  
**更新日期**: 2024年12月  
**维护者**: BMT开发团队
