@echo off
chcp 65001 >nul
echo ========================================
echo   自动推送到 GitHub（带重试）
echo ========================================
echo.

cd /d "%~dp0"

set /a retry=0
set max_retries=5

:retry_push
set /a retry+=1
echo.
echo [尝试 %retry%/%max_retries%] 正在推送...
echo.

git push origin main

if errorlevel 1 (
    if %retry% lss %max_retries% (
        echo.
        echo [失败] 网络连接超时，等待 10 秒后重试...
        timeout /t 10 /nobreak >nul
        goto retry_push
    ) else (
        echo.
        echo [错误] 已重试 %max_retries% 次，仍然失败
        echo 建议：检查网络连接或稍后再试
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   推送成功！
echo ========================================
echo.
echo GitHub Pages 将在 1-2 分钟内自动部署
echo.
pause
