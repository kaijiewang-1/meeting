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
    BOOKING_STATUS_PENDING_APPROVAL = 'PENDING_APPROVAL'
    BOOKING_STATUS_BOOKED = 'BOOKED'
    BOOKING_STATUS_CHECKED_IN = 'CHECKED_IN'
    BOOKING_STATUS_IN_USE = 'IN_USE'
    BOOKING_STATUS_FINISHED = 'FINISHED'
    BOOKING_STATUS_CANCELED = 'CANCELED'
    BOOKING_STATUS_EXPIRED = 'EXPIRED'
<<<<<<< HEAD
=======
    BOOKING_STATUS_PENDING_APPROVAL = 'PENDING_APPROVAL'
>>>>>>> ce761abf795a0e007b9c5b1a4a554422860fa1ed
    BOOKING_STATUS_REJECTED = 'REJECTED'

    # 有效预定状态（占用时段）
    ACTIVE_BOOKING_STATUSES = ['BOOKED', 'CHECKED_IN', 'IN_USE']
    # 占用会议室时段（含待审批，避免重复预定）
    OCCUPYING_BOOKING_STATUSES = ['PENDING_APPROVAL', 'BOOKED', 'CHECKED_IN', 'IN_USE']

    # 会议室可见范围
    ROOM_VISIBILITY_ALL = 'ALL'
    ROOM_VISIBILITY_COLLEGES = 'COLLEGES'

    # 规则
    MAX_ADVANCE_DAYS = 30
    MIN_DURATION_MINUTES = 15
    MAX_DURATION_MINUTES = 480
    CANCEL_LIMIT_MINUTES = 60
    AUTO_RELEASE_MINUTES = 15
    BUSINESS_START_HOUR = 8
    BUSINESS_END_HOUR = 22

    # 设备标签
    FACILITIES = {
        'projector': '投影仪',
        'whiteboard': '白板',
        'video_conf': '视频会议',
        'tv': '电视',
        'audio': '音响系统',
    }