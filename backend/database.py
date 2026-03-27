"""
数据库初始化与连接管理
"""
import sqlite3
import os
from config import Config

DB_PATH = Config.DATABASE

def get_db():
    """获取数据库连接（请求级）"""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化数据库表"""
    conn = get_db()
    cursor = conn.cursor()

    # 用户表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(200) NOT NULL,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100),
            role VARCHAR(20) NOT NULL DEFAULT 'USER',
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            created_at DATETIME NOT NULL DEFAULT (datetime('now')),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
        )
    ''')

    # 会议室表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            building VARCHAR(100) NOT NULL,
            floor VARCHAR(50) NOT NULL,
            capacity INTEGER NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
            description VARCHAR(500),
            open_hours VARCHAR(50) DEFAULT '08:00-22:00',
            image VARCHAR(20) DEFAULT '🏢',
            created_at DATETIME NOT NULL DEFAULT (datetime('now')),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
        )
    ''')

    # 会议室设备标签
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS room_facilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER NOT NULL,
            facility_code VARCHAR(50) NOT NULL,
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
            UNIQUE(room_id, facility_code)
        )
    ''')

    # 会议室维护记录
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS room_maintenance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            reason VARCHAR(500),
            created_at DATETIME NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
        )
    ''')

    # 预定表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_no VARCHAR(32) NOT NULL UNIQUE,
            subject VARCHAR(200) NOT NULL,
            organizer_id INTEGER NOT NULL,
            room_id INTEGER NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            attendee_count INTEGER NOT NULL DEFAULT 1,
            status VARCHAR(32) NOT NULL DEFAULT 'BOOKED',
            remark VARCHAR(500),
            canceled_at DATETIME,
            finished_at DATETIME,
            version INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT (datetime('now')),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (organizer_id) REFERENCES users(id),
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
    ''')

    # 预定规则表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS booking_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            max_advance_days INTEGER DEFAULT 30,
            min_duration_minutes INTEGER DEFAULT 15,
            max_duration_minutes INTEGER DEFAULT 480,
            cancel_limit_minutes INTEGER DEFAULT 5,
            auto_release_minutes INTEGER DEFAULT 15,
            business_start_hour INTEGER DEFAULT 8,
            business_end_hour INTEGER DEFAULT 22,
            updated_by INTEGER,
            updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
        )
    ''')

    # 操作日志表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS operation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operator_id INTEGER,
            operator_name VARCHAR(100),
            action VARCHAR(50) NOT NULL,
            target_type VARCHAR(50),
            target_id INTEGER,
            detail TEXT,
            created_at DATETIME NOT NULL DEFAULT (datetime('now'))
        )
    ''')

    # 索引
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_bookings_room_time ON bookings(room_id, start_time, end_time, status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_bookings_organizer ON bookings(organizer_id, start_time)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_bookings_no ON bookings(booking_no)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_room_facilities_room ON room_facilities(room_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_maintenance_room ON room_maintenance(room_id, start_time, end_time)')

    conn.commit()
    conn.close()
    print("[DB] 数据库初始化完成")


def seed_data():
    """填充初始数据"""
    conn = get_db()
    cursor = conn.cursor()

    # 检查是否已有数据
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    # 插入默认管理员
    from werkzeug.security import generate_password_hash
    cursor.execute('''
        INSERT INTO users (username, password_hash, name, email, role)
        VALUES (?, ?, ?, ?, ?)
    ''', ('admin', generate_password_hash('123456'), '系统管理员', 'admin@company.com', 'ADMIN'))

    # 插入普通用户
    cursor.execute('''
        INSERT INTO users (username, password_hash, name, email, role)
        VALUES (?, ?, ?, ?, ?)
    ''', ('user', generate_password_hash('123456'), '张明', 'user@company.com', 'USER'))

    cursor.execute('''
        INSERT INTO users (username, password_hash, name, email, role)
        VALUES (?, ?, ?, ?, ?)
    ''', ('lihua', generate_password_hash('123456'), '李华', 'lihua@company.com', 'USER'))

    # 插入会议室
    rooms_data = [
        ('星辰厅', '总部大楼', '10F', 20, 'AVAILABLE', '大型会议室，配有专业投影设备，适合团队会议和培训', '08:00-22:00', '🌟'),
        ('海洋厅', '总部大楼', '9F', 12, 'AVAILABLE', '中型会议室，适合部门会议和讨论', '08:00-22:00', '🌊'),
        ('森林厅', '总部大楼', '8F', 8, 'AVAILABLE', '小型会议室，适合小组讨论和头脑风暴', '08:00-22:00', '🌲'),
        ('云端阁', '总部大楼', '11F', 30, 'AVAILABLE', '大型多功能厅，配有视频会议系统和专业音响', '08:00-22:00', '☁️'),
        ('创意坊', '总部大楼', '7F', 6, 'MAINTENANCE', '小型创意空间，适合小型讨论和快速会议', '09:00-18:00', '💡'),
        ('未来厅', '分部大楼', '5F', 16, 'AVAILABLE', '中型会议室，配备现代化会议设备', '08:00-22:00', '🚀'),
        ('阳光房', '分部大楼', '3F', 4, 'AVAILABLE', '小型会客室，温馨舒适', '08:00-22:00', '☀️'),
        ('静思室', '总部大楼', '10F', 2, 'AVAILABLE', '小型独立空间，适合一对一沟通', '08:00-22:00', '🌙'),
    ]

    for room in rooms_data:
        cursor.execute('''
            INSERT INTO rooms (name, building, floor, capacity, status, description, open_hours, image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', room)
        room_id = cursor.lastrowid

        # 为每个会议室添加设备
        if room[0] == '星辰厅':
            facilities = ['projector', 'whiteboard', 'video_conf', 'tv']
        elif room[0] == '海洋厅':
            facilities = ['projector', 'whiteboard', 'tv']
        elif room[0] == '森林厅':
            facilities = ['whiteboard', 'tv']
        elif room[0] == '云端阁':
            facilities = ['projector', 'video_conf', 'whiteboard', 'tv', 'audio']
        elif room[0] == '创意坊':
            facilities = ['whiteboard', 'tv']
        elif room[0] == '未来厅':
            facilities = ['projector', 'video_conf', 'whiteboard']
        elif room[0] == '阳光房':
            facilities = ['tv']
        else:
            facilities = []

        for f in facilities:
            cursor.execute('INSERT INTO room_facilities (room_id, facility_code) VALUES (?, ?)', (room_id, f))

    # 插入初始规则
    cursor.execute('''
        INSERT INTO booking_rules (max_advance_days, min_duration_minutes, max_duration_minutes,
                                   cancel_limit_minutes, auto_release_minutes, business_start_hour, business_end_hour)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (30, 15, 480, 5, 15, 8, 22))

    # 插入一些预定示例
    from datetime import datetime, timedelta
    now = datetime.now()
    today = now.strftime('%Y-%m-%d')

    bookings_data = [
        ('BK' + datetime.now().strftime('%Y%m%d%H%M%S') + '001', '产品周例会', 2, 2,
         f'{today}T09:00:00', f'{today}T10:00:00', 10, 'BOOKED', 'PENDING', ''),
        ('BK' + datetime.now().strftime('%Y%m%d%H%M%S') + '002', '技术方案评审', 3, 1,
         f'{today}T14:00:00', f'{today}T16:00:00', 15, 'BOOKED', 'PENDING', '需要提前准备投影'),
        ('BK' + datetime.now().strftime('%Y%m%d%H%M%S') + '003', '项目启动会', 2, 4,
         f'{today}T09:00:00', f'{today}T12:00:00', 25, 'BOOKED', 'PENDING', '需提前布置场地'),
    ]

    for b in bookings_data:
        cursor.execute('''
            INSERT INTO bookings (booking_no, subject, organizer_id, room_id, start_time, end_time,
                                  attendee_count, status, check_in_status, remark)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', b)

    conn.commit()
    conn.close()
    print("[DB] 种子数据填充完成")


if __name__ == '__main__':
    init_db()
    seed_data()
