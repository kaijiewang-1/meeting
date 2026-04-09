"""
会议室预定系统 - Flask 后端入口
同进程托管 front/ 静态资源，便于单端口 HTTPS 反代或隧道暴露公网。
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify, send_from_directory, request, Response
from flask_cors import CORS
from database import init_db, seed_data
from config import Config
from routes.auth_routes import auth_bp
from routes.room_routes import rooms_bp
from routes.booking_routes import bookings_bp
from routes.admin_routes import admin_bp

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_FRONTEND_DIR = os.path.normpath(os.path.join(_BACKEND_DIR, '..', 'front'))


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(rooms_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(admin_bp)

    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'code': 0, 'message': 'ok', 'data': {'version': '1.0.0'}})

    @app.route('/')
    def index():
        return send_from_directory(_FRONTEND_DIR, 'index.html')

    @app.route('/scripts/<path:subpath>')
    def serve_scripts(subpath):
        return send_from_directory(os.path.join(_FRONTEND_DIR, 'scripts'), subpath)

    @app.route('/styles/<path:subpath>')
    def serve_styles(subpath):
        return send_from_directory(os.path.join(_FRONTEND_DIR, 'styles'), subpath)

    @app.errorhandler(404)
    def handle_404(err):
        if request.path.startswith('/api'):
            return jsonify({
                'code': 40400,
                'message': f'接口不存在: {request.path}',
                'data': None,
            }), 404
        return Response('Not Found', status=404, mimetype='text/plain')

    return app


init_db()
seed_data()

app = create_app()

if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', '1').lower() not in ('0', 'false', 'no')
    print("\n" + "=" * 50)
    print("  会议室预定系统")
    print("=" * 50)
    print("  本机: http://127.0.0.1:5000  （前端+API 同一端口）")
    print("  局域网: http://0.0.0.0:5000")
    print("  测试账号: user / 123456   admin / 123456")
    print("  公网 HTTPS: 见 docs/PUBLIC_HTTPS.md（Cloudflare Tunnel / ngrok）")
    print("=" * 50 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=debug)
