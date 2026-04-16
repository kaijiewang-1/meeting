"""
预定服务层 - 包含冲突检测、规则校验、状态流转
"""
import uuid
from datetime import datetime, timedelta
from database import get_db
from config import Config
from services import room_service
from services.notification_service import notification_service

# ─── 冲突检测 ────────────────────────────────────────────────

def check_conflict(room_id, start_time, end_time, exclude_booking_id=None):
    """检查时间冲突（原子操作，加锁保证并发安全）"""
    conn = get_db()
    cursor = conn.cursor()
    ph = ','.join('?' * len(Config.OCCUPYING_BOOKING_STATUSES))
    sql = f'''
        SELECT id FROM bookings
        WHERE room_id = ?
          AND status IN ({ph})
          AND start_time < ?
          AND end_time > ?
    '''
    params = [room_id, *Config.OCCUPYING_BOOKING_STATUSES, end_time, start_time]
    if exclude_booking_id:
        sql += ' AND id != ?'
        params.append(exclude_booking_id)
    sql += ' LIMIT 1'
    cursor.execute(sql, params)
    conflict = cursor.fetchone()
    conn.close()
    return conflict is not None


def check_maintenance(room_id, start_time, end_time):
    """检查维护时段冲突"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id FROM room_maintenance
        WHERE room_id = ?
          AND start_time < ?
          AND end_time > ?
        LIMIT 1
    ''', (room_id, end_time, start_time))
    maintenance = cursor.fetchone()
    conn.close()
    return maintenance is not None


# ─── 规则校验 ────────────────────────────────────────────────

def get_rules():
    """获取当前规则"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM booking_rules LIMIT 1')
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}


def validate_booking(organizer_id, room_id, start_time_str, end_time_str, attendee_count):
    """
    规则校验，返回 (is_valid, error_code, error_message)
    """
    rules = get_rules()
    now = datetime.now()

    # 解析时间
    try:
        start_time = datetime.strptime(start_time_str, '%Y-%m-%dT%H:%M:%S')
    except ValueError:
        try:
            start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            start_time = datetime.strptime(start_time_str, '%Y-%m-%d')

    try:
        end_time = datetime.strptime(end_time_str, '%Y-%m-%dT%H:%M:%S')
    except ValueError:
        try:
            end_time = datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            end_time = datetime.strptime(end_time_str, '%Y-%m-%d') + timedelta(hours=1)

    # 1. 时间合法性
    if end_time <= start_time:
        return False, 40001, '结束时间必须晚于开始时间'
    if start_time < now:
        return False, 40001, '不能预定过去的时间'

    # 2. 提前天数
    max_advance = rules.get('max_advance_days', Config.MAX_ADVANCE_DAYS)
    if (start_time - now).days > max_advance:
        return False, 40001, f'最多只能提前 {max_advance} 天预定'

    # 3. 预定时长
    duration_minutes = int((end_time - start_time).total_seconds() / 60)
    min_dur = rules.get('min_duration_minutes', Config.MIN_DURATION_MINUTES)
    max_dur = rules.get('max_duration_minutes', Config.MAX_DURATION_MINUTES)
    if duration_minutes < min_dur:
        return False, 40001, f'预定时长不能少于 {min_dur} 分钟'
    if duration_minutes > max_dur:
        return False, 40001, f'预定时长不能超过 {max_dur} 分钟'

    # 4. 营业时间
    start_hour = rules.get('business_start_hour', Config.BUSINESS_START_HOUR)
    end_hour = rules.get('business_end_hour', Config.BUSINESS_END_HOUR)
    if start_time.hour < start_hour or end_time.hour > end_hour:
        return False, 40001, f'仅允许在 {start_hour}:00 - {end_hour}:00 预定'

    # 5. 容量
    room = _get_room(room_id)
    if not room:
        return False, 40401, '会议室不存在'
    if attendee_count > room['capacity']:
        return False, 40903, f'参会人数（{attendee_count}人）超过会议室容量（{room["capacity"]}人）'

    # 6. 会议室状态
    if room['status'] != Config.ROOM_STATUS_AVAILABLE:
        return False, 40902, '会议室当前不可预定'

    # 7. 冲突检测
    if check_conflict(room_id, start_time_str, end_time_str):
        return False, 40901, '该时间段已被其他会议预定'

    # 8. 维护检测
    if check_maintenance(room_id, start_time_str, end_time_str):
        return False, 40902, '该时间段处于维护中'

    return True, None, None


# ─── 预定 CRUD ────────────────────────────────────────────────

