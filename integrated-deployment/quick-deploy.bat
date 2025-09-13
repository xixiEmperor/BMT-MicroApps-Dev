@echo off
REM BMT羽毛球场馆管理系统 - Windows一键部署脚本
echo ========================================
echo   BMT羽毛球场馆管理系统 一键部署
echo ========================================
echo.

REM 检查Docker是否运行
echo [1/6] 检查Docker环境...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker未安装或未启动，请先安装Docker Desktop
    pause
    exit /b 1
)
echo ✅ Docker环境正常

REM 检查环境变量文件
echo [2/6] 检查环境配置...
if not exist ".env" (
    echo ⚠️  未找到.env文件，正在创建...
    copy env.example .env
    echo ❌ 请先编辑.env文件，修改数据库密码等关键配置！
    echo 📝 需要修改的配置：
    echo    - POSTGRES_PASSWORD
    echo    - REDIS_PASSWORD  
    echo    - JWT_SECRET
    echo    - PROJECT_DOMAIN
    pause
    exit /b 1
)
echo ✅ 环境配置文件存在

REM 创建必要目录
echo [3/6] 创建必要目录...
mkdir dist 2>nul
mkdir dist\admin 2>nul
mkdir data 2>nul
mkdir data\postgres 2>nul
mkdir data\redis 2>nul
mkdir data\uploads 2>nul
mkdir nginx\logs 2>nul
mkdir nginx\ssl 2>nul
mkdir backups 2>nul
echo ✅ 目录创建完成

REM 构建前端项目
echo [4/6] 构建前端项目...
cd ..

REM 检查并构建Vue前端
if exist "package.json" (
    echo 🔨 构建Vue.js前端...
    call npm install
    call npm run build
    if exist "dist" (
        echo ✅ Vue前端构建成功
        xcopy /E /Y "dist\*" "integrated-deployment\dist\"
    ) else (
        echo ❌ Vue前端构建失败
        cd integrated-deployment
        pause
        exit /b 1
    )
) else (
    echo ⚠️  未找到Vue项目package.json
)

REM 检查并构建React管理后台
if exist "BadmintonFrontend-B\package.json" (
    echo 🔨 构建React管理后台...
    cd BadmintonFrontend-B
    call npm install
    call npm run build
    if exist "dist" (
        echo ✅ React管理后台构建成功
        xcopy /E /Y "dist\*" "..\integrated-deployment\dist\admin\"
    ) else (
        echo ❌ React管理后台构建失败
        cd ..\integrated-deployment
        pause
        exit /b 1
    )
    cd ..
) else (
    echo ⚠️  未找到React管理后台项目
)

cd integrated-deployment

REM 停止旧服务
echo [5/6] 停止旧服务...
docker-compose down 2>nul
echo ✅ 旧服务已停止

REM 启动新服务
echo [6/6] 启动新服务...
docker-compose up -d

REM 等待服务启动
echo ⏳ 等待服务启动...
timeout /t 30 /nobreak

REM 健康检查
echo 🔍 执行健康检查...
curl -f http://localhost/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 服务启动成功！
    echo.
    echo 🎉 部署完成！
    echo 📱 前端访问: http://localhost
    echo 🔧 管理后台: http://localhost/admin
    echo 💾 数据库端口: 5432
    echo 📡 Redis端口: 6379
    echo.
    echo 📊 查看服务状态: docker-compose ps
    echo 📝 查看日志: docker-compose logs -f
) else (
    echo ❌ 服务启动失败，请检查日志
    docker-compose logs
)

echo.
echo 按任意键退出...
pause >nul
