@echo off
chcp 65001 >nul
echo ========================================
echo   GitHub Pages 部署助手
echo ========================================
echo.

REM 检查 Git 是否安装
git --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Git！
    echo.
    echo 请先安装 Git:
    echo https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo [成功] Git 已安装
echo.

REM 获取用户输入
set /p username="请输入您的 GitHub 用户名: "
set /p repo="请输入仓库名称 (默认: work-log-app): "

if "%repo%"=="" set repo=work-log-app

echo.
echo ========================================
echo   即将部署到:
echo   https://%username%.github.io/%repo%/
echo ========================================
echo.

pause

echo.
echo [1/4] 初始化 Git 仓库...
cd /d "%~dp0"
git init
git add .
git commit -m "Initial deployment"

echo.
echo [2/4] 关联远程仓库...
git remote add origin https://github.com/%username%/%repo%.git

echo.
echo [3/4] 推送到 GitHub...
git branch -M main
git push -u origin main

if errorlevel 1 (
    echo.
    echo [错误] 推送失败！
    echo.
    echo 可能的原因：
    echo 1. 仓库不存在，请先在 GitHub 创建仓库
    echo 2. 用户名或密码错误
    echo 3. 网络连接问题
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ 部署成功！
echo ========================================
echo.
echo 访问地址:
echo https://%username%.github.io/%repo%/
echo.
echo 下一步：
echo 1. 在 GitHub 仓库设置中启用 Pages
echo 2. 等待 1-2 分钟部署完成
echo 3. 用手机浏览器访问上面的链接
echo.
pause
