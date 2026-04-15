"""
会议室接口路由
"""
from flask import Blueprint, request, jsonify, g
from auth import require_auth
from services import room_service

rooms_bp = Blueprint('rooms', __name__, url_prefix='/api')


@rooms_bp.route('/rooms/available', methods=['GET'])
@require_auth
def get_available():
    """查询可用会议室"""
    facilities = request.args.getlist('facilities')

    filters = {
        'date': request.args.get('date'),
        'start': request.args.get('startTime'),
        'end': request.args.get('endTime'),
        'capacity': request.args.get('capacity'),
        'building': request.args.get('building'),
        'floor': request.args.get('floor'),
        'facilities': facilities if facilities else None,
    }
    rooms = room_service.get_available_rooms(filters, for_user=g.current_user)
    return jsonify({'code': 0, 'message': 'success', 'data': rooms, 'total': len(rooms)}), 200


@rooms_bp.route('/rooms', methods=['GET'])
@require_auth
def get_rooms():
    """获取所有会议室"""
    facilities = request.args.getlist('facilities')
    filters = {
        'building': request.args.get('building'),
        'floor': request.args.get('floor'),
        'capacity': request.args.get('capacity'),
        'status': request.args.get('status'),
        'date': request.args.get('date'),
        'start': request.args.get('startTime'),
        'end': request.args.get('endTime'),
        'facilities': facilities if facilities else None,
    }
    rooms = room_service.get_all_rooms(
        {k: v for k, v in filters.items() if v is not None and v != ''},
        for_user=g.current_user,
    )
    return jsonify({'code': 0, 'message': 'success', 'data': rooms, 'total': len(rooms)}), 200


@rooms_bp.route('/rooms/<int:room_id>', methods=['GET'])
@require_auth
def get_room(room_id):
    """获取会议室详情"""
    room = room_service.get_room_by_id(room_id, for_user=g.current_user)
    if not room:
        return jsonify({'code': 40401, 'message': '会议室不存在', 'data': None}), 200
    return jsonify({'code': 0, 'message': 'success', 'data': room}), 200


@rooms_bp.route('/rooms/<int:room_id>/schedule', methods=['GET'])
@require_auth
def get_schedule(room_id):
    """获取会议室排期"""
    date = request.args.get('date')
    if not date:
        from datetime import date as dt
        date = dt.today().isoformat()
    room = room_service.get_room_by_id(room_id, for_user=g.current_user)
    if not room:
        return jsonify({'code': 40401, 'message': '会议室不存在', 'data': None}), 200
    bookings = room_service.get_room_schedule(room_id, date)
    return jsonify({'code': 0, 'message': 'success', 'data': bookings}), 200