def create_booking(organizer_id, data):
    """创建预定（原子操作）"""
    subject = data['subject']
    room_id = int(data['roomId'])
    start_time = data['startTime']
    end_time = data['endTime']
    attendee_count = int(data.get('attendeeCount', 1))
    remark = data.get('remark', '')

    # 规则校验
    valid, err_code, err_msg = validate_booking(
        organizer_id, room_id, start_time, end_time, attendee_count
    )
    if not valid:
        return None, err_code, err_msg

    organizer = _get_user(organizer_id)
    room_row = _get_room(room_id)
    if not organizer or not room_row:
        return None, 40401, '用户或会议室不存在'
    if not room_service.user_may_access_room(organizer, room_row):
        return None, 40301, '无权预定该会议室'

    req_appr = int(room_row.get('requires_approval') or 0)
    initial_status = (
        Config.BOOKING_STATUS_PENDING_APPROVAL if req_appr else Config.BOOKING_STATUS_BOOKED
    )

    # 生成预定编号
    booking_no = f"BK{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO bookings
            (booking_no, subject, organizer_id, room_id, start_time, end_time,
             attendee_count, status, remark)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (booking_no, subject, organizer_id, room_id, start_time, end_time,
              attendee_count, initial_status, remark))
        booking_id = cursor.lastrowid
        conn.commit()
    finally:
        conn.close()

    return get_booking_by_id(booking_id), 0, '预定成功'


