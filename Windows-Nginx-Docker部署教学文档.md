# Nginx + Docker Desktop 生产环境部署完整教学文档 (Windows专用版)

## 概述

本文档专门为Windows系统用户编写，详细介绍如何使用Docker Desktop + Nginx在Windows环境下部署Web应用程序。

### 架构图

```
Windows 10/11 + Docker Desktop
    ↓
[Nginx Container] (端口 80/443)
    ├── 静态文件托管 (前端)
    ├── API反向代理 → [后端容器:3000]
    ├── WebSocket代理 → [WebSocket容器:8080]
    └── 数据库连接 → [PostgreSQL:5432] + [Redis:6379]
```

### 技术栈

- **操作系统**: Windows 10/11
- **容器化**: Docker Desktop for Windows
- **Web服务器**: Nginx (容器化)
- **数据库**: PostgreSQL + Redis
- **SSL**: Let's Encrypt 或 商业证书

## 1. Windows环境准备

### 1.1 系统要求

**最低配置**:
- Windows 10 版本 2004 或 Windows 11
- CPU: 4核心 (支持虚拟化)
- 内存: 8GB RAM
- 存储: 100GB 可用空间

**推荐配置**:
- Windows 11 最新版本
- CPU: 8核心或以上
- 内存: 16GB RAM或以上
- 存储: 500GB SSD

### 1.2 启用必要功能

以管理员身份运行PowerShell：

```powershell
# 启用WSL功能
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# 启用虚拟机平台
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 启用Hyper-V (可选)
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All

# 重启系统
Restart-Computer
```

重启后继续设置：
```powershell
# 设置WSL2为默认版本
wsl --set-default-version 2

# 安装Ubuntu (可选)
wsl --install -d Ubuntu
```

### 1.3 安装开发工具

```powershell
# 安装Chocolatey包管理器
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# 安装必要工具
choco install git curl wget vim powershell-core -y

# 或使用winget
winget install Git.Git
winget install cURL.cURL
```

### 1.4 Docker Desktop配置

确保Docker Desktop已安装并正确配置：

1. 打开Docker Desktop
2. Settings → General → 启用 "Use the WSL 2 based engine"
3. Settings → Resources → 分配 4 CPU核心，8GB内存
4. Settings → Resources → WSL Integration → 启用集成

验证安装：
```powershell
docker --version
docker-compose --version
docker run hello-world
```

## 2. 项目目录结构

### 2.1 创建项目目录

```powershell
# 创建项目根目录 【替换your-project为实际项目名称】
$projectPath = "C:\projects\your-project"
New-Item -ItemType Directory -Path $projectPath -Force
Set-Location $projectPath

# 创建子目录
$directories = @(
    "nginx\conf.d",
    "nginx\ssl", 
    "nginx\logs",
    "app\frontend",
    "app\backend",
    "data\postgres",
    "data\redis",
    "data\uploads",
    "backups",
    "scripts"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir -Force
    Write-Host "Created: $dir"
}
```

### 2.2 目录结构说明

```
C:\projects\your-project\             # 【替换为实际项目名称】
├── docker-compose.yml               # Docker编排文件
├── .env                             # 环境变量文件
├── nginx\
│   ├── nginx.conf                   # 主配置文件
│   ├── conf.d\
│   │   └── app.conf                 # 应用配置
│   ├── ssl\                         # SSL证书目录
│   └── logs\                        # 日志目录
├── app\
│   ├── frontend\                    # 前端静态文件
│   └── backend\                     # 后端应用代码
├── data\                            # 持久化数据
├── backups\                         # 备份目录
└── scripts\                         # 部署脚本
```

## 3. Nginx配置

### 3.1 主配置文件

