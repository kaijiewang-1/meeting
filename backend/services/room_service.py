"""
会议室服务层
"""
from database import get_db
from config import Config


def get_all_rooms(filters=None, user_college=None, is_admin=False):
    """获取所有会议室（支持筛选和可见性）"""
    conn = get_db()
    cursor = conn.cursor()

    sql = '''
        SELECT r.*, GROUP_CONCAT(rf.facility_code) as facilities
        FROM rooms r
        LEFT JOIN room_facilities rf ON r.id = rf.room_id
        WHERE 1=1
    '''
    params = []

    # 非管理员：只能看到自己学院可见的会议室
    # 管理员：可以看到所有会议室（用于管理）
    if not is_admin and user_college:
        sql += ' AND (r.visible_colleges = "" OR r.visible_colleges = ? OR r.visible_colleges LIKE ? OR r.visible_colleges LIKE ? OR r.visible_colleges = ?)'
        params.append('')
        params.append(user_college)
        params.append(f'{user_college},%')
        params.append('%,' + user_college)
        params.append(user_college)

    if filters:
        if filters.get('building'):
            sql += ' AND r.building = ?'
            params.append(filters['building'])
        if filters.get('floor'):
            sql += ' AND r.floor = ?'
            params.append(filters['floor'])
        if filters.get('capacity'):
            sql += ' AND r.capacity >= ?'
            params.append(int(filters['capacity']))
        if filters.get('status'):
            sql += ' AND r.status = ?'
            params.append(filters['status'])

    sql += ' GROUP BY r.id ORDER BY r.building, r.floor, r.name'
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()

    rooms = []
    for row in rows:
        r = dict(row)
        r['facilities'] = r['facilities'].split(',') if r['facilities'] else []
        if r['facilities'] == ['']:
            r['facilities'] = []
        rooms.append(r)
    return rooms


def get_room_by_id(room_id):
    """获取单个会议室详情"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT r.*, GROUP_CONCAT(rf.facility_code) as facilities
        FROM rooms r
        LEFT JOIN room_facilities rf ON r.id = rf.room_id
        WHERE r.id = ?
        GROUP BY r.id
    ''', (room_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None
    r = dict(row)
    r['facilities'] = r['facilities'].split(',') if r['facilities'] and r['facilities'] != '' else []
    return r


def get_available_rooms(filters=None, user_college=None, is_admin=False):
    """获取可用会议室（排除冲突和维护）"""
    conn = get_db()
    cursor = conn.cursor()

    # 构建基础查询
    sql = '''
        SELECT r.*, GROUP_CONCAT(rf.facility_code) as facilities
        FROM rooms r
        LEFT JOIN room_facilities rf ON r.id = rf.room_id
        WHERE r.status = ?
    '''
    params = [Config.ROOM_STATUS_AVAILABLE]

    # 非管理员：只能看到自己学院可见的会议室
    if not is_admin and user_college:
        sql += ' AND (r.visible_colleges = "" OR r.visible_colleges = ? OR r.visible_colleges LIKE ? OR r.visible_colleges LIKE ? OR r.visible_colleges = ?)'
        params.append('')
        params.append(user_college)
        params.append(f'{user_college},%')
        params.append('%,' + user_college)
        params.append(user_college)

    if filters:
        if filters.get('building'):
            sql += ' AND r.building = ?'
            params.append(filters['building'])
        if filters.get('floor'):
            sql += ' AND r.floor = ?'
            params.append(filters['floor'])
        if filters.get('capacity'):
            sql += ' AND r.capacity >= ?'
            params.append(int(filters['capacity']))
        if filters.get('facilities'):
            for fac in filters['facilities']:
                sql += ' AND r.id IN (SELECT room_id FROM room_facilities WHERE facility_code = ?)'
                params.append(fac)

    sql += ' GROUP BY r.id ORDER BY r.capacity DESC'

    cursor.execute(sql, params)
    rows = cursor.fetchall()

    # 排除有时间冲突的会议室
    available = []
    for row in rows:
        r = dict(row)
        r['facilities'] = r['facilities'].split(',') if r['facilities'] and r['facilities'] != '' else []
        if r['facilities'] == ['']:
            r['facilities'] = []

        if filters and filters.get('date') and filters.get('start') and filters.get('end'):
            if is_room_conflicted(room_id=r['id'], start=filters['start'], end=filters['end'], date=filters['date']):
                continue
            if is_room_in_maintenance(room_id=r['id'], date=filters['date'], start=filters['start'], end=filters['end']):
                continue

        available.append(r)

    conn.close()
    return available


def is_room_conflicted(room_id, date, start, end):
    """检查会议室在指定时间段是否有冲突"""
    conn = get_db()
    cursor = conn.cursor()
    start_dt = f'{date} {start}:00'
    end_dt = f'{date} {end}:00'
    cursor.execute('''
        SELECT id FROM bookings
        WHERE room_id = ?
          AND status IN (?, ?, ?)
          AND start_time < ?
          AND end_time > ?
        LIMIT 1
    ''', (room_id, Config.BOOKING_STATUS_BOOKED, Config.BOOKING_STATUS_CHECKED_IN,
          Config.BOOKING_STATUS_IN_USE, end_dt, start_dt))
    conflict = cursor.fetchone()
    conn.close()
    return conflict is not None


def is_room_in_maintenance(room_id, date, start, end):
    """检查会议室在指定时间段是否在维护中"""
    conn = get_db()
    cursor = conn.cursor()
    start_dt = f'{date} {start}:00'
    end_dt = f'{date} {end}:00'
    cursor.execute('''
        SELECT id FROM room_maintenance
        WHERE room_id = ?
          AND start_time < ?
          AND end_time > ?
        LIMIT 1
    ''', (room_id, end_dt, start_dt))
    maintenance = cursor.fetchone()
    conn.close()
    return maintenance is not None


def get_room_schedule(room_id, date):
    """获取会议室某天的预定排期"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT b.*, u.name as organizer_name
        FROM bookings b
        LEFT JOIN users u ON b.organizer_id = u.id
        WHERE b.room_id = ?
          AND DATE(b.start_time) = ?
          AND b.status NOT IN (?, ?)
        ORDER BY b.start_time
    ''', (room_id, date, Config.BOOKING_STATUS_CANCELED, Config.BOOKING_STATUS_EXPIRED))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def create_room(data):
    """创建会议室"""
    conn = get_db()
    cursor = conn.cursor()
    
    # 处理可见学院
    visible_colleges = ','.join(data.get('visible_colleges', [])) if data.get('visible_colleges') else ''
    
    cursor.execute('''
        INSERT INTO rooms (name, building, floor, capacity, status, need_approval, visible_colleges, description, open_hours, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['name'], data['building'], data['floor'],
        int(data['capacity']), data.get('status', 'AVAILABLE'),
        int(data.get('need_approval', 1)), visible_colleges,
        data.get('description', ''), data.get('open_hours', '08:00-22:00'),
        data.get('image', '🏢')
    ))
    room_id = cursor.lastrowid

    # 插入设备
    facilities = data.get('facilities', [])
    for fac in facilities:
        cursor.execute('INSERT INTO room_facilities (room_id, facility_code) VALUES (?, ?)', (room_id, fac))

    conn.commit()
    conn.close()
    return get_room_by_id(room_id)


