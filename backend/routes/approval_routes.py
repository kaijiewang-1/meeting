"""
审批接口路由
"""
from flask import Blueprint, request, jsonify, g
from auth import require_auth, require_admin
from database import get_db
from datetime import datetime
from services.notification_service import notification_service

approval_bp = Blueprint('approval', __name__, url_prefix='/api/approvals')


@approval_bp.route('/pending', methods=['GET'])
@require_auth
@require_admin
def get_pending_approvals():
    """获取待审批列表（管理员）"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT b.*, r.name as room_name, u.name as organizer_name
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN users u ON b.organizer_id = u.id
        WHERE b.status = 'PENDING_APPROVAL'
        ORDER BY b.created_at DESC
    ''')
    rows = cursor.fetchall()
    conn.close()
    
    bookings = []
    for row in rows:
        b = dict(row)
        # 格式化时间
        for f in ['start_time', 'end_time', 'created_at', 'updated_at']:
            if b.get(f):
                b[f] = b[f].isoformat() if hasattr(b[f], 'isoformat') else str(b[f])
        bookings.append(b)
    
    return jsonify({'code': 0, 'data': bookings}), 200


@approval_bp.route('/<int:booking_id>/approve', methods=['POST'])
@require_auth
@require_admin
def approve_booking(booking_id):
    """审批通过"""
    conn = get_db()
    cursor = conn.cursor()
    
    # 获取预定信息
    cursor.execute('''
        SELECT b.*, r.name as room_name, u.name as organizer_name, u.id as organizer_id
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN users u ON b.organizer_id = u.id
        WHERE b.id = ?
    ''', (booking_id,))
    booking = cursor.fetchone()
    
    if not booking:
        conn.close()
        return jsonify({'code': 40401, 'message': '预定不存在'}), 200
    
    if booking['status'] != 'PENDING_APPROVAL':
        conn.close()
        return jsonify({'code': 40001, 'message': '当前状态无法审批'}), 200
    
    # 更新状态为已确认
    cursor.execute('''
        UPDATE bookings 
        SET status = 'BOOKED', updated_at = datetime('now')
        WHERE id = ?
    ''', (booking_id,))
    conn.commit()
    conn.close()
    
    # 发送审批通过通知
    booking_data = {
        'room_name': booking['room_name'],
        'start_time': booking['start_time'],
        'end_time': booking['end_time'],
        'subject': booking['subject']
    }
    notification_service.send_booking_confirmed(
        booking_id, booking['organizer_id'], booking_data
    )
    
    return jsonify({'code': 0, 'message': '审批通过，已通知预定人'}), 200


@approval_bp.route('/<int:booking_id>/reject', methods=['POST'])
@require_auth
@require_admin
def reject_booking(booking_id):
    """审批拒绝"""
    data = request.get_json() or {}
    reason = data.get('reason', '未说明原因')
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 获取预定信息
    cursor.execute('''
        SELECT b.*, r.name as room_name, u.name as organizer_name, u.id as organizer_id
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN users u ON b.organizer_id = u.id
        WHERE b.id = ?
    ''', (booking_id,))
    booking = cursor.fetchone()
    
    if not booking:
        conn.close()
        return jsonify({'code': 40401, 'message': '预定不存在'}), 200
    
    if booking['status'] != 'PENDING_APPROVAL':
        conn.close()
        return jsonify({'code': 40001, 'message': '当前状态无法审批'}), 200
    
    # 更新状态为拒绝
    cursor.execute('''
        UPDATE bookings 
        SET status = 'REJECTED', remark = ?, updated_at = datetime('now')
        WHERE id = ?
    ''', (reason, booking_id))
    conn.commit()
    conn.close()
    
    # 发送拒绝通知
    booking_data = {
        'room_name': booking['room_name'],
        'start_time': booking['start_time'],
        'end_time': booking['end_time'],
        'subject': booking['subject']
    }
    notification_service.send_booking_rejected(
        booking_id, booking['organizer_id'], booking_data, reason
    )
    
    return jsonify({'code': 0, 'message': '已拒绝，通知已发送'}), 200


@approval_bp.route('/statistics', methods=['GET'])
@require_auth
@require_admin
def get_approval_statistics():
    """获取审批统计（管理员）"""
    conn = get_db()
    cursor = conn.cursor()
    
    # 待审批数量
    cursor.execute("SELECT COUNT(*) FROM bookings WHERE status = 'PENDING_APPROVAL'")
    pending = cursor.fetchone()[0]
    
    # 今日审批数量
    today = datetime.now().strftime('%Y-%m-%d')
    cursor.execute('''
        SELECT COUNT(*) FROM bookings 
        WHERE status IN ('BOOKED', 'REJECTED') 
        AND DATE(updated_at) = ?
    ''', (today,))
    today_count = cursor.fetchone()[0]
    
    # 本月审批数量
    cursor.execute('''
        SELECT COUNT(*) FROM bookings 
        WHERE status IN ('BOOKED', 'REJECTED') 
        AND strftime('%Y-%m', updated_at) = strftime('%Y-%m', 'now')
    ''')
    month_count = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'code': 0,
        'data': {
            'pending': pending,
            'today': today_count,
            'month': month_count
        }
    }), 200