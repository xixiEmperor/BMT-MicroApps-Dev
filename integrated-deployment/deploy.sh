#!/bin/bash

# BMT羽毛球场馆管理系统部署脚本
# 支持前后端分离 + WebSocket集成部署

set -e

echo "🚀 开始部署 BMT 羽毛球场馆管理系统..."

# 检查必需文件
if [ ! -f ".env" ]; then
    echo "❌ 未找到 .env 文件，请复制 env.example 并配置"
    exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 未找到 docker-compose.yml 文件"
    exit 1
fi

# 创建必需目录
echo "📁 创建必需目录..."
mkdir -p nginx/logs data/postgres data/redis data/uploads backups

# 构建前端项目
echo "🔨 构建前端项目..."
if [ -d "../src" ]; then
    cd ..
    echo "正在安装前端依赖..."
    npm install
    echo "正在构建前端项目..."
    npm run build
    
    # 复制构建产物到部署目录
    if [ -d "dist" ]; then
        cp -r dist/* integrated-deployment/dist/
        echo "✅ 前端构建完成"
    else
        echo "❌ 前端构建失败，未找到 dist 目录"
        exit 1
    fi
    
    cd integrated-deployment
else
    echo "⚠️  未找到前端源码，请确保在正确的目录中运行脚本"
fi

# 停止旧服务
echo "⏹️  停止旧服务..."
docker-compose down --remove-orphans

# 清理旧镜像 (可选)
echo "🧹 清理未使用的Docker镜像..."
docker image prune -f

# 启动新服务
echo "🚀 启动新服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 健康检查
echo "🔍 执行健康检查..."
services=("nginx:80" "postgres-db:5432" "redis-cache:6379")

for service in "${services[@]}"; do
    container=$(echo $service | cut -d':' -f1)
    port=$(echo $service | cut -d':' -f2)
    
    if docker-compose ps | grep -q "$container.*Up"; then
        echo "✅ $container 服务运行正常"
    else
        echo "❌ $container 服务启动失败"
        docker-compose logs $container
        exit 1
    fi
done

# 测试Web服务
echo "🌐 测试Web服务..."
if curl -f -s http://localhost/health > /dev/null; then
    echo "✅ Web服务健康检查通过"
else
    echo "❌ Web服务健康检查失败"
    docker-compose logs nginx
    exit 1
fi

# 显示服务状态
echo "📊 服务状态："
docker-compose ps

echo ""
echo "🎉 部署完成！"
echo "📱 前端访问地址: http://localhost"
echo "🔧 管理后台: http://localhost/admin"
echo "💾 数据库端口: 5432"
echo "📡 Redis端口: 6379"
echo ""
echo "📝 查看日志: docker-compose logs -f"
echo "⏹️  停止服务: docker-compose down"
echo "🔄 重启服务: docker-compose restart"