def update_room(room_id, data):
    """更新会议室"""
    conn = get_db()
    cursor = conn.cursor()

    updates = []
    params = []
    
    # 可更新的字段列表
    updatable_fields = ['name', 'building', 'floor', 'capacity', 'status', 
                        'need_approval', 'description', 'open_hours', 'image']
    
    for field in updatable_fields:
        if field in data:
            updates.append(f'{field} = ?')
            params.append(data[field])
    
    # 处理可见学院
    if 'visible_colleges' in data:
        visible_colleges = ','.join(data['visible_colleges']) if data['visible_colleges'] else ''
        updates.append('visible_colleges = ?')
        params.append(visible_colleges)

    if updates:
        updates.append('updated_at = datetime("now")')
        params.append(room_id)
        cursor.execute(f'UPDATE rooms SET {", ".join(updates)} WHERE id = ?', params)

    # 更新设备列表
    if 'facilities' in data:
        cursor.execute('DELETE FROM room_facilities WHERE room_id = ?', (room_id,))
        for fac in data['facilities']:
            cursor.execute('INSERT INTO room_facilities (room_id, facility_code) VALUES (?, ?)', (room_id, fac))

    conn.commit()
    conn.close()
    return get_room_by_id(room_id)


def delete_room(room_id):
    """删除会议室"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM rooms WHERE id = ?', (room_id,))
    conn.commit()
    conn.close()


def update_room_status(room_id, status):
    """更新会议室状态"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE rooms SET status = ?, updated_at = datetime("now") WHERE id = ?',
        (status, room_id)
    )
    conn.commit()
    conn.close()


def get_room_need_approval(room_id):
    """获取会议室是否需要审批"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT need_approval FROM rooms WHERE id = ?', (room_id,))
    row = cursor.fetchone()
    conn.close()
    return row['need_approval'] == 1 if row else True