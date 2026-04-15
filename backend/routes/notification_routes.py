"""
通知接口路由
"""
from flask import Blueprint, request, jsonify, g
from auth import require_auth
from services.notification_service import notification_service

notification_bp = Blueprint('notification', __name__, url_prefix='/api/notifications')


@notification_bp.route('', methods=['GET'])
@require_auth
def get_notifications():
    """获取我的通知列表"""
    user_id = g.current_user['id']
    limit = request.args.get('limit', 20, type=int)
    offset = request.args.get('offset', 0, type=int)
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    
    notifications = notification_service.get_user_notifications(
        user_id, limit, offset, unread_only
    )
    return jsonify({'code': 0, 'data': notifications}), 200


@notification_bp.route('/unread-count', methods=['GET'])
@require_auth
def get_unread_count():
    """获取未读通知数量"""
    user_id = g.current_user['id']
    count = notification_service.get_unread_count(user_id)
    return jsonify({'code': 0, 'data': {'count': count}}), 200


@notification_bp.route('/<int:notification_id>/read', methods=['POST'])
@require_auth
def mark_as_read(notification_id):
    """标记通知为已读"""
    user_id = g.current_user['id']
    success = notification_service.mark_as_read(notification_id, user_id)
    if success:
        return jsonify({'code': 0, 'message': '已标记为已读'}), 200
    return jsonify({'code': 40001, 'message': '操作失败'}), 200


@notification_bp.route('/read-all', methods=['POST'])
@require_auth
def mark_all_as_read():
    """标记所有通知为已读"""
    user_id = g.current_user['id']
    success = notification_service.mark_all_as_read(user_id)
    if success:
        return jsonify({'code': 0, 'message': '已全部标记为已读'}), 200
    return jsonify({'code': 40001, 'message': '操作失败'}), 200


@notification_bp.route('/<int:notification_id>', methods=['DELETE'])
@require_auth
def delete_notification(notification_id):
    """删除通知"""
    user_id = g.current_user['id']
    success = notification_service.delete_notification(notification_id, user_id)
    if success:
        return jsonify({'code': 0, 'message': '删除成功'}), 200
    return jsonify({'code': 40001, 'message': '删除失败'}), 200