package com.meeting.backend.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
public class NotificationService {
    private final JdbcTemplate jdbcTemplate;

    public NotificationService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> getUserNotifications(long userId, int limit, int offset, boolean unreadOnly) {
        String sql = """
                SELECT id, type, title, content, extra_data, is_read, created_at
                FROM notifications
                WHERE user_id = ?
                """;
        if (unreadOnly) {
            sql += " AND is_read = 0";
        }
        sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        return jdbcTemplate.queryForList(sql, userId, limit, offset);
    }

    public int getUnreadCount(long userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
                Integer.class,
                userId
        );
        return count == null ? 0 : count;
    }

    public boolean markAsRead(long notificationId, long userId) {
        return jdbcTemplate.update(
                "UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ? AND user_id = ?",
                OffsetDateTime.now().toString(), notificationId, userId
        ) > 0;
    }

    public boolean markAllAsRead(long userId) {
        jdbcTemplate.update(
                "UPDATE notifications SET is_read = 1, read_at = ? WHERE user_id = ? AND is_read = 0",
                OffsetDateTime.now().toString(), userId
        );
        return true;
    }

    public boolean deleteNotification(long notificationId, long userId) {
        return jdbcTemplate.update(
                "DELETE FROM notifications WHERE id = ? AND user_id = ?",
                notificationId, userId
        ) > 0;
    }
}
