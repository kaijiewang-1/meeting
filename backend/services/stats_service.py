"""
统计服务层
"""
from datetime import datetime, timedelta
from database import get_db
from config import Config


def get_stats():
    """获取首页统计数据"""
    conn = get_db()
    cursor = conn.cursor()
    today = datetime.now().strftime('%Y-%m-%d')

    # 会议室总数
    cursor.execute('SELECT COUNT(*) FROM rooms')
    total_rooms = cursor.fetchone()[0]

    # 当前空闲会议室数
    cursor.execute("SELECT COUNT(*) FROM rooms WHERE status = ?", (Config.ROOM_STATUS_AVAILABLE,))
    available_rooms = cursor.fetchone()[0]

    # 今日预定数
    cursor.execute('''
        SELECT COUNT(*) FROM bookings
        WHERE DATE(start_time) = ? AND status NOT IN (?, ?)
    ''', (today, Config.BOOKING_STATUS_CANCELED, Config.BOOKING_STATUS_EXPIRED))
    today_bookings = cursor.fetchone()[0]

    # 计算今日利用率（简化版：假设营业 14 小时，总槽位数 = 会议室数 * 14 * 2，即 30 分钟槽）
    cursor.execute("SELECT COUNT(*) FROM rooms")
    room_count = cursor.fetchone()[0]
    # 今日已用槽
    cursor.execute('''
        SELECT COALESCE(SUM(
            (julianday(end_time) - julianday(start_time)) * 24 * 2
        ), 0) FROM bookings
        WHERE DATE(start_time) = ? AND status NOT IN (?, ?)
    ''', (today, Config.BOOKING_STATUS_CANCELED, Config.BOOKING_STATUS_EXPIRED))
    used_slots = cursor.fetchone()[0] or 0
    total_slots = room_count * 14 * 2
    utilization_rate = round(used_slots / total_slots * 100, 1) if total_slots > 0 else 0

    conn.close()

    return {
        'totalRooms': total_rooms,
        'availableRooms': available_rooms,
        'todayBookings': today_bookings,
        'utilizationRate': utilization_rate,
    }


def get_weekly_stats():
    """获取近7天预定趋势"""
    conn = get_db()
    cursor = conn.cursor()
    weekly = []
    for i in range(6, -1, -1):
        day = datetime.now() - timedelta(days=i)
        date_str = day.strftime('%Y-%m-%d')
        day_name = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day.weekday()]

        cursor.execute('''
            SELECT COUNT(*) FROM bookings
            WHERE DATE(start_time) = ? AND status NOT IN (?, ?)
        ''', (date_str, Config.BOOKING_STATUS_CANCELED, Config.BOOKING_STATUS_EXPIRED))
        bookings_count = cursor.fetchone()[0]

        # 利用率
        cursor.execute("SELECT COUNT(*) FROM rooms")
        room_count = cursor.fetchone()[0] or 1
        cursor.execute('''
            SELECT COALESCE(SUM((julianday(end_time) - julianday(start_time)) * 24 * 2), 0)
            FROM bookings
            WHERE DATE(start_time) = ? AND status NOT IN (?, ?)
        ''', (date_str, Config.BOOKING_STATUS_CANCELED, Config.BOOKING_STATUS_EXPIRED))
        used = cursor.fetchone()[0] or 0
        util = round(used / (room_count * 14 * 2) * 100, 1) if room_count > 0 else 0

        weekly.append({
            'day': day_name,
            'bookings': bookings_count,
            'utilization': util,
        })

    conn.close()
    return weekly


def get_building_stats():
    """按楼宇统计"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT r.building,
               COUNT(b.id) as bookings,
               COALESCE(SUM((julianday(b.end_time) - julianday(b.start_time)) * 24 * 2), 0) as used_slots
        FROM rooms r
        LEFT JOIN bookings b ON r.id = b.room_id
          AND b.status NOT IN (?, ?)
        GROUP BY r.building
    ''', (Config.BOOKING_STATUS_CANCELED, Config.BOOKING_STATUS_EXPIRED))

    rows = cursor.fetchall()
    conn.close()

    # 获取会议室数
    result = []
    for row in rows:
        building = dict(row)
        room_count = 1
        # 粗略计算利用率
        total_slots = room_count * 14 * 2 * 7  # 一周
        rate = round(building['used_slots'] / max(total_slots, 1) * 100, 1)
        result.append({
            'building': building['building'],
            'bookings': building['bookings'],
            'rate': rate,
        })
    return result


def get_room_usage_ranking():
    """会议室使用排行"""
    conn = get_db()
    cursor = conn.cursor()
    today = datetime.now().strftime('%Y-%m-%d')
    week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')

    cursor.execute('''
        SELECT r.id, r.name, r.building, r.floor, r.capacity, r.status,
               COUNT(b.id) as bookings,
               COALESCE(SUM((julianday(b.end_time) - julianday(b.start_time)) * 24), 0) as hours
        FROM rooms r
        LEFT JOIN bookings b ON r.id = b.room_id
          AND b.status NOT IN (?, ?)
          AND DATE(b.start_time) >= ?
        GROUP BY r.id
        ORDER BY bookings DESC
    ''', (Config.BOOKING_STATUS_CANCELED, Config.BOOKING_STATUS_EXPIRED, week_ago))

    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        r = dict(row)
        hours = round(float(r['hours'] or 0), 1)
        rate = min(round(hours / 40 * 100, 1), 100)  # 假设一周 40 工作小时
        result.append({
            'id': r['id'],
            'name': r['name'],
            'building': r['building'],
            'floor': r['floor'],
            'capacity': r['capacity'],
            'status': r['status'],
            'bookings': r['bookings'],
            'hours': hours,
            'rate': rate,
        })
    return result
