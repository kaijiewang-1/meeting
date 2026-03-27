#!/bin/bash
# 会议室预定系统 - 启动脚本（Linux/macOS）
cd "$(dirname "$0")"

echo "========================================"
echo "  会议室预定系统 - 启动脚本"
echo "========================================"
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未检测到 Python3，请先安装"
    exit 1
fi

# 安装依赖
echo "[1/3] 安装后端依赖..."
pip3 install -r requirements.txt -q
if [ $? -ne 0 ]; then
    echo "[错误] 依赖安装失败"
    exit 1
fi
echo "[OK] 依赖安装完成"

# 启动后端
echo ""
echo "[2/3] 启动后端服务 (http://127.0.0.1:5000) ..."
python3 app.py &
BACKEND_PID=$!

sleep 2

# 启动前端
echo ""
echo "[3/3] 启动前端静态服务 (http://127.0.0.1:5500/front/) ..."
python3 -m http.server 5500 --directory ../front &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo ""
echo "  后端已启动: http://127.0.0.1:5000"
echo "  前端请打开: http://127.0.0.1:5500/front/index.html"
echo ""
echo "  测试账号:"
echo "  普通用户: user / 123456"
echo "  管理员:   admin / 123456"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo ""
echo "========================================"

# 等待
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '服务已停止'; exit" INT TERM
wait
