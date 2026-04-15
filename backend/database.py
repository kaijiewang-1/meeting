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

    # 用户表（添加学院字段）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(200) NOT NULL,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100),
            college_code VARCHAR(50) NOT NULL DEFAULT '',
            role VARCHAR(20) NOT NULL DEFAULT 'USER',
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            created_at DATETIME NOT NULL DEFAULT (datetime('now')),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
        )
    ''')

    # 学院表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS colleges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL UNIQUE,
            code VARCHAR(50) NOT NULL UNIQUE,
            created_at DATETIME NOT NULL DEFAULT (datetime('now'))
        )
    ''')

    # 会议室表（添加审批属性和可见性）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            building VARCHAR(100) NOT NULL,
            floor VARCHAR(50) NOT NULL,
            capacity INTEGER NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
            need_approval INTEGER DEFAULT 1,
            visible_colleges TEXT DEFAULT '',
            description VARCHAR(500),
            open_hours VARCHAR(50) DEFAULT '08:00-22:00',
            weekday_open_hours VARCHAR(50) DEFAULT '08:00-18:00',
            weekend_open_hours VARCHAR(50) DEFAULT '09:00-17:00',
            image VARCHAR(20) DEFAULT '🏢',
            requires_approval INTEGER NOT NULL DEFAULT 0,
            approver_user_id INTEGER,
            visibility_scope VARCHAR(20) NOT NULL DEFAULT 'ALL',
            created_at DATETIME NOT NULL DEFAULT (datetime('now')),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (approver_user_id) REFERENCES users(id)
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
            status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL',
            remark VARCHAR(500),
            approval_remark VARCHAR(500),
            approved_by INTEGER,
            approved_at DATETIME,
            canceled_at DATETIME,
            finished_at DATETIME,
            version INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT (datetime('now')),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (organizer_id) REFERENCES users(id),
            FOREIGN KEY (room_id) REFERENCES rooms(id),
            FOREIGN KEY (approved_by) REFERENCES users(id)
        )
    ''')

    # 会议室可见学院（visibility_scope=COLLEGES 时生效）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS room_visible_colleges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER NOT NULL,
            college_code VARCHAR(50) NOT NULL,
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
            UNIQUE(room_id, college_code)
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

    # 通知表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(200) NOT NULL,
            content TEXT NOT NULL,
            extra_data TEXT,
            is_read INTEGER DEFAULT 0,
            read_at DATETIME,
            created_at DATETIME NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    # 索引
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_bookings_room_time ON bookings(room_id, start_time, end_time, status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_bookings_organizer ON bookings(organizer_id, start_time)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_bookings_no ON bookings(booking_no)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_room_facilities_room ON room_facilities(room_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_maintenance_room ON room_maintenance(room_id, start_time, end_time)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_room_visible_colleges_room ON room_visible_colleges(room_id)')

    migrate_schema(cursor)
    conn.commit()
    conn.close()
    print("[DB] 数据库初始化完成")


def _table_columns(cursor, table):
    cursor.execute(f'PRAGMA table_info({table})')
    return {row[1] for row in cursor.fetchall()}


def migrate_schema(cursor):
    """为已有 SQLite 库补充列与表"""
    cols = _table_columns(cursor, 'users')
    if 'college_code' not in cols:
        cursor.execute(
            "ALTER TABLE users ADD COLUMN college_code VARCHAR(50) NOT NULL DEFAULT ''"
        )
    cursor.execute(
        "UPDATE users SET college_code = 'CS' WHERE username = 'user' AND IFNULL(college_code, '') = ''"
    )
    cursor.execute(
        "UPDATE users SET college_code = 'EE' WHERE username = 'lihua' AND IFNULL(college_code, '') = ''"
    )

    cols = _table_columns(cursor, 'rooms')
    if 'requires_approval' not in cols:
        cursor.execute(
            "ALTER TABLE rooms ADD COLUMN requires_approval INTEGER NOT NULL DEFAULT 0"
        )
    if 'visibility_scope' not in cols:
        cursor.execute(
            "ALTER TABLE rooms ADD COLUMN visibility_scope VARCHAR(20) NOT NULL DEFAULT 'ALL'"
        )
    if 'weekday_open_hours' not in cols:
        cursor.execute(
            "ALTER TABLE rooms ADD COLUMN weekday_open_hours VARCHAR(50) DEFAULT '08:00-18:00'"
        )
    if 'weekend_open_hours' not in cols:
        cursor.execute(
            "ALTER TABLE rooms ADD COLUMN weekend_open_hours VARCHAR(50) DEFAULT '09:00-17:00'"
        )
    if 'approver_user_id' not in cols:
        cursor.execute('ALTER TABLE rooms ADD COLUMN approver_user_id INTEGER')

    cols = _table_columns(cursor, 'bookings')
    if 'approval_remark' not in cols:
        cursor.execute(
            "ALTER TABLE bookings ADD COLUMN approval_remark VARCHAR(500)"
        )
    if 'approved_by' not in cols:
        cursor.execute(
            "ALTER TABLE bookings ADD COLUMN approved_by INTEGER"
        )
    if 'approved_at' not in cols:
        cursor.execute(
            "ALTER TABLE bookings ADD COLUMN approved_at DATETIME"
        )

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS room_visible_colleges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER NOT NULL,
            college_code VARCHAR(50) NOT NULL,
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
            UNIQUE(room_id, college_code)
        )
    ''')
    cursor.execute(
        'CREATE INDEX IF NOT EXISTS idx_room_visible_colleges_room ON room_visible_colleges(room_id)'
    )


