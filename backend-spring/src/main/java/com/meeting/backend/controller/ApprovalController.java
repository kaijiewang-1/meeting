package com.meeting.backend.controller;

import com.meeting.backend.common.ApiResponse;
import com.meeting.backend.common.RequestUser;
import com.meeting.backend.service.AuthService;
import com.meeting.backend.service.BookingService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {
    private final AuthService authService;
    private final BookingService bookingService;
    private final JdbcTemplate jdbcTemplate;

    public ApprovalController(AuthService authService, BookingService bookingService, JdbcTemplate jdbcTemplate) {
        this.authService = authService;
        this.bookingService = bookingService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/pending")
    public ApiResponse<?> pending(HttpServletRequest request) {
        RequestUser user = authService.requireStaff(request);
        List<Map<String, Object>> bookings = jdbcTemplate.queryForList("""
                SELECT b.*, r.name AS room_name, u.name AS organizer_name
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                JOIN users u ON b.organizer_id = u.id
                WHERE b.status = 'PENDING_APPROVAL'
                ORDER BY b.created_at DESC
                """);
        if (user.isApprover()) {
            bookings = bookings.stream().filter(item -> {
                List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT approver_user_id FROM rooms WHERE id = ?", item.get("room_id"));
                if (rows.isEmpty()) return false;
                Object designated = rows.get(0).get("approver_user_id");
                return designated == null || ((Number) designated).longValue() == user.id();
            }).toList();
        }
        return ApiResponse.ok("success", bookings);
    }

    @PostMapping("/{bookingId}/approve")
    public ApiResponse<?> approve(HttpServletRequest request, @PathVariable long bookingId) {
        RequestUser user = authService.requireStaff(request);
        return ApiResponse.ok("审批通过，已通知预定人", bookingService.approveBooking(bookingId, user.id()));
    }

    @PostMapping("/{bookingId}/reject")
    public ApiResponse<?> reject(HttpServletRequest request, @PathVariable long bookingId, @RequestBody(required = false) Map<String, Object> body) {
        RequestUser user = authService.requireStaff(request);
        String reason = body == null ? "未说明原因" : String.valueOf(body.getOrDefault("reason", "未说明原因"));
        return ApiResponse.ok("已拒绝，通知已发送", bookingService.rejectBooking(bookingId, user.id(), reason));
    }

    @GetMapping("/statistics")
    public ApiResponse<?> statistics(HttpServletRequest request) {
        authService.requireStaff(request);
        Integer pending = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM bookings WHERE status = 'PENDING_APPROVAL'", Integer.class);
        Integer today = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM bookings WHERE status IN ('BOOKED', 'REJECTED') AND DATE(updated_at) = ?",
                Integer.class,
                LocalDate.now().toString()
        );
        Integer month = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM bookings WHERE status IN ('BOOKED', 'REJECTED') AND strftime('%Y-%m', updated_at) = strftime('%Y-%m', 'now')",
                Integer.class
        );
        return ApiResponse.ok("success", Map.of(
                "pending", pending == null ? 0 : pending,
                "today", today == null ? 0 : today,
                "month", month == null ? 0 : month
        ));
    }
}
