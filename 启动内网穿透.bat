@echo off
chcp 65001 >nul
echo ========================================
echo   工作日志 - 内网穿透启动
echo ========================================
echo.
echo 📌 说明：
echo    此脚本会启动本地服务器并创建公网访问链接
echo    手机可以用流量访问生成的链接
echo.
echo ⚠️  首次使用需要注册 ngrok 账号获取 token
echo    注册地址: https://dashboard.ngrok.com/signup
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
echo 🚀 步骤 2/2: 启动 ngrok 内网穿透...
echo.
echo 💡 提示:
echo    - ngrok 会生成一个公网链接
echo    - 复制链接发送到手机即可访问
echo    - 关闭此窗口会停止服务
echo.
echo ========================================
echo.

REM 检查 ngrok 是否安装
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到 ngrok
    echo.
    echo 请先下载 ngrok:
    echo https://ngrok.com/download
    echo.
    echo 或者使用其他方案:
    echo 1. cpolar (国内推荐): https://www.cpolar.com/
    echo 2. 花生壳: https://hsk.oray.com/
    echo.
    pause
    exit /b 1
)

ngrok http 8081

pause
