"""
会议室服务层
"""
from database import get_db
from config import Config


<<<<<<< HEAD
def get_visible_college_codes(room_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT college_code FROM room_visible_colleges WHERE room_id = ? ORDER BY college_code',
        (room_id,),
    )
    rows = [r[0] for r in cursor.fetchall()]
    conn.close()
    return rows


def user_may_access_room(user, room_dict):
    """普通用户是否可见/可预定该会议室；admin 或未登录校验由调用方处理。"""
    if not user or not room_dict:
        return False
    if user.get('role') == 'ADMIN':
        return True
    scope = (room_dict.get('visibility_scope') or Config.ROOM_VISIBILITY_ALL).upper()
    if scope != Config.ROOM_VISIBILITY_COLLEGES:
        return True
    codes = room_dict.get('visible_colleges')
    if codes is None:
        codes = get_visible_college_codes(room_dict['id'])
    if not codes:
        return False
    cc = (user.get('college_code') or '').strip()
    if not cc:
        return False
    return cc in codes


def _enrich_room(row_dict):
    r = dict(row_dict)
    scope = (r.get('visibility_scope') or Config.ROOM_VISIBILITY_ALL).upper()
    if scope == Config.ROOM_VISIBILITY_COLLEGES:
        r['visible_colleges'] = get_visible_college_codes(r['id'])
    else:
        r['visible_colleges'] = []
    return r


def get_all_rooms(filters=None, for_user=None):
    """获取所有会议室（支持筛选）"""
=======
def get_all_rooms(filters=None, user_college=None, is_admin=False):
    """获取所有会议室（支持筛选和可见性）"""
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed
    conn = get_db()
    cursor = conn.cursor()

    sql = '''
        SELECT r.*, GROUP_CONCAT(rf.facility_code) as facilities,
               MAX(ap.name) as approver_name
        FROM rooms r
        LEFT JOIN room_facilities rf ON r.id = rf.room_id
        LEFT JOIN users ap ON r.approver_user_id = ap.id
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
        if filters.get('facilities'):
            for fac in filters['facilities']:
                sql += ' AND r.id IN (SELECT room_id FROM room_facilities WHERE facility_code = ?)'
                params.append(fac)

    sql += ' GROUP BY r.id ORDER BY r.building, r.floor, r.name'
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()

    rooms = []
    for row in rows:
        r = _enrich_room(row)
        r['facilities'] = r['facilities'].split(',') if r['facilities'] else []
        if r['facilities'] == ['']:
            r['facilities'] = []
        rooms.append(r)

    if for_user is not None and for_user.get('role') != 'ADMIN':
        rooms = [r for r in rooms if user_may_access_room(for_user, r)]

    if filters and filters.get('date') and filters.get('start') and filters.get('end'):
        slot = []
        for r in rooms:
            if is_room_conflicted(r['id'], filters['date'], filters['start'], filters['end']):
                continue
            if is_room_in_maintenance(r['id'], filters['date'], filters['start'], filters['end']):
                continue
            slot.append(r)
        rooms = slot

    return rooms


def get_room_by_id(room_id, for_user=None):
    """获取单个会议室详情；for_user 非管理员时按学院可见性过滤，无权限返回 None。"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT r.*, GROUP_CONCAT(rf.facility_code) as facilities,
               MAX(ap.name) as approver_name
        FROM rooms r
        LEFT JOIN room_facilities rf ON r.id = rf.room_id
        LEFT JOIN users ap ON r.approver_user_id = ap.id
        WHERE r.id = ?
        GROUP BY r.id
    ''', (room_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None
    r = _enrich_room(row)
    r['facilities'] = r['facilities'].split(',') if r['facilities'] and r['facilities'] != '' else []
    if for_user is not None and not user_may_access_room(for_user, r):
        return None
    return r


<<<<<<< HEAD
def get_available_rooms(filters=None, for_user=None):
=======
def get_available_rooms(filters=None, user_college=None, is_admin=False):
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed
    """获取可用会议室（排除冲突和维护）"""
    conn = get_db()
    cursor = conn.cursor()

    # 构建基础查询
    sql = '''
        SELECT r.*, GROUP_CONCAT(rf.facility_code) as facilities,
               MAX(ap.name) as approver_name
        FROM rooms r
        LEFT JOIN room_facilities rf ON r.id = rf.room_id
        LEFT JOIN users ap ON r.approver_user_id = ap.id
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
        r = _enrich_room(row)
        r['facilities'] = r['facilities'].split(',') if r['facilities'] and r['facilities'] != '' else []
        if r['facilities'] == ['']:
            r['facilities'] = []

        if for_user is not None and for_user.get('role') != 'ADMIN':
            if not user_may_access_room(for_user, r):
                continue

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
    start_dt = f'{date}T{start}:00'
    end_dt = f'{date}T{end}:00'
    ph = ','.join('?' * len(Config.OCCUPYING_BOOKING_STATUSES))
    cursor.execute(f'''
        SELECT id FROM bookings
        WHERE room_id = ?
          AND status IN ({ph})
          AND start_time < ?
          AND end_time > ?
        LIMIT 1
    ''', (room_id, *Config.OCCUPYING_BOOKING_STATUSES, end_dt, start_dt))
    conflict = cursor.fetchone()
    conn.close()
    return conflict is not None


def is_room_in_maintenance(room_id, date, start, end):
    """检查会议室在指定时间段是否在维护中"""
    conn = get_db()
    cursor = conn.cursor()
    start_dt = f'{date}T{start}:00'
    end_dt = f'{date}T{end}:00'
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
          AND b.status NOT IN (?, ?, ?)
        ORDER BY b.start_time
    ''', (room_id, date, Config.BOOKING_STATUS_CANCELED, Config.BOOKING_STATUS_EXPIRED,
          Config.BOOKING_STATUS_REJECTED))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def create_room(data):
    """创建会议室"""
    conn = get_db()
    cursor = conn.cursor()
