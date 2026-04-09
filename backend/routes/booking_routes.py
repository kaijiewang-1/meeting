"""
预定接口路由
"""
from flask import Blueprint, request, jsonify, g
from auth import require_auth
from services import booking_service

bookings_bp = Blueprint('bookings', __name__, url_prefix='/api')


@bookings_bp.route('/bookings', methods=['POST'])
@require_auth
def create_booking():
    """创建预定"""
    data = request.get_json() or {}
    organizer_id = g.current_user['id']

    # 参数校验
    required = ['subject', 'roomId', 'startTime', 'endTime']
    for field in required:
        if not data.get(field):
            return jsonify({'code': 40001, 'message': f'缺少必填字段：{field}', 'data': None}), 200

    booking, err_code, err_msg = booking_service.create_booking(organizer_id, data)
    if not booking:
        return jsonify({'code': err_code, 'message': err_msg, 'data': None}), 200

    msg = (
        '已提交审批，请等待管理员确认'
        if booking.get('status') == 'PENDING_APPROVAL'
        else '预定成功'
    )
    return jsonify({'code': 0, 'message': msg, 'data': booking}), 200


@bookings_bp.route('/bookings/my', methods=['GET'])
@require_auth
def get_my_bookings():
    """获取我的预定"""
    organizer_id = g.current_user['id']
    status = request.args.get('status')
    bookings = booking_service.get_my_bookings(organizer_id, status)
    return jsonify({'code': 0, 'message': 'success', 'data': bookings, 'total': len(bookings)}), 200


@bookings_bp.route('/bookings/<int:booking_id>/cancel', methods=['POST'])
@require_auth
def cancel_booking(booking_id):
    """取消预定"""
    user_id = g.current_user['id']
    booking, err_code, err_msg = booking_service.cancel_booking(booking_id, user_id)
    if not booking:
        return jsonify({'code': err_code, 'message': err_msg, 'data': None}), 200
    return jsonify({'code': 0, 'message': '已取消预定', 'data': booking}), 200


@bookings_bp.route('/bookings/<int:booking_id>/check-in', methods=['POST'])
@require_auth
def check_in(booking_id):
    """签到"""
    user_id = g.current_user['id']
    booking, err_code, err_msg = booking_service.check_in_booking(booking_id, user_id)
    if not booking:
        return jsonify({'code': err_code, 'message': err_msg, 'data': None}), 200
    return jsonify({'code': 0, 'message': '签到成功', 'data': booking}), 200
