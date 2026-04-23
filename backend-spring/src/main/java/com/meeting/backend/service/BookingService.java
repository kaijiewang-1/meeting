package com.meeting.backend.service;

import com.meeting.backend.common.AppException;
import com.meeting.backend.common.ErrorCodes;
import com.meeting.backend.common.RequestUser;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class BookingService {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd['T'][' ']HH:mm[:ss]");

    private final JdbcTemplate jdbcTemplate;
    private final RoomService roomService;

    public BookingService(JdbcTemplate jdbcTemplate, RoomService roomService) {
        this.jdbcTemplate = jdbcTemplate;
        this.roomService = roomService;
    }

    public Map<String, Object> createBooking(long organizerId, Map<String, Object> data) {
        String subject = String.valueOf(data.get("subject"));
        long roomId = Long.parseLong(String.valueOf(data.get("roomId")));
        String startTime = String.valueOf(data.get("startTime"));
        String endTime = String.valueOf(data.get("endTime"));
        int attendeeCount = Integer.parseInt(String.valueOf(data.getOrDefault("attendeeCount", 1)));
        String remark = String.valueOf(data.getOrDefault("remark", ""));

        validateBooking(organizerId, roomId, startTime, endTime, attendeeCount);

        RequestUser user = getUser(organizerId);
        Map<String, Object> room = roomService.getRoomById(roomId, user);
        if (room == null) {
            throw new AppException(ErrorCodes.FORBIDDEN, "无权预定该会议室", HttpStatus.OK.value());
        }
        int requiresApproval = ((Number) room.getOrDefault("requires_approval", 0)).intValue();
        String status = requiresApproval == 1 ? "PENDING_APPROVAL" : "BOOKED";
        String bookingNo = "BK" + java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase();

        jdbcTemplate.update("""
                INSERT INTO bookings (booking_no, subject, organizer_id, room_id, start_time, end_time, attendee_count, status, remark)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, bookingNo, subject, organizerId, roomId, startTime, endTime, attendeeCount, status, remark);
        Long bookingId = jdbcTemplate.queryForObject("SELECT last_insert_rowid()", Long.class);
        return getBookingById(bookingId);
    }

    public List<Map<String, Object>> getMyBookings(long organizerId, String status) {
        StringBuilder sql = new StringBuilder("""
                SELECT b.*, r.name AS room_name, a.name AS approver_name
                FROM bookings b
                LEFT JOIN rooms r ON b.room_id = r.id
                LEFT JOIN users a ON b.approved_by = a.id
                WHERE b.organizer_id = ?
                """);
        if ("active".equals(status)) {
            sql.append(" AND b.status IN ('PENDING_APPROVAL', 'BOOKED', 'CHECKED_IN', 'IN_USE')");
            return jdbcTemplate.queryForList(sql.append(" ORDER BY b.start_time DESC").toString(), organizerId);
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND b.status = ?");
            return jdbcTemplate.queryForList(sql.append(" ORDER BY b.start_time DESC").toString(), organizerId, status);
        }
        return jdbcTemplate.queryForList(sql.append(" ORDER BY b.start_time DESC").toString(), organizerId);
    }

    public List<Map<String, Object>> getAllBookings(Map<String, Object> filters) {
        StringBuilder sql = new StringBuilder("""
                SELECT b.*, r.name AS room_name, u.name AS organizer_name, a.name AS approver_name
                FROM bookings b
                LEFT JOIN rooms r ON b.room_id = r.id
                LEFT JOIN users u ON b.organizer_id = u.id
                LEFT JOIN users a ON b.approved_by = a.id
                WHERE 1=1
                """);
        List<Object> params = new java.util.ArrayList<>();
        if (filters != null) {
            if (filters.get("status") != null) {
                sql.append(" AND b.status = ?");
                params.add(filters.get("status"));
            }
            if (filters.get("date_from") != null) {
                sql.append(" AND DATE(b.start_time) >= ?");
                params.add(filters.get("date_from"));
            }
            if (filters.get("date_to") != null) {
                sql.append(" AND DATE(b.start_time) <= ?");
                params.add(filters.get("date_to"));
            }
            if (filters.get("room_id") != null) {
                sql.append(" AND b.room_id = ?");
                params.add(filters.get("room_id"));
            }
        }
        sql.append(" ORDER BY b.start_time DESC");
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    public Map<String, Object> cancelBooking(long bookingId, long userId) {
        Map<String, Object> booking = getBookingById(bookingId);
        if (booking == null) {
            throw new AppException(ErrorCodes.NOT_FOUND_RESOURCE, "预定记录不存在", HttpStatus.OK.value());
        }
        if (((Number) booking.get("organizer_id")).longValue() != userId) {
            throw new AppException(ErrorCodes.FORBIDDEN, "无权取消他人的预定", HttpStatus.OK.value());
        }
        if (List.of("CANCELED", "FINISHED", "EXPIRED", "REJECTED").contains(String.valueOf(booking.get("status")))) {
            throw new AppException(ErrorCodes.BAD_REQUEST, "当前状态不允许取消", HttpStatus.OK.value());
        }
        jdbcTemplate.update("UPDATE bookings SET status = 'CANCELED', canceled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", bookingId);
        return getBookingById(bookingId);
    }

    public Map<String, Object> checkInBooking(long bookingId, long userId) {
        Map<String, Object> booking = getBookingById(bookingId);
        if (booking == null) {
            throw new AppException(ErrorCodes.NOT_FOUND_RESOURCE, "预定记录不存在", HttpStatus.OK.value());
        }
        if (((Number) booking.get("organizer_id")).longValue() != userId) {
            throw new AppException(ErrorCodes.FORBIDDEN, "无权签到他人的预定", HttpStatus.OK.value());
        }
        if (!"BOOKED".equals(String.valueOf(booking.get("status")))) {
            throw new AppException(ErrorCodes.BAD_REQUEST, "当前状态不允许签到", HttpStatus.OK.value());
        }
        jdbcTemplate.update("UPDATE bookings SET status = 'CHECKED_IN', updated_at = datetime('now') WHERE id = ?", bookingId);
        return getBookingById(bookingId);
    }

    public Map<String, Object> approveBooking(long bookingId, long approverId) {
        Map<String, Object> booking = getBookingById(bookingId);
        if (booking == null) {
            throw new AppException(ErrorCodes.NOT_FOUND_RESOURCE, "预定记录不存在", HttpStatus.OK.value());
        }
        if (!"PENDING_APPROVAL".equals(String.valueOf(booking.get("status")))) {
            throw new AppException(ErrorCodes.BAD_REQUEST, "该预定不在待审批状态", HttpStatus.OK.value());
        }
        verifyApproverPermission(booking, approverId);
        if (roomService.isBookingConflict(((Number) booking.get("room_id")).longValue(), String.valueOf(booking.get("start_time")), String.valueOf(booking.get("end_time")), bookingId)) {
            throw new AppException(ErrorCodes.CONFLICT_TIME, "该时段已有其他有效预定，无法通过审批", HttpStatus.OK.value());
        }
        jdbcTemplate.update("""
                UPDATE bookings
                SET status = 'BOOKED', approval_remark = NULL, approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
                """, approverId, bookingId);
        return getBookingById(bookingId);
    }

    public Map<String, Object> rejectBooking(long bookingId, long approverId, String reason) {
        Map<String, Object> booking = getBookingById(bookingId);
        if (booking == null) {
            throw new AppException(ErrorCodes.NOT_FOUND_RESOURCE, "预定记录不存在", HttpStatus.OK.value());
        }
        if (!"PENDING_APPROVAL".equals(String.valueOf(booking.get("status")))) {
            throw new AppException(ErrorCodes.BAD_REQUEST, "该预定不在待审批状态", HttpStatus.OK.value());
        }
        verifyApproverPermission(booking, approverId);
        jdbcTemplate.update("""
                UPDATE bookings
                SET status = 'REJECTED', approval_remark = ?, approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
                """, reason == null || reason.isBlank() ? null : reason.trim(), approverId, bookingId);
        return getBookingById(bookingId);
    }

    public Map<String, Object> getBookingById(long bookingId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT b.*, r.name AS room_name, u.name AS organizer_name, a.name AS approver_name
                FROM bookings b
                LEFT JOIN rooms r ON b.room_id = r.id
                LEFT JOIN users u ON b.organizer_id = u.id
                LEFT JOIN users a ON b.approved_by = a.id
                WHERE b.id = ?
                """, bookingId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private void validateBooking(long organizerId, long roomId, String startTime, String endTime, int attendeeCount) {
        LocalDateTime start = parseDateTime(startTime);
        LocalDateTime end = parseDateTime(endTime);
        if (!end.isAfter(start)) {
            throw new AppException(ErrorCodes.BAD_REQUEST, "结束时间必须晚于开始时间", HttpStatus.OK.value());
        }
        if (start.isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCodes.BAD_REQUEST, "不能预定过去的时间", HttpStatus.OK.value());
        }
        Map<String, Object> room = jdbcTemplate.queryForList("SELECT * FROM rooms WHERE id = ?", roomId).stream().findFirst().orElse(null);
        if (room == null) {
            throw new AppException(ErrorCodes.NOT_FOUND_RESOURCE, "会议室不存在", HttpStatus.OK.value());
        }
        if (attendeeCount > ((Number) room.get("capacity")).intValue()) {
            throw new AppException(ErrorCodes.CONFLICT_CAPACITY, "参会人数超过会议室容量", HttpStatus.OK.value());
        }
        if (!"AVAILABLE".equals(String.valueOf(room.get("status")))) {
            throw new AppException(ErrorCodes.CONFLICT_ROOM, "会议室当前不可预定", HttpStatus.OK.value());
        }
        long advanceDays = Duration.between(LocalDateTime.now(), start).toDays();
        Map<String, Object> rules = jdbcTemplate.queryForList("SELECT * FROM booking_rules LIMIT 1").stream().findFirst().orElseGet(HashMap::new);
        int maxAdvanceDays = ((Number) rules.getOrDefault("max_advance_days", 30)).intValue();
        if (advanceDays > maxAdvanceDays) {
            throw new AppException(ErrorCodes.BAD_REQUEST, "最多只能提前 " + maxAdvanceDays + " 天预定", HttpStatus.OK.value());
        }
        long durationMinutes = Duration.between(start, end).toMinutes();
        int minDuration = ((Number) rules.getOrDefault("min_duration_minutes", 15)).intValue();
        int maxDuration = ((Number) rules.getOrDefault("max_duration_minutes", 480)).intValue();
        if (durationMinutes < minDuration) {
            throw new AppException(ErrorCodes.BAD_REQUEST, "预定时长不能少于 " + minDuration + " 分钟", HttpStatus.OK.value());
        }
        if (durationMinutes > maxDuration) {
            throw new AppException(ErrorCodes.BAD_REQUEST, "预定时长不能超过 " + maxDuration + " 分钟", HttpStatus.OK.value());
        }
        int startHour = ((Number) rules.getOrDefault("business_start_hour", 8)).intValue();
        int endHour = ((Number) rules.getOrDefault("business_end_hour", 22)).intValue();
        if (start.getHour() < startHour || end.getHour() > endHour) {
            throw new AppException(ErrorCodes.BAD_REQUEST, "仅允许在 " + startHour + ":00 - " + endHour + ":00 预定", HttpStatus.OK.value());
        }
        RequestUser organizer = getUser(organizerId);
        if (!roomService.userMayAccessRoom(organizer, room)) {
            throw new AppException(ErrorCodes.FORBIDDEN, "无权预定该会议室", HttpStatus.OK.value());
        }
        if (roomService.isBookingConflict(roomId, startTime, endTime, null)) {
            throw new AppException(ErrorCodes.CONFLICT_TIME, "该时间段已被其他会议预定", HttpStatus.OK.value());
        }
    }

    private void verifyApproverPermission(Map<String, Object> booking, long approverId) {
        RequestUser actor = getUser(approverId);
        if (actor.isAdmin()) {
            return;
        }
        Map<String, Object> room = jdbcTemplate.queryForList("SELECT * FROM rooms WHERE id = ?", booking.get("room_id")).stream().findFirst().orElse(null);
        if (room == null) {
            return;
        }
        Object designated = room.get("approver_user_id");
        if (designated != null && ((Number) designated).longValue() != approverId) {
            throw new AppException(ErrorCodes.FORBIDDEN, "您不是该会议室指定的审批人", HttpStatus.OK.value());
        }
    }

    private RequestUser getUser(long userId) {
        return RequestUser.fromMap(jdbcTemplate.queryForList(
                "SELECT id, username, name, email, college_code, role, status FROM users WHERE id = ?",
                userId
        ).get(0));
    }

    private LocalDateTime parseDateTime(String value) {
        String normalized = value.replace("T", " ");
        if (normalized.length() == 16) {
            normalized += ":00";
        }
        return LocalDateTime.parse(normalized, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