def get_booking_by_id(booking_id):
    """获取单个预定"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT b.*, r.name as room_name, u.name as organizer_name,
               a.name as approver_name
        FROM bookings b
        LEFT JOIN rooms r ON b.room_id = r.id
        LEFT JOIN users u ON b.organizer_id = u.id
        LEFT JOIN users a ON b.approved_by = a.id
        WHERE b.id = ?
    ''', (booking_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    b = dict(row)
    # 格式化时间
    for f in ['start_time', 'end_time', 'canceled_at', 'finished_at', 'created_at', 'updated_at', 'approved_at']:
        if b.get(f):
            b[f] = b[f].isoformat() if isinstance(b[f], datetime) else str(b[f])
    return b


def get_my_bookings(organizer_id, status_filter=None):
    """获取我的预定"""
    conn = get_db()
    cursor = conn.cursor()
    sql = '''
        SELECT b.*, r.name as room_name, a.name as approver_name
        FROM bookings b
        LEFT JOIN rooms r ON b.room_id = r.id
        LEFT JOIN users a ON b.approved_by = a.id
        WHERE b.organizer_id = ?
    '''
    params = [organizer_id]

    if status_filter == 'active':
        sql += " AND b.status IN ('PENDING_APPROVAL', 'BOOKED', 'CHECKED_IN', 'IN_USE')"
    elif status_filter:
        sql += ' AND b.status = ?'
        params.append(status_filter)

    sql += ' ORDER BY b.start_time DESC'
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()

    bookings = []
    for row in rows:
        b = dict(row)
        for f in ['start_time', 'end_time', 'canceled_at', 'finished_at', 'created_at', 'updated_at', 'approved_at']:
            if b.get(f):
                b[f] = b[f].isoformat() if isinstance(b[f], datetime) else str(b[f])
        bookings.append(b)
    return bookings


def get_all_bookings(filters=None):
    """获取所有预定（管理员）"""
    conn = get_db()
    cursor = conn.cursor()
    sql = '''
        SELECT b.*, r.name as room_name, u.name as organizer_name,
               a.name as approver_name
        FROM bookings b
        LEFT JOIN rooms r ON b.room_id = r.id
        LEFT JOIN users u ON b.organizer_id = u.id
        LEFT JOIN users a ON b.approved_by = a.id
        WHERE 1=1
    '''
    params = []

    if filters:
        if filters.get('status'):
            sql += ' AND b.status = ?'
            params.append(filters['status'])
        if filters.get('date_from'):
            sql += ' AND DATE(b.start_time) >= ?'
            params.append(filters['date_from'])
        if filters.get('date_to'):
            sql += ' AND DATE(b.start_time) <= ?'
            params.append(filters['date_to'])
        if filters.get('room_id'):
            sql += ' AND b.room_id = ?'
            params.append(filters['room_id'])

    sql += ' ORDER BY b.start_time DESC'
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()

    bookings = []
    for row in rows:
        b = dict(row)
        for f in ['start_time', 'end_time', 'canceled_at', 'finished_at', 'created_at', 'updated_at', 'approved_at']:
            if b.get(f):
                b[f] = b[f].isoformat() if isinstance(b[f], datetime) else str(b[f])
        bookings.append(b)
    return bookings


def cancel_booking(booking_id, user_id):
    """取消预定（仅预定人本人可操作）"""
    booking = get_booking_by_id(booking_id)
    if not booking:
        return None, 40401, '预定记录不存在'

    if booking['organizer_id'] != user_id:
        return None, 40301, '无权取消他人的预定'

    # 状态检查
    if booking['status'] in ['CANCELED', 'FINISHED', 'EXPIRED', 'REJECTED']:
        return None, 40001, f'当前状态（{booking["status"]}）不允许取消'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE bookings
        SET status = ?, canceled_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
    ''', (Config.BOOKING_STATUS_CANCELED, booking_id))
    conn.commit()
    conn.close()

    # 写操作日志
    _log_operation(user_id, 'CANCEL_BOOKING', 'booking', booking_id,
                  f'取消预定 {booking["booking_no"]}')

    # ========== 发送取消通知 ==========
    booking_data = {
        'room_name': booking.get('room_name', '会议室'),
        'start_time': booking.get('start_time'),
        'end_time': booking.get('end_time'),
        'subject': booking.get('subject')
    }
    notification_service.send_booking_canceled(
        booking_id, booking['organizer_id'], booking_data
    )
    # =================================

    return get_booking_by_id(booking_id), 0, '已取消预定'


def check_in_booking(booking_id, user_id):
    """签到"""
    booking = get_booking_by_id(booking_id)
    if not booking:
        return None, 40401, '预定记录不存在'
    if booking['organizer_id'] != user_id:
        return None, 40301, '无权签到他人的预定'
    if booking['status'] != Config.BOOKING_STATUS_BOOKED:
        return None, 40001, '当前状态不允许签到'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE bookings
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
    ''', (Config.BOOKING_STATUS_CHECKED_IN, booking_id))
    conn.commit()
    conn.close()

    _log_operation(user_id, 'CHECK_IN', 'booking', booking_id, f'签到预定 {booking["booking_no"]}')
    return get_booking_by_id(booking_id), 0, '签到成功'


# ─── 辅助函数 ────────────────────────────────────────────────

def _get_room(room_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM rooms WHERE id = ?', (room_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)


def _get_user(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, username, name, email, college_code, role, status FROM users WHERE id = ?',
        (user_id,),
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    u = dict(row)
    u['college_code'] = u.get('college_code') or ''
    return u


def approve_booking(booking_id, admin_id):
    """管理员通过待审批预定"""
    booking = get_booking_by_id(booking_id)
    if not booking:
        return None, 40401, '预定记录不存在'
    if booking['status'] != Config.BOOKING_STATUS_PENDING_APPROVAL:
        return None, 40001, '该预定不在待审批状态'

    actor = _get_user(admin_id)
    is_full_admin = actor and str(actor.get('role', '')).upper() == 'ADMIN'
    room = _get_room(booking['room_id'])
    if room and not is_full_admin:
        designated = room.get('approver_user_id')
        if designated is not None and str(designated).strip() != '' and int(designated) != int(admin_id):
            return None, 40301, '您不是该会议室指定的审批人'

    if check_conflict(
        booking['room_id'], booking['start_time'], booking['end_time'], exclude_booking_id=booking_id
    ):
        return None, 40901, '该时段已有其他有效预定，无法通过审批'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE bookings
        SET status = ?, approval_remark = NULL, approved_by = ?, approved_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
    ''', (Config.BOOKING_STATUS_BOOKED, admin_id, booking_id))
    conn.commit()
    conn.close()

    _log_operation(admin_id, 'APPROVE_BOOKING', 'booking', booking_id, f'通过预定 {booking["booking_no"]}')
    return get_booking_by_id(booking_id), 0, '审批通过'


def reject_booking(booking_id, admin_id, reason=''):
    """管理员拒绝待审批预定"""
    booking = get_booking_by_id(booking_id)
    if not booking:
        return None, 40401, '预定记录不存在'
    if booking['status'] != Config.BOOKING_STATUS_PENDING_APPROVAL:
        return None, 40001, '该预定不在待审批状态'

    actor = _get_user(admin_id)
    is_full_admin = actor and str(actor.get('role', '')).upper() == 'ADMIN'
    room = _get_room(booking['room_id'])
    if room and not is_full_admin:
        designated = room.get('approver_user_id')
        if designated is not None and str(designated).strip() != '' and int(designated) != int(admin_id):
            return None, 40301, '您不是该会议室指定的审批人'

    remark = (reason or '').strip()[:500]
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE bookings
        SET status = ?, approval_remark = ?, approved_by = ?, approved_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
    ''', (Config.BOOKING_STATUS_REJECTED, remark or None, admin_id, booking_id))
    conn.commit()
    conn.close()

    _log_operation(admin_id, 'REJECT_BOOKING', 'booking', booking_id, f'拒绝预定 {booking["booking_no"]}')
    return get_booking_by_id(booking_id), 0, '已拒绝'


def _log_operation(operator_id, action, target_type, target_id, detail):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO operation_logs (operator_id, action, target_type, target_id, detail)
        VALUES (?, ?, ?, ?, ?)
    ''', (operator_id, action, target_type, target_id, detail))
    conn.commit()
    conn.close()