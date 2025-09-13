# Nginx学习文档 - 从入门到精通

## 📚 目录

1. [Nginx简介](#nginx简介)
2. [核心概念](#核心概念)
3. [配置文件结构](#配置文件结构)
4. [基础配置详解](#基础配置详解)
5. [反向代理配置](#反向代理配置)
6. [WebSocket配置](#websocket配置)
7. [负载均衡](#负载均衡)
8. [缓存策略](#缓存策略)
9. [安全配置](#安全配置)
10. [性能优化](#性能优化)
11. [监控和日志](#监控和日志)
12. [故障排查](#故障排查)
13. [实战案例](#实战案例)

---

## 1. Nginx简介

### 1.1 什么是Nginx？

Nginx（发音为"engine-x"）是一个高性能的HTTP和反向代理服务器，也是一个IMAP/POP3/SMTP服务器。

**核心特点：**
- ⚡ **高性能**：能处理大量并发连接
- 🔄 **反向代理**：可以代理后端服务
- ⚖️ **负载均衡**：分发请求到多个后端服务器
- 📁 **静态文件服务**：高效服务静态资源
- 🔧 **模块化设计**：功能通过模块扩展
- 💾 **低内存消耗**：资源使用效率高

### 1.2 Nginx vs Apache

| 特性 | Nginx | Apache |
|------|-------|--------|
| 并发处理 | 异步事件驱动 | 多进程/线程 |
| 内存使用 | 低 | 高 |
| 静态文件 | 优秀 | 良好 |
| 配置复杂度 | 中等 | 复杂 |
| 模块生态 | 丰富 | 非常丰富 |
| 学习曲线 | 平缓 | 陡峭 |

### 1.3 应用场景

- 🌐 **Web服务器**：提供静态文件服务
- 🔄 **反向代理**：代理后端API服务
- ⚖️ **负载均衡器**：分发流量到多个服务器
- 🛡️ **安全网关**：SSL终端、访问控制
- 📦 **CDN节点**：内容分发网络
- 🚀 **微服务网关**：服务路由和聚合

---

## 2. 核心概念

### 2.1 进程模型

```
Master进程 (管理进程)
├── Worker进程1 (处理请求)
├── Worker进程2 (处理请求)
├── Worker进程3 (处理请求)
└── Cache进程 (缓存管理)
```

**Master进程职责：**
- 读取配置文件
- 管理Worker进程
- 处理信号
- 绑定端口

**Worker进程职责：**
- 处理客户端请求
- 执行业务逻辑
- 管理连接

### 2.2 事件驱动模型

```
传统模型：一个连接 = 一个进程/线程
Nginx模型：一个Worker进程处理多个连接
```

**优势：**
- 内存占用少
- 上下文切换少
- 并发能力强

### 2.3 模块系统

Nginx采用模块化设计：

**核心模块：**
- `ngx_core_module` - 核心功能
- `ngx_http_module` - HTTP功能
- `ngx_event_module` - 事件处理

**常用HTTP模块：**
- `ngx_http_proxy_module` - 反向代理
- `ngx_http_upstream_module` - 负载均衡
- `ngx_http_rewrite_module` - URL重写
- `ngx_http_gzip_module` - Gzip压缩

---

## 3. 配置文件结构

### 3.1 配置文件层次结构

```nginx
# 全局块
user nginx;
worker_processes auto;

# events块
events {
    worker_connections 1024;
}

# http块
http {
    # http全局块
    include mime.types;
    default_type application/octet-stream;
    
    # upstream块
    upstream backend {
        server 192.168.1.10:8080;
        server 192.168.1.11:8080;
    }
    
    # server块
    server {
        # server全局块
        listen 80;
        server_name example.com;
        
        # location块
        location / {
            proxy_pass http://backend;
        }
        
        location /api/ {
            proxy_pass http://backend/api/;
        }
    }
}
```

### 3.2 配置块说明

#### 3.2.1 全局块
影响nginx全局的指令：
```nginx
# 运行用户
user nginx;

# Worker进程数量
worker_processes auto;  # 自动检测CPU核心数

# 错误日志
error_log /var/log/nginx/error.log warn;

# 进程文件
pid /var/run/nginx.pid;
```

#### 3.2.2 Events块
影响Nginx服务器与用户的网络连接：
```nginx
events {
    # 每个Worker进程的最大连接数
    worker_connections 1024;
    
    # 事件驱动模型
    use epoll;
    
    # 允许一个Worker进程同时接受多个连接
    multi_accept on;
}
```

#### 3.2.3 HTTP块
配置HTTP服务器：
```nginx
http {
    # MIME类型
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    # 访问日志
    access_log /var/log/nginx/access.log main;
    
    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    
    # 包含其他配置文件
    include /etc/nginx/conf.d/*.conf;
}
```

### 3.3 配置文件语法

#### 3.3.1 指令语法
```nginx
# 格式：指令名 参数1 参数2 ... 参数N;
listen 80;
server_name example.com www.example.com;
root /var/www/html;
```

#### 3.3.2 变量使用
```nginx
# Nginx内置变量
$remote_addr        # 客户端IP
$request_uri        # 请求URI
$host              # 主机名
$scheme            # 协议(http/https)

# 自定义变量
set $custom_var "hello";
return 200 $custom_var;
```

#### 3.3.3 正则表达式
```nginx
# 位置匹配
location ~ \.(jpg|png|gif)$ {
    expires 1y;
}

# 不区分大小写
location ~* \.(JPG|PNG|GIF)$ {
    expires 1y;
}

# 精确匹配
location = /favicon.ico {
    access_log off;
}
```

---

## 4. 基础配置详解

### 4.1 虚拟主机配置

#### 4.1.1 基于域名的虚拟主机
```nginx
# 网站1
server {
    listen 80;
    server_name site1.com www.site1.com;
    root /var/www/site1;
    index index.html;
}

# 网站2
server {
    listen 80;
    server_name site2.com www.site2.com;
    root /var/www/site2;
    index index.html;
}
```

#### 4.1.2 基于端口的虚拟主机
```nginx
# 端口80
server {
    listen 80;
    server_name example.com;
    root /var/www/site80;
}

# 端口8080
server {
    listen 8080;
    server_name example.com;
    root /var/www/site8080;
}
```

### 4.2 Location配置

#### 4.2.1 匹配优先级
```nginx
server {
    # 1. 精确匹配 (优先级最高)
    location = /exact {
        return 200 "exact match";
    }
    
    # 2. 前缀匹配 (^~)
    location ^~ /prefix {
        return 200 "prefix match";
    }
    
    # 3. 正则匹配 (~)
    location ~ \.(jpg|png)$ {
        return 200 "regex match";
    }
    
    # 4. 普通前缀匹配 (优先级最低)
    location /common {
        return 200 "common match";
    }
}
```

#### 4.2.2 常用Location配置
```nginx
# 静态文件处理
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API接口代理
location /api/ {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# 文件上传限制
location /upload {
    client_max_body_size 10M;
    proxy_pass http://backend;
}

# 禁止访问隐藏文件
location ~ /\. {
    deny all;
}
```

### 4.3 日志配置

#### 4.3.1 访问日志
```nginx
# 自定义日志格式
log_format custom '$remote_addr - $remote_user [$time_local] '
                  '"$request" $status $body_bytes_sent '
                  '"$http_referer" "$http_user_agent" '
                  'rt=$request_time uct="$upstream_connect_time" '
                  'uht="$upstream_header_time" urt="$upstream_response_time"';

server {
    # 使用自定义格式记录访问日志
    access_log /var/log/nginx/site.access.log custom;
    
    # 特定location不记录日志
    location /health {
        access_log off;
    }
}
```

#### 4.3.2 错误日志
```nginx
# 全局错误日志
error_log /var/log/nginx/error.log warn;

# 服务器级别错误日志
server {
    error_log /var/log/nginx/site.error.log error;
}
```

---

## 5. 反向代理配置

### 5.1 基础反向代理

#### 5.1.1 简单代理
```nginx
server {
    listen 80;
    server_name api.example.com;
    
    location / {
        # 代理到后端服务器
        proxy_pass http://192.168.1.10:8080;
        
        # 传递原始主机信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 5.1.2 路径处理
```nginx
# 保持原路径
location /api/ {
    proxy_pass http://backend/api/;  # 注意末尾的斜杠
}

# 去除路径前缀
location /api/ {
    proxy_pass http://backend/;      # 去除/api前缀
}

# 添加路径前缀
location / {
    proxy_pass http://backend/app/;  # 添加/app前缀
}
```

### 5.2 代理参数配置

#### 5.2.1 超时配置
```nginx
location /api/ {
    proxy_pass http://backend;
    
    # 连接超时
    proxy_connect_timeout 30s;
    
    # 发送超时
    proxy_send_timeout 30s;
    
    # 读取超时
    proxy_read_timeout 30s;
    
    # 整体超时
    proxy_timeout 60s;
}
```

#### 5.2.2 缓冲配置
```nginx
location /api/ {
    proxy_pass http://backend;
    
    # 启用代理缓冲
    proxy_buffering on;
    
    # 缓冲区大小
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    proxy_busy_buffers_size 8k;
    
    # 临时文件
    proxy_temp_file_write_size 8k;
    proxy_max_temp_file_size 1024m;
}
```

#### 5.2.3 错误处理
```nginx
location /api/ {
    proxy_pass http://backend;
    
    # 后端错误时的处理
    proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    
    # 重试次数
    proxy_next_upstream_tries 3;
    
    # 重试超时
    proxy_next_upstream_timeout 30s;
}
```

### 5.3 高级代理功能

#### 5.3.1 请求/响应修改
```nginx
location /api/ {
    proxy_pass http://backend;
    
    # 修改请求头
    proxy_set_header User-Agent "Custom-Proxy/1.0";
    proxy_set_header Authorization "Bearer $auth_token";
    
    # 隐藏响应头
    proxy_hide_header X-Powered-By;
    proxy_hide_header Server;
    
    # 添加响应头
    add_header X-Proxy-Server nginx;
    add_header X-Cache-Status $upstream_cache_status;
}
```

#### 5.3.2 条件代理
```nginx
# 根据用户代理代理到不同后端
location / {
    if ($http_user_agent ~* "mobile|android|iphone") {
        proxy_pass http://mobile_backend;
        break;
    }
    proxy_pass http://web_backend;
}

# 根据请求参数代理
location /api/ {
    if ($arg_version = "v2") {
        proxy_pass http://backend_v2;
        break;
    }
    proxy_pass http://backend_v1;
}
```

---

## 6. WebSocket配置

### 6.1 WebSocket基础配置

#### 6.1.1 基本WebSocket代理
```nginx
# WebSocket需要特殊的协议升级处理
location /ws/ {
    proxy_pass http://websocket_backend;
    
    # WebSocket必需的头部
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # 传递客户端信息
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

#### 6.1.2 WebSocket超时配置
```nginx
location /ws/ {
    proxy_pass http://websocket_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # WebSocket长连接超时配置
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
    
    # 禁用缓冲，确保实时性
    proxy_buffering off;
}
```

### 6.2 Socket.IO配置

#### 6.2.1 Socket.IO特殊处理
```nginx
# Socket.IO需要支持轮询fallback
location /socket.io/ {
    proxy_pass http://socketio_backend;
    proxy_http_version 1.1;
    
    # Socket.IO升级头部
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    
    # 长连接配置
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
    
    # 禁用缓冲
    proxy_buffering off;
}
```

### 6.3 WebSocket负载均衡

#### 6.3.1 会话保持
```nginx
# WebSocket需要会话保持
upstream websocket_backend {
    # 基于IP的会话保持
    ip_hash;
    
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}

location /ws/ {
    proxy_pass http://websocket_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

#### 6.3.2 一致性哈希
```nginx
# 使用一致性哈希实现会话保持
upstream websocket_backend {
    hash $remote_addr consistent;
    
    server 192.168.1.10:8080 weight=1;
    server 192.168.1.11:8080 weight=1;
    server 192.168.1.12:8080 weight=2;
}
```

---

## 7. 负载均衡

### 7.1 负载均衡算法

#### 7.1.1 轮询（默认）
```nginx
upstream backend {
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}
```

#### 7.1.2 加权轮询
```nginx
upstream backend {
    server 192.168.1.10:8080 weight=3;  # 权重3
    server 192.168.1.11:8080 weight=2;  # 权重2
    server 192.168.1.12:8080 weight=1;  # 权重1
}
```

#### 7.1.3 IP哈希
```nginx
upstream backend {
    ip_hash;  # 基于客户端IP的哈希
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}
```

#### 7.1.4 最少连接
```nginx
upstream backend {
    least_conn;  # 连接数最少的服务器优先
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}
```

### 7.2 健康检查

#### 7.2.1 被动健康检查
```nginx
upstream backend {
    server 192.168.1.10:8080 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:8080 max_fails=2 fail_timeout=10s;
    server 192.168.1.12:8080 backup;  # 备用服务器
}
```

#### 7.2.2 服务器状态控制
```nginx
upstream backend {
    server 192.168.1.10:8080;
    server 192.168.1.11:8080 down;     # 临时下线
    server 192.168.1.12:8080 backup;   # 备用服务器
    server 192.168.1.13:8080 max_conns=100;  # 最大连接数限制
}
```

### 7.3 高级负载均衡

#### 7.3.1 自定义哈希
```nginx
upstream backend {
    # 基于URL路径的哈希
    hash $request_uri consistent;
    
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}

upstream api_backend {
    # 基于请求头的哈希
    hash $http_x_user_id consistent;
    
    server 192.168.1.20:8080;
    server 192.168.1.21:8080;
}
```

#### 7.3.2 条件负载均衡
```nginx
# 根据请求类型分发到不同后端
location /api/ {
    if ($request_method = POST) {
        proxy_pass http://write_backend;
        break;
    }
    proxy_pass http://read_backend;
}
```

---

## 8. 缓存策略

### 8.1 浏览器缓存

#### 8.1.1 静态资源缓存
```nginx
# 长期缓存静态资源
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}

# 短期缓存HTML文件
location ~* \.(html|htm)$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
}

# 不缓存动态内容
location /api/ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    proxy_pass http://backend;
}
```

### 8.2 Nginx代理缓存

#### 8.2.1 基础代理缓存
```nginx
# 定义缓存路径和参数
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m 
                 max_size=1g inactive=60m use_temp_path=off;

server {
    location /api/ {
        proxy_cache api_cache;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        
        # 缓存键
        proxy_cache_key $scheme$proxy_host$request_uri;
        
        # 添加缓存状态头
        add_header X-Cache-Status $upstream_cache_status;
        
        proxy_pass http://backend;
    }
}
```

#### 8.2.2 条件缓存
```nginx
location /api/ {
    proxy_cache api_cache;
    
    # 根据请求方法决定是否缓存
    proxy_cache_methods GET HEAD;
    
    # 根据响应头决定缓存时间
    proxy_cache_valid 200 10m;
    proxy_cache_valid 301 302 1h;
    proxy_cache_valid any 1m;
    
    # 缓存绕过条件
    proxy_cache_bypass $http_pragma $http_authorization;
    
    # 不缓存的条件
    proxy_no_cache $http_pragma $http_authorization;
    
    proxy_pass http://backend;
}
```

### 8.3 缓存清理

#### 8.3.1 手动缓存清理
```nginx
# 缓存清理接口
location ~ /purge(/.*) {
    allow 127.0.0.1;
    deny all;
    
    proxy_cache_purge api_cache $scheme$proxy_host$1;
}
```

#### 8.3.2 自动缓存清理
```bash
# 清理脚本
#!/bin/bash
# 清理超过7天的缓存文件
find /var/cache/nginx -type f -mtime +7 -delete

# 清理特定路径的缓存
nginx -s reload  # 重新加载配置
```

---

## 9. 安全配置

### 9.1 基础安全

#### 9.1.1 隐藏服务器信息
```nginx
# 隐藏Nginx版本号
server_tokens off;

# 隐藏服务器头
more_clear_headers Server;
add_header Server "WebServer";
```

#### 9.1.2 防止常见攻击
```nginx
# 防止点击劫持
add_header X-Frame-Options "SAMEORIGIN" always;

# 防止MIME类型嗅探
add_header X-Content-Type-Options "nosniff" always;

# XSS防护
add_header X-XSS-Protection "1; mode=block" always;

# 内容安全策略
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" always;
```

### 9.2 访问控制

#### 9.2.1 IP访问控制
```nginx
# 允许特定IP访问
location /admin/ {
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    
    proxy_pass http://admin_backend;
}

# 地理位置限制
geo $allowed_country {
    default 0;
    CN 1;
    US 1;
    JP 1;
}

server {
    if ($allowed_country = 0) {
        return 403;
    }
}
```

#### 9.2.2 基础认证
```nginx
# HTTP基础认证
location /private/ {
    auth_basic "Restricted Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    proxy_pass http://backend;
}
```

### 9.3 限流保护

#### 9.3.1 请求限流
```nginx
# 定义限流区域
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

server {
    # API接口限流
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
    }
    
    # 登录接口严格限流
    location /login {
        limit_req zone=login burst=5;
        proxy_pass http://backend;
    }
}
```

#### 9.3.2 连接限制
```nginx
# 限制并发连接数
limit_conn_zone $binary_remote_addr zone=conn:10m;

server {
    # 每个IP最多10个并发连接
    limit_conn conn 10;
    
    # 下载限速
    location /download/ {
        limit_rate 1m;  # 限制到1MB/s
        proxy_pass http://backend;
    }
}
```

### 9.4 SSL/TLS配置

#### 9.4.1 SSL基础配置
```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    
    # SSL证书
    ssl_certificate /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;
    
    # SSL协议版本
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # 加密套件
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # SSL会话缓存
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

#### 9.4.2 SSL优化
```nginx
# SSL性能优化
ssl_session_cache shared:SSL:50m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# OCSP装订
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;

# DNS解析器
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

---

## 10. 性能优化

### 10.1 基础性能配置

#### 10.1.1 Worker进程优化
```nginx
# 自动设置worker进程数量
worker_processes auto;

# 绑定worker进程到CPU核心
worker_cpu_affinity auto;

# worker进程优先级
worker_priority -1;

# worker进程最大文件句柄数
worker_rlimit_nofile 65535;

events {
    # 每个worker进程的最大连接数
    worker_connections 4096;
    
    # 使用高效的事件模型
    use epoll;
    
    # 允许worker进程同时接受多个连接
    multi_accept on;
}
```

#### 10.1.2 缓冲区优化
```nginx
http {
    # 客户端缓冲区
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    client_max_body_size 10m;
    
    # 输出缓冲区
    output_buffers 1 32k;
    postpone_output 1460;
}
```

### 10.2 静态文件优化

#### 10.2.1 sendfile优化
```nginx
# 启用高效文件传输
sendfile on;

# 启用TCP_NOPUSH
tcp_nopush on;

# 启用TCP_NODELAY
tcp_nodelay on;

# 保持连接
keepalive_timeout 30;
keepalive_requests 100;
```

#### 10.2.2 压缩优化
```nginx
# Gzip压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
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

# Brotli压缩（需要模块支持）
brotli on;
brotli_comp_level 6;
brotli_types
    text/plain
    text/css
    application/json
    application/javascript
    text/xml
    application/xml
    application/xml+rss
    text/javascript;
```

### 10.3 缓存优化

#### 10.3.1 文件缓存
```nginx
# 打开文件缓存
open_file_cache max=100000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;
```

#### 10.3.2 代理缓存优化
```nginx
# 代理缓存配置
proxy_cache_path /var/cache/nginx/proxy 
                 levels=1:2 
                 keys_zone=proxy_cache:100m 
                 max_size=10g 
                 inactive=60m 
                 use_temp_path=off;

# 缓存优化
proxy_cache_lock on;
proxy_cache_lock_timeout 5s;
proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
```

---

## 11. 监控和日志

### 11.1 日志配置

#### 11.1.1 详细访问日志
```nginx
# 详细日志格式
log_format detailed '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time" '
                    'cs=$upstream_cache_status';

# JSON格式日志
log_format json_log escape=json '{'
                    '"time":"$time_iso8601",'
                    '"remote_addr":"$remote_addr",'
                    '"request":"$request",'
                    '"status":$status,'
                    '"body_bytes_sent":$body_bytes_sent,'
                    '"request_time":$request_time,'
                    '"upstream_response_time":"$upstream_response_time"'
                    '}';
```

#### 11.1.2 条件日志
```nginx
# 根据状态码记录日志
map $status $loggable {
    ~^[23] 0;  # 不记录2xx和3xx
    default 1; # 记录其他状态码
}

server {
    access_log /var/log/nginx/error_only.log combined if=$loggable;
}
```

### 11.2 状态监控

#### 11.2.1 Nginx状态模块
```nginx
# 启用状态监控
location /nginx_status {
    stub_status on;
    access_log off;
    allow 127.0.0.1;
    deny all;
}

# 扩展状态信息
location /status {
    vhost_traffic_status_display;
    vhost_traffic_status_display_format html;
    access_log off;
}
```

#### 11.2.2 健康检查端点
```nginx
# 应用健康检查
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}

# 详细健康检查
location /health/detailed {
    access_log off;
    proxy_pass http://backend/health;
    proxy_set_header Host $host;
}
```

### 11.3 性能监控

#### 11.3.1 响应时间监控
```nginx
# 记录详细性能指标
log_format performance '$remote_addr - $remote_user [$time_local] '
                      '"$request" $status $body_bytes_sent '
                      'rt=$request_time '
                      'uct="$upstream_connect_time" '
                      'uht="$upstream_header_time" '
                      'urt="$upstream_response_time"';

server {
    access_log /var/log/nginx/performance.log performance;
}
```

#### 11.3.2 错误监控
```nginx
# 错误日志级别
error_log /var/log/nginx/error.log warn;

# 特定location的错误日志
location /api/ {
    error_log /var/log/nginx/api_error.log error;
    proxy_pass http://backend;
}
```

---

## 12. 故障排查

### 12.1 常见问题

#### 12.1.1 配置文件错误
```bash
# 检查配置文件语法
nginx -t

# 检查特定配置文件
nginx -t -c /path/to/nginx.conf

# 显示配置文件内容
nginx -T
```

#### 12.1.2 进程问题
```bash
# 查看nginx进程
ps aux | grep nginx

# 查看端口占用
netstat -tlnp | grep :80
ss -tlnp | grep :80

# 查看nginx错误日志
tail -f /var/log/nginx/error.log
```

### 12.2 性能问题

#### 12.2.1 连接数问题
```bash
# 查看当前连接数
ss -s

# 查看nginx状态
curl http://localhost/nginx_status

# 检查文件句柄限制
ulimit -n
```

#### 12.2.2 内存问题
```bash
# 查看内存使用
free -h

# 查看nginx内存使用
ps aux | grep nginx | awk '{sum+=$6} END {print sum/1024 "MB"}'
```

### 12.3 调试技巧

#### 12.3.1 调试日志
```nginx
# 启用调试日志
error_log /var/log/nginx/debug.log debug;

# 特定模块调试
error_log /var/log/nginx/debug.log debug_http;
```

#### 12.3.2 请求追踪
```nginx
# 添加请求ID
add_header X-Request-ID $request_id;

# 日志中包含请求ID
log_format trace '$remote_addr - $remote_user [$time_local] '
                 '"$request" $status $body_bytes_sent '
                 'rid=$request_id rt=$request_time';
```

---

## 13. 实战案例

### 13.1 微服务网关

#### 13.1.1 服务路由
```nginx
# 微服务路由配置
upstream user_service {
    server user-service-1:8080;
    server user-service-2:8080;
}

upstream order_service {
    server order-service-1:8080;
    server order-service-2:8080;
}

upstream product_service {
    server product-service-1:8080;
    server product-service-2:8080;
}

server {
    listen 80;
    server_name api.example.com;
    
    # 用户服务
    location /api/users/ {
        proxy_pass http://user_service/;
        include proxy_params;
    }
    
    # 订单服务
    location /api/orders/ {
        proxy_pass http://order_service/;
        include proxy_params;
    }
    
    # 商品服务
    location /api/products/ {
        proxy_pass http://product_service/;
        include proxy_params;
    }
}
```

### 13.2 前后端分离部署

#### 13.2.1 SPA + API
```nginx
server {
    listen 80;
    server_name app.example.com;
    root /var/www/spa;
    index index.html;
    
    # 静态资源
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API代理
    location /api/ {
        proxy_pass http://backend_api/;
        include proxy_params;
    }
    
    # WebSocket代理
    location /ws/ {
        proxy_pass http://websocket_server/;
        include websocket_params;
    }
    
    # SPA路由
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 13.3 多环境部署

#### 13.3.1 环境隔离
```nginx
# 开发环境
server {
    listen 80;
    server_name dev.example.com;
    
    location / {
        proxy_pass http://dev_backend;
        add_header X-Environment "development";
    }
}

# 测试环境
server {
    listen 80;
    server_name test.example.com;
    
    location / {
        proxy_pass http://test_backend;
        add_header X-Environment "testing";
    }
}

# 生产环境
server {
    listen 443 ssl http2;
    server_name example.com;
    
    # SSL配置
    include ssl_params;
    
    location / {
        proxy_pass http://prod_backend;
        add_header X-Environment "production";
    }
}
```

### 13.4 高可用配置

#### 13.4.1 故障转移
```nginx
upstream backend {
    server primary.example.com:8080 max_fails=3 fail_timeout=30s;
    server secondary.example.com:8080 backup;
}

server {
    location / {
        proxy_pass http://backend;
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 30s;
    }
}
```

---

## 📝 总结

本文档涵盖了Nginx从基础到高级的所有重要概念和配置。通过学习这些内容，您应该能够：

1. ✅ **理解Nginx核心概念**和工作原理
2. ✅ **掌握基础配置**和虚拟主机设置
3. ✅ **实现反向代理**和负载均衡
4. ✅ **配置WebSocket支持**和实时通信
5. ✅ **优化性能**和安全配置
6. ✅ **监控和故障排查**
7. ✅ **应用于实际项目**中

### 最佳实践建议

1. **配置管理**：使用版本控制管理配置文件
2. **测试优先**：配置修改前先在测试环境验证
3. **监控告警**：建立完善的监控和告警机制
4. **安全第一**：定期更新和安全检查
5. **性能调优**：根据实际负载调整参数
6. **文档记录**：维护详细的配置文档

### 进阶学习方向

- 🔧 **Nginx模块开发**
- 🚀 **OpenResty和Lua脚本**
- 📊 **性能监控和分析**
- 🔒 **高级安全配置**
- ☁️ **容器化部署**
- 🌐 **CDN集成**

---

**版本**: v1.0  
**更新日期**: 2024年12月  
**作者**: BMT开发团队