<<<<<<< HEAD
    req_appr = 1 if int(data.get('requires_approval') or 0) else 0
    vis_scope = data.get('visibility_scope') or data.get('visibilityScope') or Config.ROOM_VISIBILITY_ALL
    if vis_scope not in (Config.ROOM_VISIBILITY_ALL, Config.ROOM_VISIBILITY_COLLEGES):
        vis_scope = Config.ROOM_VISIBILITY_ALL
    appr_raw = data.get('approver_user_id') if 'approver_user_id' in data else data.get('approverUserId')
    if appr_raw in (None, '', 0, '0'):
        approver_user_id = None
    else:
        approver_user_id = int(appr_raw)
    cursor.execute('''
        INSERT INTO rooms (name, building, floor, capacity, status, description, open_hours,
                           weekday_open_hours, weekend_open_hours, image,
                           requires_approval, approver_user_id, visibility_scope)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['name'], data['building'], data['floor'],
        int(data['capacity']), data.get('status', 'AVAILABLE'),
        data.get('description', ''),
        data.get('open_hours', '08:00-22:00'),
        data.get('weekday_open_hours') or data.get('weekdayOpenHours') or data.get('open_hours', '08:00-18:00'),
        data.get('weekend_open_hours') or data.get('weekendOpenHours') or '09:00-17:00',
        data.get('image', '🏢'), req_appr, approver_user_id, vis_scope,
=======
    
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
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed
    ))
    room_id = cursor.lastrowid

    # 插入设备
    facilities = data.get('facilities', [])
    for fac in facilities:
        cursor.execute('INSERT INTO room_facilities (room_id, facility_code) VALUES (?, ?)', (room_id, fac))

    vcols = data.get('visible_colleges') or data.get('visibleColleges')
    if vis_scope == Config.ROOM_VISIBILITY_COLLEGES and vcols:
        for cc in vcols:
            code = (cc or '').strip()
            if code:
                cursor.execute(
                    'INSERT OR IGNORE INTO room_visible_colleges (room_id, college_code) VALUES (?, ?)',
                    (room_id, code),
                )

    conn.commit()
    conn.close()
    return get_room_by_id(room_id)


def update_room(room_id, data):
    """更新会议室"""
    conn = get_db()
    cursor = conn.cursor()

    updates = []
    params = []
<<<<<<< HEAD
    for field in ['name', 'building', 'floor', 'capacity', 'status', 'description', 'open_hours',
                  'weekday_open_hours', 'weekend_open_hours', 'image']:
        if field in data:
            updates.append(f'{field} = ?')
            params.append(data[field])
        elif field.replace('_', '') in [k.replace('_', '') for k in data.keys() if isinstance(k, str)]:  # handle camelCase fallback
            # Simple handling for frontend camelCase
            camel_key = next((k for k in data if k.lower().replace('_', '') == field.lower().replace('_', '')), None)
            if camel_key:
                updates.append(f'{field} = ?')
                params.append(data[camel_key])
    if 'requires_approval' in data:
        updates.append('requires_approval = ?')
        params.append(1 if int(data['requires_approval']) else 0)
    if 'requiresApproval' in data:
        updates.append('requires_approval = ?')
        params.append(1 if int(data['requiresApproval']) else 0)
    if 'approver_user_id' in data:
        v = data['approver_user_id']
        if v in (None, '', 0, '0'):
            updates.append('approver_user_id = NULL')
        else:
            updates.append('approver_user_id = ?')
            params.append(int(v))
    if 'approverUserId' in data and 'approver_user_id' not in data:
        v = data['approverUserId']
        if v in (None, '', 0, '0'):
            updates.append('approver_user_id = NULL')
        else:
            updates.append('approver_user_id = ?')
            params.append(int(v))
    if 'visibility_scope' in data or 'visibilityScope' in data:
        vs = data.get('visibility_scope') or data.get('visibilityScope')
        if vs in (Config.ROOM_VISIBILITY_ALL, Config.ROOM_VISIBILITY_COLLEGES):
            updates.append('visibility_scope = ?')
            params.append(vs)
            if vs == Config.ROOM_VISIBILITY_ALL:
                cursor.execute('DELETE FROM room_visible_colleges WHERE room_id = ?', (room_id,))
=======
    
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
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed

    if updates:
        updates.append('updated_at = datetime("now")')
        params.append(room_id)
        cursor.execute(f'UPDATE rooms SET {", ".join(updates)} WHERE id = ?', params)

    # 更新设备列表
    if 'facilities' in data:
        cursor.execute('DELETE FROM room_facilities WHERE room_id = ?', (room_id,))
        for fac in data['facilities']:
            cursor.execute('INSERT INTO room_facilities (room_id, facility_code) VALUES (?, ?)', (room_id, fac))

    if 'visible_colleges' in data or 'visibleColleges' in data:
        vcols = data.get('visible_colleges') if 'visible_colleges' in data else data.get('visibleColleges')
        cursor.execute('DELETE FROM room_visible_colleges WHERE room_id = ?', (room_id,))
        if vcols:
            for cc in vcols:
                code = (cc or '').strip()
                if code:
                    cursor.execute(
                        'INSERT OR IGNORE INTO room_visible_colleges (room_id, college_code) VALUES (?, ?)',
                        (room_id, code),
                    )

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