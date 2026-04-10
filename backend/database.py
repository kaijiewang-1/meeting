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
            phone VARCHAR(20),
            wechat_id VARCHAR(100),
            college VARCHAR(100) DEFAULT '',
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
            status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL',
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
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)')

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

    from werkzeug.security import generate_password_hash
    
    # 插入学院
    colleges = [
        ('计算机学院', 'CS'),
        ('软件学院', 'SE'),
        ('信息学院', 'INFO'),
        ('管理学院', 'MGMT'),
    ]
    for name, code in colleges:
        cursor.execute('INSERT INTO colleges (name, code) VALUES (?, ?)', (name, code))
    
    # 获取学院ID
    cursor.execute('SELECT id FROM colleges WHERE code = ?', ('CS',))
    cs_id = str(cursor.fetchone()[0])
    cursor.execute('SELECT id FROM colleges WHERE code = ?', ('SE',))
    se_id = str(cursor.fetchone()[0])
    cursor.execute('SELECT id FROM colleges WHERE code = ?', ('INFO',))
    info_id = str(cursor.fetchone()[0])
    cursor.execute('SELECT id FROM colleges WHERE code = ?', ('MGMT',))
    mgmt_id = str(cursor.fetchone()[0])

    # 插入默认管理员（计算机学院）
    cursor.execute('''
        INSERT INTO users (username, password_hash, name, email, college, role)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('admin', generate_password_hash('123456'), '张老师', 'admin@company.com', cs_id, 'ADMIN'))

    # 插入普通用户（计算机学院）
    cursor.execute('''
        INSERT INTO users (username, password_hash, name, email, college, role)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('zhangsan', generate_password_hash('123456'), '张三', 'zhangsan@company.com', cs_id, 'USER'))

    # 插入普通用户（软件学院）
    cursor.execute('''
        INSERT INTO users (username, password_hash, name, email, college, role)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('lisi', generate_password_hash('123456'), '李四', 'lisi@company.com', se_id, 'USER'))

    # 插入普通用户（信息学院）
    cursor.execute('''
        INSERT INTO users (username, password_hash, name, email, college, role)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('wangwu', generate_password_hash('123456'), '王五', 'wangwu@company.com', info_id, 'USER'))

    # 插入会议室
    rooms_data = [
        # 计算机学院专用会议室
        ('星辰厅', '总部大楼', '10F', 20, 'AVAILABLE', 1, cs_id, '大型会议室，配有专业投影设备，适合团队会议和培训', '08:00-22:00', '🌟'),
        ('海洋厅', '总部大楼', '9F', 12, 'AVAILABLE', 1, cs_id, '中型会议室，适合部门会议和讨论', '08:00-22:00', '🌊'),
        # 软件学院专用会议室
        ('未来厅', '分部大楼', '5F', 16, 'AVAILABLE', 0, se_id, '中型会议室，配备现代化会议设备', '08:00-22:00', '🚀'),
        # 计算机+软件学院共享
        ('云端阁', '总部大楼', '11F', 30, 'AVAILABLE', 1, f'{cs_id},{se_id}', '大型多功能厅，配有视频会议系统和专业音响', '08:00-22:00', '☁️'),
        # 全校可见（免审批）
        ('森林厅', '总部大楼', '8F', 8, 'AVAILABLE', 0, '', '小型会议室，适合小组讨论和头脑风暴', '08:00-22:00', '🌲'),
        ('阳光房', '分部大楼', '3F', 4, 'AVAILABLE', 0, '', '小型会客室，温馨舒适', '08:00-22:00', '☀️'),
        ('静思室', '总部大楼', '10F', 2, 'AVAILABLE', 0, '', '小型独立空间，适合一对一沟通', '08:00-22:00', '🌙'),
        # 维护中
        ('创意坊', '总部大楼', '7F', 6, 'MAINTENANCE', 0, '', '小型创意空间，适合小型讨论和快速会议', '09:00-18:00', '💡'),
    ]

    for room in rooms_data:
        cursor.execute('''
            INSERT INTO rooms (name, building, floor, capacity, status, need_approval, visible_colleges, description, open_hours, image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', room)
        room_id = cursor.lastrowid

        # 为每个会议室添加设备
        facilities_map = {
            '星辰厅': ['projector', 'whiteboard', 'video_conf', 'tv'],
            '海洋厅': ['projector', 'whiteboard', 'tv'],
            '森林厅': ['whiteboard', 'tv'],
            '云端阁': ['projector', 'video_conf', 'whiteboard', 'tv', 'audio'],
            '创意坊': ['whiteboard', 'tv'],
            '未来厅': ['projector', 'video_conf', 'whiteboard'],
            '阳光房': ['tv'],
            '静思室': []
        }
        facilities = facilities_map.get(room[0], [])
        for f in facilities:
            cursor.execute('INSERT INTO room_facilities (room_id, facility_code) VALUES (?, ?)', (room_id, f))

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