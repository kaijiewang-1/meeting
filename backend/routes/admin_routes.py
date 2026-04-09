"""
管理端接口路由
"""
from flask import Blueprint, request, jsonify, g
from auth import require_admin
from services import room_service, booking_service, stats_service

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


# ─── 会议室管理 ────────────────────────────────────────────

@admin_bp.route('/rooms', methods=['GET'])
@require_admin
def admin_get_rooms():
    """获取所有会议室（管理员）"""
    rooms = room_service.get_all_rooms()
    return jsonify({'code': 0, 'message': 'success', 'data': rooms, 'total': len(rooms)}), 200


@admin_bp.route('/rooms', methods=['POST'])
@require_admin
def admin_create_room():
    """新增会议室"""
    data = request.get_json() or {}
    required = ['name', 'building', 'floor', 'capacity']
    for field in required:
        if not data.get(field):
            return jsonify({'code': 40001, 'message': f'缺少必填字段：{field}', 'data': None}), 200

    room = room_service.create_room(data)
    return jsonify({'code': 0, 'message': '创建成功', 'data': room}), 200


@admin_bp.route('/rooms/<int:room_id>', methods=['PUT'])
@require_admin
def admin_update_room(room_id):
    """更新会议室"""
    data = request.get_json() or {}
    room = room_service.update_room(room_id, data)
    if not room:
        return jsonify({'code': 40401, 'message': '会议室不存在', 'data': None}), 200
    return jsonify({'code': 0, 'message': '更新成功', 'data': room}), 200


@admin_bp.route('/rooms/<int:room_id>', methods=['DELETE'])
@require_admin
def admin_delete_room(room_id):
    """删除会议室"""
    room_service.delete_room(room_id)
    return jsonify({'code': 0, 'message': '删除成功', 'data': None}), 200


# ─── 预定管理 ────────────────────────────────────────────

@admin_bp.route('/bookings', methods=['GET'])
@require_admin
def admin_get_bookings():
    """获取所有预定（管理员）"""
    filters = {
        'status': request.args.get('status'),
        'date_from': request.args.get('date_from'),
        'date_to': request.args.get('date_to'),
        'room_id': request.args.get('room_id'),
    }
    filters = {k: v for k, v in filters.items() if v}
    bookings = booking_service.get_all_bookings(filters)
    return jsonify({'code': 0, 'message': 'success', 'data': bookings, 'total': len(bookings)}), 200


@admin_bp.route('/bookings/<int:booking_id>/approve', methods=['POST'])
@require_admin
def admin_approve_booking(booking_id):
    """管理员通过待审批预定"""
    admin_id = g.current_user['id']
    booking, err_code, err_msg = booking_service.approve_booking(booking_id, admin_id)
    if not booking:
        return jsonify({'code': err_code, 'message': err_msg, 'data': None}), 200
    return jsonify({'code': 0, 'message': err_msg, 'data': booking}), 200


@admin_bp.route('/bookings/<int:booking_id>/reject', methods=['POST'])
@require_admin
def admin_reject_booking(booking_id):
    """管理员拒绝待审批预定"""
    admin_id = g.current_user['id']
    data = request.get_json() or {}
    reason = (data.get('reason') or data.get('remark') or '').strip()
    booking, err_code, err_msg = booking_service.reject_booking(booking_id, admin_id, reason)
    if not booking:
        return jsonify({'code': err_code, 'message': err_msg, 'data': None}), 200
    return jsonify({'code': 0, 'message': err_msg, 'data': booking}), 200


# ─── 统计数据 ────────────────────────────────────────────

@admin_bp.route('/stats', methods=['GET'])
@require_admin
def get_stats():
    """获取统计数据"""
    basic = stats_service.get_stats()
    weekly = stats_service.get_weekly_stats()
    buildings = stats_service.get_building_stats()
    rooms_usage = stats_service.get_room_usage_ranking()

    return jsonify({
        'code': 0, 'message': 'success',
        'data': {
            **basic,
            'weeklyData': weekly,
            'buildingData': buildings,
            'roomsUsage': rooms_usage,
        }
    }), 200
