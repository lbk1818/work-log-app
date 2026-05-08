@echo off
chcp 65001 >nul
echo ========================================
echo   工作日志 - cpolar 内网穿透
echo ========================================
echo.
echo 📌 使用前准备：
echo    1. 已注册 cpolar 账号
echo    2. 已安装 cpolar 客户端
echo    3. 已创建隧道（本地地址 8081）
echo.
echo 💡 如果没有 cpolar 账号：
echo    访问: https://www.cpolar.com/
echo.
pause

cd /d "%~dp0"

REM 检查 Python 是否安装
python --version >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到 Python
    pause
    exit /b 1
)

echo.
echo 🚀 步骤 1/2: 启动本地服务器...
start python -m http.server 8081

timeout /t 2 /nobreak >nul

echo.
echo 🚀 步骤 2/2: 请手动启动 cpolar 隧道
echo.
echo 📋 操作步骤：
echo    1. 打开 cpolar 客户端
echo    2. 找到"工作日志"隧道
echo    3. 点击"启动"
echo    4. 复制显示的公网链接
echo    5. 发送到手机浏览器访问
echo.
echo 💡 提示:
echo    - 首次使用需要先注册 cpolar
echo    - 免费版每月有 1GB 流量限制
echo    - 域名每次重启会变化
echo    - 关闭此窗口会停止本地服务器
echo.
echo ========================================
echo.

pause
