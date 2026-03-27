@echo off
chcp 65001 >nul
echo ========================================
echo   会议室预定系统 - 启动脚本
echo ========================================
echo.

:: 检查 Python
python --version 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装 Python 3.8+
    pause
    exit /b 1
)

:: 安装依赖
echo [1/3] 安装后端依赖...
pip install -r requirements.txt -q
if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查 pip
    pause
    exit /b 1
)
echo [OK] 依赖安装完成

:: 启动后端
echo.
echo [2/3] 启动后端服务 (http://127.0.0.1:5000) ...
start "Meeting Backend" python app.py

:: 等待后端启动
timeout /t 3 /nobreak >nul

:: 启动前端（尝试 Live Server 或 Python HTTP Server）
echo.
echo [3/3] 启动前端服务...
echo.
echo ========================================
echo.
echo   后端已启动: http://127.0.0.1:5000
echo   前端请用浏览器打开:
echo   http://127.0.0.1:5500/front/index.html
echo.
echo   测试账号:
echo   普通用户: user / 123456
echo   管理员:   admin / 123456
echo.
echo ========================================
echo.
echo   提示: 如果没有 Live Server 扩展，
echo   后端 Python HTTP 服务器会替代启动。
echo.

:: 尝试用 Python 静态服务器提供前端
start "Meeting Frontend" python -m http.server 5500 --directory ..\front

pause
