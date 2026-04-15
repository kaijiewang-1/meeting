"""
认证接口路由
"""
from flask import Blueprint, request, jsonify
from auth import login

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def handle_login():
    """用户登录"""
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '')

    if not username or not password:
        return jsonify({'code': 40001, 'message': '用户名和密码不能为空', 'data': None}), 200

    result = login(username, password)
    if not result:
        return jsonify({'code': 40101, 'message': '用户名或密码错误', 'data': None}), 200

    return jsonify({'code': 0, 'message': '登录成功', 'data': result}), 200