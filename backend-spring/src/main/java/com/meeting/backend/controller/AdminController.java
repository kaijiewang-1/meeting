package com.meeting.backend.controller;

import com.meeting.backend.common.ApiResponse;
import com.meeting.backend.common.ErrorCodes;
import com.meeting.backend.common.RequestUser;
import com.meeting.backend.service.AuthService;
import com.meeting.backend.service.BookingService;
import com.meeting.backend.service.RoomService;
import com.meeting.backend.service.StatsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AuthService authService;
    private final RoomService roomService;
    private final BookingService bookingService;
    private final StatsService statsService;
    private final JdbcTemplate jdbcTemplate;

    public AdminController(AuthService authService, RoomService roomService, BookingService bookingService, StatsService statsService, JdbcTemplate jdbcTemplate) {
        this.authService = authService;
        this.roomService = roomService;
        this.bookingService = bookingService;
        this.statsService = statsService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/approvers")
    public ApiResponse<?> approvers(HttpServletRequest request) {
        authService.requireAdmin(request);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, username, name FROM users WHERE role IN ('ADMIN', 'APPROVER') AND status = 'ACTIVE' ORDER BY name, id"
        );
        return ApiResponse.ok("success", rows);
    }

    @GetMapping("/users")
    public ApiResponse<?> users(HttpServletRequest request) {
        authService.requireAdmin(request);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT id, username, name, email, college_code, role, status, created_at
                FROM users
                WHERE status = 'ACTIVE'
                ORDER BY
                  CASE role WHEN 'ADMIN' THEN 0 WHEN 'APPROVER' THEN 1 ELSE 2 END,
                  name, id
                """);
        return ApiResponse.ok("success", rows, rows.size());
    }

    @PutMapping("/users/{userId}/role")
    public ApiResponse<?> updateUserRole(HttpServletRequest request, @PathVariable long userId, @RequestBody Map<String, Object> body) {
        authService.requireAdmin(request);
        String nextRole = String.valueOf(body.getOrDefault("role", "")).trim().toUpperCase();
        if (!List.of("USER", "APPROVER").contains(nextRole)) {
            return ApiResponse.fail(ErrorCodes.BAD_REQUEST, "角色仅支持 USER 或 APPROVER");
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, username, name, email, college_code, role, status FROM users WHERE id = ?",
                userId
        );
        if (rows.isEmpty()) {
            return ApiResponse.fail(ErrorCodes.NOT_FOUND_RESOURCE, "用户不存在");
        }
        Map<String, Object> current = rows.get(0);
        if ("ADMIN".equalsIgnoreCase(String.valueOf(current.get("role")))) {
            return ApiResponse.fail(ErrorCodes.BAD_REQUEST, "管理员角色不能在此处修改");
        }
        jdbcTemplate.update(
                "UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?",
                nextRole, userId
        );
        Map<String, Object> updated = jdbcTemplate.queryForMap(
                "SELECT id, username, name, email, college_code, role, status FROM users WHERE id = ?",
                userId
        );
        return ApiResponse.ok("角色更新成功", updated);
    }

    @GetMapping("/rooms")
    public ApiResponse<?> rooms(HttpServletRequest request) {
        RequestUser user = authService.requireAdmin(request);
        List<Map<String, Object>> rooms = roomService.getAllRooms(Map.of(), user);
        return ApiResponse.ok("success", rooms, rooms.size());
    }

    @PostMapping("/rooms")
    public ApiResponse<?> createRoom(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        authService.requireAdmin(request);
        for (String field : List.of("name", "building", "floor", "capacity")) {
            if (!body.containsKey(field) || String.valueOf(body.get(field)).isBlank()) {
                return ApiResponse.fail(ErrorCodes.BAD_REQUEST, "缺少必填字段：" + field);
            }
        }
        return ApiResponse.ok("创建成功", roomService.createRoom(body));
    }

    @PutMapping("/rooms/{roomId}")
    public ApiResponse<?> updateRoom(HttpServletRequest request, @PathVariable long roomId, @RequestBody Map<String, Object> body) {
        authService.requireAdmin(request);
        Map<String, Object> room = roomService.updateRoom(roomId, body);
        if (room == null) {
            return ApiResponse.fail(ErrorCodes.NOT_FOUND_RESOURCE, "会议室不存在");
        }
        return ApiResponse.ok("更新成功", room);
    }

    @DeleteMapping("/rooms/{roomId}")
    public ApiResponse<?> deleteRoom(HttpServletRequest request, @PathVariable long roomId) {
        authService.requireAdmin(request);
        roomService.deleteRoom(roomId);
        return ApiResponse.ok("删除成功", null);
    }

    @GetMapping("/colleges")
    public ApiResponse<?> colleges(HttpServletRequest request) {
        authService.requireAdmin(request);
        return ApiResponse.ok("success", jdbcTemplate.queryForList("SELECT id, name, code FROM colleges ORDER BY id"));
    }

    @GetMapping("/bookings")
    public ApiResponse<?> bookings(
            HttpServletRequest request,
            @RequestParam(required = false) String status,
            @RequestParam(required = false, name = "date_from") String dateFrom,
            @RequestParam(required = false, name = "date_to") String dateTo,
            @RequestParam(required = false, name = "room_id") String roomId
    ) {
        authService.requireStaff(request);
        Map<String, Object> filters = new HashMap<>();
        filters.put("status", status);
        filters.put("date_from", dateFrom);
        filters.put("date_to", dateTo);
        filters.put("room_id", roomId);
        List<Map<String, Object>> bookings = bookingService.getAllBookings(filters);
        return ApiResponse.ok("success", bookings, bookings.size());
    }

    @PostMapping("/bookings/{bookingId}/approve")
    public ApiResponse<?> approve(HttpServletRequest request, @PathVariable long bookingId) {
        RequestUser user = authService.requireStaff(request);
        return ApiResponse.ok("审批通过", bookingService.approveBooking(bookingId, user.id()));
    }

    @PostMapping("/bookings/{bookingId}/reject")
    public ApiResponse<?> reject(HttpServletRequest request, @PathVariable long bookingId, @RequestBody(required = false) Map<String, Object> body) {
        RequestUser user = authService.requireStaff(request);
        String reason = body == null ? "" : String.valueOf(body.getOrDefault("reason", body.getOrDefault("remark", "")));
        return ApiResponse.ok("已拒绝", bookingService.rejectBooking(bookingId, user.id(), reason));
    }

    @GetMapping("/stats")
    public ApiResponse<?> stats(HttpServletRequest request) {
        authService.requireAdmin(request);
        return ApiResponse.ok("success", statsService.getStats());
    }
}
