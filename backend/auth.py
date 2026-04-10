"""
认证模块 - JWT 签发与校验
"""
import jwt
import datetime
from functools import wraps
from flask import request, g
from werkzeug.security import check_password_hash
from config import Config
from database import get_db


def generate_token(user_id, username, role):
    """生成 JWT Token"""
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXPIRY_HOURS),
        'iat': datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')


def decode_token(token):
    """解析 JWT Token"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user():
    """从请求中获取当前用户"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header[7:]
    payload = decode_token(token)
    if not payload:
        return None

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, username, name, email, college, role, status FROM users WHERE id = ?',
        (payload['user_id'],)
    )
    row = cursor.fetchone()
    conn.close()
    if not row or row['status'] != 'ACTIVE':
        return None
    return dict(row)


def require_auth(f):
    """登录鉴权装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return {'code': 40101, 'message': '未登录或登录已过期', 'data': None}, 401
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    """管理员权限装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return {'code': 40101, 'message': '未登录或登录已过期', 'data': None}, 401
        if user['role'] != 'ADMIN':
            return {'code': 40301, 'message': '无权限访问', 'data': None}, 403
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def login(username, password):
    """登录验证"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, username, password_hash, name, email, college, role, status FROM users WHERE username = ?',
        (username,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None
    if row['status'] != 'ACTIVE':
        return None
    if not check_password_hash(row['password_hash'], password):
        return None

    user = {
        'id': row['id'],
        'username': row['username'],
        'name': row['name'],
        'email': row['email'],
        'college': row['college'],
        'role': row['role'],
    }
    token = generate_token(row['id'], row['username'], row['role'])
    return {'user': user, 'token': token, 'role': row['role']}