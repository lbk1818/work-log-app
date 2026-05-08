@echo off
chcp 65001 >nul
echo ========================================
echo   手机工作日志 App - 启动程序
echo ========================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装 Python 3！
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [成功] Python 已安装
echo.
echo [提示] 正在启动本地服务器...
echo.
echo ========================================
echo   访问地址:
echo   电脑浏览器: http://localhost:8081
echo   手机浏览器: http://你的IP地址:8081
echo ========================================
echo.
echo 按 Ctrl+C 可停止服务器
echo.

cd /d "%~dp0"
python -m http.server 8081

if errorlevel 1 (
    echo.
    echo [错误] 服务器启动失败！
    pause
)
