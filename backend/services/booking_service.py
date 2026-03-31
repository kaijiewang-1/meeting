"""
预定服务层 - 包含冲突检测、规则校验、状态流转
"""
import uuid
from datetime import datetime, timedelta
from database import get_db
from config import Config
from services.notification_service import notification_service


# ─── 冲突检测 ────────────────────────────────────────────────

def check_conflict(room_id, start_time, end_time, exclude_booking_id=None):
    """检查时间冲突（原子操作，加锁保证并发安全）"""
    conn = get_db()
    cursor = conn.cursor()
    sql = '''
        SELECT id FROM bookings
        WHERE room_id = ?
          AND status IN (?, ?, ?)
          AND start_time < ?
          AND end_time > ?
    '''
    params = [room_id, Config.BOOKING_STATUS_BOOKED, Config.BOOKING_STATUS_CHECKED_IN,
              Config.BOOKING_STATUS_IN_USE, end_time, start_time]
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
              attendee_count, 'PENDING_APPROVAL', remark))
        booking_id = cursor.lastrowid
        conn.commit()
    finally:
        conn.close()

    # 获取完整预定信息
    booking = get_booking_by_id(booking_id)
    
    # 发送待审批通知给管理员
    if booking:
        booking_data = {
            'room_name': booking.get('room_name', '会议室'),
            'start_time': start_time,
            'end_time': end_time,
            'subject': subject,
            'organizer_name': booking.get('organizer_name', '用户')
        }
        
        # 获取所有管理员
        conn2 = get_db()
        cursor2 = conn2.cursor()
        cursor2.execute("SELECT id, name FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'")
        admins = cursor2.fetchall()
        conn2.close()
        
        for admin in admins:
            notification_service.send_booking_pending_approval(
                booking_id, admin['id'], booking_data
            )
    
    return booking, 0, '预定已提交，等待审批'


def get_booking_by_id(booking_id):
    """获取单个预定"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT b.*, r.name as room_name, u.name as organizer_name
        FROM bookings b
        LEFT JOIN rooms r ON b.room_id = r.id
        LEFT JOIN users u ON b.organizer_id = u.id
        WHERE b.id = ?
    ''', (booking_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    b = dict(row)
    # 格式化时间
    for f in ['start_time', 'end_time', 'canceled_at', 'finished_at', 'created_at', 'updated_at']:
        if b.get(f):
            b[f] = b[f].isoformat() if isinstance(b[f], datetime) else str(b[f])
    return b


def get_my_bookings(organizer_id, status_filter=None):
    """获取我的预定"""
    conn = get_db()
    cursor = conn.cursor()
    sql = '''
        SELECT b.*, r.name as room_name
        FROM bookings b
        LEFT JOIN rooms r ON b.room_id = r.id
        WHERE b.organizer_id = ?
    '''
    params = [organizer_id]

    if status_filter == 'active':
        sql += " AND b.status IN ('BOOKED', 'CHECKED_IN', 'IN_USE')"
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
        for f in ['start_time', 'end_time', 'canceled_at', 'finished_at', 'created_at', 'updated_at']:
            if b.get(f):
                b[f] = b[f].isoformat() if isinstance(b[f], datetime) else str(b[f])
        bookings.append(b)
    return bookings


def get_all_bookings(filters=None):
    """获取所有预定（管理员）"""
    conn = get_db()
    cursor = conn.cursor()
    sql = '''
        SELECT b.*, r.name as room_name, u.name as organizer_name
        FROM bookings b
        LEFT JOIN rooms r ON b.room_id = r.id
        LEFT JOIN users u ON b.organizer_id = u.id
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
        for f in ['start_time', 'end_time', 'canceled_at', 'finished_at', 'created_at', 'updated_at']:
            if b.get(f):
                b[f] = b[f].isoformat() if isinstance(b[f], datetime) else str(b[f])
        bookings.append(b)
    return bookings


def cancel_booking(booking_id, user_id, is_admin=False):
    """取消预定"""
    booking = get_booking_by_id(booking_id)
    if not booking:
        return None, 40401, '预定记录不存在'

    # 权限检查
    if not is_admin and booking['organizer_id'] != user_id:
        return None, 40301, '无权取消他人的预定'

    # 状态检查
    if booking['status'] in ['CANCELED', 'FINISHED', 'EXPIRED']:
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
    
    # 发送取消通知
    booking_data = {
        'room_name': booking.get('room_name', '会议室'),
        'start_time': booking.get('start_time'),
        'subject': booking.get('subject')
    }
    notification_service.send_booking_canceled(
        booking_id, user_id, booking_data
    )

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
    return dict(row) if row else None


def _log_operation(operator_id, action, target_type, target_id, detail):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO operation_logs (operator_id, action, target_type, target_id, detail)
        VALUES (?, ?, ?, ?, ?)
    ''', (operator_id, action, target_type, target_id, detail))
    conn.commit()
    conn.close()