创建 `nginx\nginx.conf`：

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    client_max_body_size 100M;
    client_body_timeout 60;
    client_header_timeout 60;
    send_timeout 60;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    include /etc/nginx/conf.d/*.conf;
}
```

### 3.2 应用配置文件

创建 `nginx\conf.d\app.conf`：

```nginx
# 上游服务器配置
upstream backend_api {
    server backend-app:3000 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream websocket_server {
    server websocket-app:8080 weight=1;
    keepalive 32;
}

# HTTP服务器配置
server {
    listen 80;
    server_name localhost your-domain.com;  # 【替换为实际域名】
    
    root /usr/share/nginx/html;
    index index.html index.htm;
    
    # 静态文件缓存
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }
    
    # API反向代理
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket代理
    location /ws/ {
        proxy_pass http://websocket_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 前端单页应用处理
    location / {
        try_files $uri $uri/ /index.html;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 隐藏敏感文件
    location ~ /\. {
        deny all;
    }
    
    location ~* \.(env|log|ini)$ {
        deny all;
    }
}
```

## 4. Docker Compose配置

### 4.1 环境变量文件

创建 `.env`：

```env
# 项目配置
COMPOSE_PROJECT_NAME=your-project          # 【替换为实际项目名称】
PROJECT_DOMAIN=your-domain.com             # 【替换为实际域名】

# 数据库配置
POSTGRES_DB=your_database                  # 【替换为实际数据库名】
POSTGRES_USER=your_db_user                 # 【替换为实际数据库用户】
POSTGRES_PASSWORD=your_secure_password     # 【替换为实际数据库密码】

# Redis配置
REDIS_PASSWORD=your_redis_password         # 【替换为实际Redis密码】

# 应用配置
NODE_ENV=production
API_PORT=3000
WS_PORT=8080
JWT_SECRET=your_jwt_secret                 # 【替换为实际JWT密钥】

# Windows路径配置
HOST_PROJECT_PATH=C:\projects\your-project # 【替换为实际项目路径】
```

### 4.2 Docker Compose文件

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  # Nginx Web服务器
  nginx:
    image: nginx:1.24-alpine
    container_name: ${COMPOSE_PROJECT_NAME}-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - .\nginx\nginx.conf:/etc/nginx/nginx.conf:ro
      - .\nginx\conf.d:/etc/nginx/conf.d:ro
      - .\nginx\ssl:/etc/nginx/ssl:ro
      - .\app\frontend:/usr/share/nginx/html:ro
      - .\nginx\logs:/var/log/nginx
    depends_on:
      - backend-app
    networks:
      - app-network

  # 后端应用服务
  backend-app:
    image: your-backend-image:latest        # 【替换为实际镜像】
    container_name: ${COMPOSE_PROJECT_NAME}-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=${NODE_ENV}
      - PORT=${API_PORT}
      - DB_HOST=postgres-db
      - DB_PORT=5432
      - DB_NAME=${POSTGRES_DB}
      - DB_USER=${POSTGRES_USER}
      - DB_PASS=${POSTGRES_PASSWORD}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis-cache:6379
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - .\data\uploads:/app/uploads
    depends_on:
      - postgres-db
      - redis-cache
    networks:
      - app-network

  # PostgreSQL数据库
  postgres-db:
    image: postgres:15-alpine
    container_name: ${COMPOSE_PROJECT_NAME}-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - .\data\postgres:/var/lib/postgresql/data
      - .\backups:/backups
    ports:
      - "5432:5432"
    networks:
      - app-network

  # Redis缓存
  redis-cache:
    image: redis:7-alpine
    container_name: ${COMPOSE_PROJECT_NAME}-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - .\data\redis:/data
    ports:
      - "6379:6379"
    networks:
      - app-network

  # WebSocket服务
  websocket-app:
    image: your-websocket-image:latest      # 【替换为实际镜像】
    container_name: ${COMPOSE_PROJECT_NAME}-websocket
    restart: unless-stopped
    environment:
      - WS_PORT=${WS_PORT}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis-cache:6379
    depends_on:
      - redis-cache
    networks:
      - app-network

  # pgAdmin管理工具 (开发环境)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: ${COMPOSE_PROJECT_NAME}-pgadmin
    restart: unless-stopped
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@example.com     # 【替换为实际邮箱】
      - PGADMIN_DEFAULT_PASSWORD=admin123           # 【替换为实际密码】
    ports:
      - "8080:80"
    volumes:
      - .\data\pgadmin:/var/lib/pgadmin
    depends_on:
      - postgres-db
    networks:
      - app-network
    profiles:
      - dev

networks:
  app-network:
    driver: bridge
    name: ${COMPOSE_PROJECT_NAME}-network
```

## 5. Windows脚本工具

### 5.1 部署脚本

创建 `scripts\deploy.bat`：

```batch
@echo off
REM Windows部署脚本

echo Starting deployment...

set PROJECT_PATH=C:\projects\your-project    REM 【替换为实际路径】
cd /d %PROJECT_PATH%

REM 构建前端
echo Building frontend...
call scripts\build-frontend.bat

REM 停止旧服务
echo Stopping old services...
docker-compose down

REM 启动新服务
echo Starting new services...
docker-compose up -d

REM 等待服务启动
echo Waiting for services...
timeout /t 30 /nobreak

REM 健康检查
echo Checking health...
curl -f http://localhost/health
if %errorlevel% equ 0 (
    echo Deployment successful!
) else (
    echo Deployment failed!
    pause
    exit /b 1
)

echo Deployment completed!
pause
```

### 5.2 备份脚本

创建 `scripts\backup.bat`：

```batch
@echo off
REM Windows备份脚本

set PROJECT_PATH=C:\projects\your-project    REM 【替换为实际路径】
set BACKUP_DIR=%PROJECT_PATH%\backups
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_NAME=backup_%TIMESTAMP%

echo Starting backup process...
cd /d %PROJECT_PATH%

REM 备份数据库
echo Backing up database...
docker exec %COMPOSE_PROJECT_NAME%-postgres pg_dump -U %POSTGRES_USER% %POSTGRES_DB% > "%BACKUP_DIR%\%BACKUP_NAME%_database.sql"

REM 备份Redis
echo Backing up Redis...
docker exec %COMPOSE_PROJECT_NAME%-redis redis-cli --rdb /data/dump.rdb
copy "data\redis\dump.rdb" "%BACKUP_DIR%\%BACKUP_NAME%_redis.rdb"

REM 备份上传文件
echo Backing up uploads...
if exist "data\uploads" (
    powershell "Compress-Archive -Path 'data\uploads\*' -DestinationPath '%BACKUP_DIR%\%BACKUP_NAME%_uploads.zip' -Force"
)

REM 创建完整备份
cd /d "%BACKUP_DIR%"
powershell "Compress-Archive -Path '%BACKUP_NAME%_*' -DestinationPath '%BACKUP_NAME%_full.zip' -Force"

REM 清理临时文件
del "%BACKUP_NAME%_database.sql"
del "%BACKUP_NAME%_redis.rdb"
del "%BACKUP_NAME%_uploads.zip"

echo Backup completed: %BACKUP_NAME%_full.zip
pause
```

### 5.3 监控脚本

创建 `scripts\monitor.bat`：

```batch
@echo off
REM Windows监控脚本

set PROJECT_PATH=C:\projects\your-project    REM 【替换为实际路径】

echo ================================
echo Docker Application Monitor
echo ================================
echo Time: %date% %time%
echo.

REM 检查容器状态
echo === Container Status ===
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

REM 检查服务健康
echo === Health Check ===
curl -s http://localhost/health
echo.

REM 检查磁盘空间
echo === Disk Space ===
dir C:\ | findstr "bytes"
echo.

REM 检查内存使用
echo === Memory Usage ===
wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /format:list | findstr "="
echo.

REM 检查最近日志
echo === Recent Logs ===
docker-compose logs --tail=5

echo ================================
pause
```

### 5.4 开发环境启动脚本

创建 `scripts\dev-start.bat`：

```batch
@echo off
REM 开发环境启动脚本

set PROJECT_PATH=C:\projects\your-project    REM 【替换为实际路径】
cd /d %PROJECT_PATH%

echo Starting development environment...

REM 启动开发环境服务
docker-compose --profile dev up -d

echo.
echo Development services started!
echo Web: http://localhost
echo pgAdmin: http://localhost:8080
echo.

REM 显示服务状态
docker-compose ps

echo.
echo Press any key to view logs...
pause
docker-compose logs -f
```

## 6. SSL证书配置

### 6.1 开发环境自签名证书

创建 `scripts\create-ssl.ps1`：

```powershell
# 创建开发用自签名证书

$projectPath = "C:\projects\your-project"  # 【替换为实际路径】
$sslPath = Join-Path $projectPath "nginx\ssl"

Write-Host "Creating self-signed certificate for development..."

# 创建自签名证书
$cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1" -CertStoreLocation "cert:\LocalMachine\My"

# 导出证书
$certPath = "cert:\LocalMachine\My\$($cert.Thumbprint)"
Export-Certificate -Cert $certPath -FilePath "$sslPath\localhost.crt"

# 导出私钥需要额外步骤
$mypwd = ConvertTo-SecureString -String "temp123" -Force -AsPlainText
Export-PfxCertificate -Cert $certPath -FilePath "$sslPath\localhost.pfx" -Password $mypwd

# 从PFX提取私钥 (需要OpenSSL)
# openssl pkcs12 -in localhost.pfx -nocerts -out localhost.key -nodes

Write-Host "Self-signed certificate created successfully!"
Write-Host "Certificate: $sslPath\localhost.crt"
Write-Host "Note: You may need OpenSSL to extract the private key from localhost.pfx"
```

### 6.2 生产环境证书配置

对于生产环境，将证书文件放置到 `nginx\ssl\` 目录：
- `your-domain.crt` - 证书文件 【替换为实际文件名】
- `your-domain.key` - 私钥文件 【替换为实际文件名】

然后更新 `nginx\conf.d\app.conf` 添加HTTPS配置：

```nginx
# 添加HTTPS服务器配置
server {
    listen 443 ssl http2;
    server_name your-domain.com;  # 【替换为实际域名】
    
    ssl_certificate /etc/nginx/ssl/your-domain.crt;
    ssl_certificate_key /etc/nginx/ssl/your-domain.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 其他配置与HTTP服务器相同...
}
```

## 7. 故障排查

### 7.1 常见问题解决

**Docker Desktop无法启动**:
```powershell
# 检查Hyper-V状态
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V

# 检查WSL2状态
wsl -l -v

# 重启Docker Desktop
Stop-Process -Name "Docker Desktop" -Force
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

**端口被占用**:
```powershell
# 查找占用端口的进程
netstat -ano | findstr ":80"

# 终止进程 (替换PID)
taskkill /PID 1234 /F
```

**容器无法启动**:
```batch
# 查看容器日志
docker-compose logs container-name

# 重启特定容器
docker-compose restart container-name

# 重建容器
docker-compose up -d --force-recreate container-name
```

### 7.2 诊断脚本

创建 `scripts\diagnose.ps1`：

```powershell
# Windows系统诊断脚本

Write-Host "=== Docker Desktop Diagnosis ===" -ForegroundColor Green

# 检查Docker状态
Write-Host "`nDocker Version:" -ForegroundColor Yellow
docker --version
docker-compose --version

# 检查容器状态
Write-Host "`nContainer Status:" -ForegroundColor Yellow
docker ps -a

# 检查网络
Write-Host "`nNetwork Test:" -ForegroundColor Yellow
Test-NetConnection -ComputerName localhost -Port 80

# 检查磁盘空间
Write-Host "`nDisk Space:" -ForegroundColor Yellow
Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="Size(GB)";Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpace(GB)";Expression={[math]::Round($_.FreeSpace/1GB,2)}}

# 检查内存使用
Write-Host "`nMemory Usage:" -ForegroundColor Yellow
Get-WmiObject -Class Win32_OperatingSystem | Select-Object @{Name="Total(GB)";Expression={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}}, @{Name="Free(GB)";Expression={[math]::Round($_.FreePhysicalMemory/1MB,2)}}

# 检查服务健康
Write-Host "`nHealth Check:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost/health" -TimeoutSec 5
    Write-Host "Health check: $($response.StatusCode) - $($response.Content)"
} catch {
    Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Diagnosis Complete ===" -ForegroundColor Green
```

## 8. 性能优化

### 8.1 Docker Desktop优化

在Docker Desktop设置中：
1. Resources → CPU: 4-8核心
2. Resources → Memory: 8-16GB  
3. Resources → Swap: 2GB
4. Resources → Disk image size: 根据需要调整

### 8.2 WSL2优化

创建 `%USERPROFILE%\.wslconfig`：

```ini
[wsl2]
memory=8GB
processors=4
swap=2GB
localhostForwarding=true
```

### 8.3 性能监控脚本

创建 `scripts\performance.ps1`：

```powershell
# 性能监控脚本

param(
    [int]$IntervalSeconds = 30
)

Write-Host "Starting performance monitor (Ctrl+C to stop)..."

while ($true) {
    Clear-Host
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    Write-Host "=== Performance Monitor - $timestamp ===" -ForegroundColor Green
    
    # CPU使用率
    $cpu = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1
    Write-Host "CPU Usage: $([math]::Round($cpu.CounterSamples[0].CookedValue, 2))%"
    
    # 内存使用
    $memory = Get-Counter "\Memory\Available MBytes" -SampleInterval 1 -MaxSamples 1
    Write-Host "Available Memory: $([math]::Round($memory.CounterSamples[0].CookedValue, 2)) MB"
    
    # 容器资源使用
    Write-Host "`nContainer Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    
    Start-Sleep -Seconds $IntervalSeconds
}
```

## 9. 总结

本文档提供了完整的Windows环境下Nginx + Docker Desktop部署方案，包括：

### 主要特点
- **Windows原生支持**: 所有脚本针对Windows优化
- **Docker Desktop集成**: 充分利用图形界面和WSL2
- **完整工具链**: 部署、备份、监控、诊断脚本
- **开发友好**: 包含开发环境配置和工具

### 部署检查清单

**环境准备**:
- [ ] Windows 10/11，启用WSL2和Hyper-V
- [ ] Docker Desktop安装并正常运行
- [ ] 替换所有【替换为实际xxx】配置
- [ ] 创建项目目录结构

**配置文件**:
- [ ] 配置nginx.conf和app.conf
- [ ] 设置docker-compose.yml
- [ ] 创建.env环境变量文件
- [ ] 配置SSL证书（如需要）

**脚本工具**:
- [ ] 测试部署脚本
- [ ] 设置备份策略
- [ ] 配置监控脚本
- [ ] 验证故障排查工具

**生产部署**:
- [ ] 性能测试
- [ ] 安全检查
- [ ] 备份测试
- [ ] 监控配置

遵循本文档，您可以在Windows系统上快速搭建一个完整、稳定的Docker + Nginx生产环境。
