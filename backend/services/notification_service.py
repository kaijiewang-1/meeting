"""
通知服务模块
"""
import json
from datetime import datetime
from database import get_db


class NotificationService:
    """通知服务"""
    
    def __init__(self):
        self.enabled = True
    
    # ========== 发送通知方法 ==========
    
    def send_booking_created(self, booking_id, user_id, booking_data):
        """预定创建成功通知"""
        title = "预定成功"
        content = f"您已成功预定会议室 {booking_data.get('room_name')}，时间：{booking_data.get('start_time')} - {booking_data.get('end_time')}"
        return self._create_notification(user_id, 'BOOKING_CREATED', title, content, {
            'booking_id': booking_id,
            'booking_data': booking_data
        })
    
    def send_booking_confirmed(self, booking_id, user_id, booking_data):
        """预定确认通知（审批通过）"""
        title = "预定已确认"
        content = f"您的会议室预定已确认：{booking_data.get('room_name')}，时间：{booking_data.get('start_time')}"
        return self._create_notification(user_id, 'BOOKING_CONFIRMED', title, content, {
            'booking_id': booking_id,
            'booking_data': booking_data
        })
    
    def send_booking_canceled(self, booking_id, user_id, booking_data, cancel_reason=None):
        """预定取消通知"""
        title = "预定已取消"
        content = f"您的会议室预定已取消：{booking_data.get('room_name')}，时间：{booking_data.get('start_time')}"
        if cancel_reason:
            content += f"，原因：{cancel_reason}"
        return self._create_notification(user_id, 'BOOKING_CANCELED', title, content, {
            'booking_id': booking_id,
            'cancel_reason': cancel_reason,
            'booking_data': booking_data
        })
    
    def send_booking_rejected(self, booking_id, user_id, booking_data, reason):
        """预定拒绝通知"""
        title = "预定申请被拒绝"
        content = f"您的预定申请 {booking_data.get('subject')} 已被拒绝，原因：{reason}"
        return self._create_notification(user_id, 'BOOKING_REJECTED', title, content, {
            'booking_id': booking_id,
            'reason': reason,
            'booking_data': booking_data
        })
    
    def send_booking_pending_approval(self, booking_id, admin_id, booking_data):
        """待审批通知（发送给管理员）"""
        title = "待审批预定"
        content = f"用户 {booking_data.get('organizer_name')} 提交了预定申请：{booking_data.get('subject')}，会议室：{booking_data.get('room_name')}，时间：{booking_data.get('start_time')}"
        return self._create_notification(admin_id, 'PENDING_APPROVAL', title, content, {
            'booking_id': booking_id,
            'booking_data': booking_data
        })
    
    def send_booking_reminder(self, booking_id, user_id, booking_data):
        """会议开始前提醒"""
        title = "会议即将开始"
        content = f"您的会议 {booking_data.get('subject')} 将于 {booking_data.get('start_time')} 在 {booking_data.get('room_name')} 开始，请准时参加"
        return self._create_notification(user_id, 'BOOKING_REMINDER', title, content, {
            'booking_id': booking_id,
            'booking_data': booking_data
        })
    
    def send_booking_auto_released(self, booking_id, user_id, booking_data):
        """自动释放通知"""
        title = "预定已自动释放"
        content = f"由于超时未签到，会议室 {booking_data.get('room_name')} 的预定已被自动释放"
        return self._create_notification(user_id, 'BOOKING_AUTO_RELEASED', title, content, {
            'booking_id': booking_id,
            'booking_data': booking_data
        })
    
    # ========== 内部方法 ==========
    
    def _create_notification(self, user_id, type_code, title, content, extra_data=None):
        """创建站内通知"""
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO notifications (user_id, type, title, content, extra_data, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                type_code,
                title,
                content,
                json.dumps(extra_data) if extra_data else None,
                0,
                datetime.now().isoformat()
            ))
            notification_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return notification_id
        except Exception as e:
            print(f"创建站内通知失败: {e}")
            return None
    
    # ========== 用户端接口 ==========
    
    def get_user_notifications(self, user_id, limit=20, offset=0, unread_only=False):
        """获取用户通知列表"""
        try:
            conn = get_db()
            cursor = conn.cursor()
            sql = '''
                SELECT id, type, title, content, extra_data, is_read, created_at
                FROM notifications
                WHERE user_id = ?
            '''
            params = [user_id]
            
            if unread_only:
                sql += ' AND is_read = 0'
            
            sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
            params.extend([limit, offset])
            
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            conn.close()
            
            notifications = []
            for row in rows:
                n = dict(row)
                if n.get('extra_data'):
                    n['extra_data'] = json.loads(n['extra_data'])
                notifications.append(n)
            return notifications
        except Exception as e:
            print(f"获取用户通知失败: {e}")
            return []
    
    def mark_as_read(self, notification_id, user_id):
        """标记通知为已读"""
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE notifications
                SET is_read = 1, read_at = ?
                WHERE id = ? AND user_id = ?
            ''', (datetime.now().isoformat(), notification_id, user_id))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"标记通知已读失败: {e}")
            return False
    
    def mark_all_as_read(self, user_id):
        """标记所有通知为已读"""
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE notifications
                SET is_read = 1, read_at = ?
                WHERE user_id = ? AND is_read = 0
            ''', (datetime.now().isoformat(), user_id))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"标记全部已读失败: {e}")
            return False
    
    def get_unread_count(self, user_id):
        """获取未读通知数量"""
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT COUNT(*) FROM notifications
                WHERE user_id = ? AND is_read = 0
            ''', (user_id,))
            count = cursor.fetchone()[0]
            conn.close()
            return count
        except Exception as e:
            print(f"获取未读数失败: {e}")
            return 0
    
    def delete_notification(self, notification_id, user_id):
        """删除通知"""
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM notifications
                WHERE id = ? AND user_id = ?
            ''', (notification_id, user_id))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"删除通知失败: {e}")
            return False


# 全局实例
notification_service = NotificationService()