def seed_data():
    """填充初始数据"""
    conn = get_db()
    cursor = conn.cursor()

    # 检查是否已有数据
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    from werkzeug.security import generate_password_hash
    cursor.execute('''
        INSERT INTO users (username, password_hash, name, email, role, college_code)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('admin', generate_password_hash('123456'), '系统管理员', 'admin@company.com', 'ADMIN', ''))

    # 插入普通用户（学院代码用于会议室可见性筛选演示：CS / EE）
    cursor.execute('''
        INSERT INTO users (username, password_hash, name, email, role, college_code)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('user', generate_password_hash('123456'), '张明', 'user@company.com', 'USER', 'CS'))

    # 插入普通用户（计算机学院）
    cursor.execute('''
        INSERT INTO users (username, password_hash, name, email, role, college_code)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('lihua', generate_password_hash('123456'), '李华', 'lihua@company.com', 'USER', 'EE'))

    # 插入会议室：requires_approval、visibility_scope、可见学院列表（None 表示不限学院）
    rooms_data = [
        ('星辰厅', '总部大楼', '10F', 20, 'AVAILABLE', '大型会议室，配有专业投影设备，适合团队会议和培训', '08:00-22:00', '08:00-18:00', '09:00-17:00', '🌟', 0, 'COLLEGES', ['CS']),
        ('海洋厅', '总部大楼', '9F', 12, 'AVAILABLE', '中型会议室，适合部门会议和讨论', '08:00-22:00', '08:00-18:00', '09:00-17:00', '🌊', 1, 'ALL', None),
        ('森林厅', '总部大楼', '8F', 8, 'AVAILABLE', '小型会议室，适合小组讨论和头脑风暴', '08:00-22:00', '08:00-18:00', '09:00-17:00', '🌲', 0, 'ALL', None),
        ('云端阁', '总部大楼', '11F', 30, 'AVAILABLE', '大型多功能厅，配有视频会议系统和专业音响', '08:00-22:00', '08:00-18:00', '09:00-17:00', '☁️', 0, 'ALL', None),
        ('创意坊', '总部大楼', '7F', 6, 'MAINTENANCE', '小型创意空间，适合小型讨论和快速会议', '09:00-18:00', '09:00-18:00', '10:00-16:00', '💡', 0, 'ALL', None),
        ('未来厅', '分部大楼', '5F', 16, 'AVAILABLE', '中型会议室，配备现代化会议设备', '08:00-22:00', '08:00-18:00', '09:00-17:00', '🚀', 0, 'ALL', None),
        ('阳光房', '分部大楼', '3F', 4, 'AVAILABLE', '小型会客室，温馨舒适', '08:00-22:00', '08:00-18:00', '09:00-17:00', '☀️', 0, 'ALL', None),
        ('静思室', '总部大楼', '10F', 2, 'AVAILABLE', '小型独立空间，适合一对一沟通', '08:00-22:00', '08:00-18:00', '09:00-17:00', '🌙', 0, 'ALL', None),
    ]

    for room in rooms_data:
        name, building, floor, capacity, status, description, open_hours, weekday_hours, weekend_hours, image, req_appr, vis_scope, colleges = room
        cursor.execute('''
            INSERT INTO rooms (name, building, floor, capacity, status, description, open_hours,
                               weekday_open_hours, weekend_open_hours, image,
                               requires_approval, visibility_scope)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (name, building, floor, capacity, status, description, open_hours,
              weekday_hours, weekend_hours, image, req_appr, vis_scope))
        room_id = cursor.lastrowid
        if colleges:
            for cc in colleges:
                cursor.execute(
                    'INSERT INTO room_visible_colleges (room_id, college_code) VALUES (?, ?)',
                    (room_id, cc),
                )

        # 为每个会议室添加设备
        if name == '星辰厅':
            facilities = ['projector', 'whiteboard', 'video_conf', 'tv']
        elif name == '海洋厅':
            facilities = ['projector', 'whiteboard', 'tv']
        elif name == '森林厅':
            facilities = ['whiteboard', 'tv']
        elif name == '云端阁':
            facilities = ['projector', 'video_conf', 'whiteboard', 'tv', 'audio']
        elif name == '创意坊':
            facilities = ['whiteboard', 'tv']
        elif name == '未来厅':
            facilities = ['projector', 'video_conf', 'whiteboard']
        elif name == '阳光房':
            facilities = ['tv']
        else:
            facilities = []

        for f in facilities:
            cursor.execute('INSERT INTO room_facilities (room_id, facility_code) VALUES (?, ?)', (room_id, f))

    # 需审批的会议室默认指定系统管理员为审批人
    cursor.execute('''
        UPDATE rooms SET approver_user_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
        WHERE requires_approval = 1
    ''')

    # 插入初始规则
    cursor.execute('''
        INSERT INTO booking_rules (max_advance_days, min_duration_minutes, max_duration_minutes,
                                   cancel_limit_minutes, auto_release_minutes, business_start_hour, business_end_hour)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (30, 15, 480, 60, 15, 8, 22))

    conn.commit()
    conn.close()
    print("[DB] 种子数据填充完成")


if __name__ == '__main__':
    init_db()
    seed_data()