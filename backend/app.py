"""
会议室预定系统 - Flask 后端入口
"""
import sys
import os

# 将 backend 目录加入 Python 路径
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify
from flask_cors import CORS
from database import init_db, seed_data
from config import Config
from routes.auth_routes import auth_bp
from routes.room_routes import rooms_bp
from routes.booking_routes import bookings_bp
from routes.admin_routes import admin_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # CORS：允许前端跨域访问
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # 注册蓝图
    app.register_blueprint(auth_bp)
    app.register_blueprint(rooms_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(admin_bp)

    # 健康检查
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'code': 0, 'message': 'ok', 'data': {'version': '1.0.0'}})

    # 全局 404
    @app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def catch_all(path):
        return jsonify({'code': 40400, 'message': f'接口不存在: /{path}', 'data': None})

    return app


# 初始化数据库
init_db()
seed_data()

app = create_app()

if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("  会议室预定系统 - 后端服务")
    print("=" * 50)
    print("  地址: http://127.0.0.1:5000")
    print("  API:  http://127.0.0.1:5000/api")
    print("  测试账号: user / 123456 (普通用户)")
    print("  测试账号: admin / 123456 (管理员)")
    print("=" * 50 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True)
