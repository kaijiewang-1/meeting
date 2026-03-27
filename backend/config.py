# 后端配置文件
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'meeting-room-secret-key-2026')
    JWT_SECRET = os.environ.get('JWT_SECRET', 'jwt-meeting-secret-2026')
    JWT_EXPIRY_HOURS = 12

    # SQLite 数据库（轻量，无需安装）
    DATABASE = os.path.join(os.path.dirname(__file__), 'meeting.db')

    # 会议室状态
    ROOM_STATUS_AVAILABLE = 'AVAILABLE'
    ROOM_STATUS_BUSY = 'BUSY'
    ROOM_STATUS_MAINTENANCE = 'MAINTENANCE'

    # 预定状态
    BOOKING_STATUS_BOOKED = 'BOOKED'
    BOOKING_STATUS_CHECKED_IN = 'CHECKED_IN'
    BOOKING_STATUS_IN_USE = 'IN_USE'
    BOOKING_STATUS_FINISHED = 'FINISHED'
    BOOKING_STATUS_CANCELED = 'CANCELED'
    BOOKING_STATUS_EXPIRED = 'EXPIRED'

    # 有效预定状态（占用时段）
    ACTIVE_BOOKING_STATUSES = ['BOOKED', 'CHECKED_IN', 'IN_USE']

    # 规则
    MAX_ADVANCE_DAYS = 30
    MIN_DURATION_MINUTES = 15
    MAX_DURATION_MINUTES = 480
    CANCEL_LIMIT_MINUTES = 5
    AUTO_RELEASE_MINUTES = 15
    BUSINESS_START_HOUR = 8
    BUSINESS_END_HOUR = 22
