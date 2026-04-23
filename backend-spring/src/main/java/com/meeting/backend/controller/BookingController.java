package com.meeting.backend.controller;

import com.meeting.backend.common.ApiResponse;
import com.meeting.backend.common.ErrorCodes;
import com.meeting.backend.common.RequestUser;
import com.meeting.backend.service.AuthService;
import com.meeting.backend.service.BookingService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class BookingController {
    private final AuthService authService;
    private final BookingService bookingService;

    public BookingController(AuthService authService, BookingService bookingService) {
        this.authService = authService;
        this.bookingService = bookingService;
    }

    @PostMapping("/bookings")
    public ApiResponse<?> create(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        RequestUser user = authService.requireAuth(request);
        for (String field : List.of("subject", "roomId", "startTime", "endTime")) {
            if (!body.containsKey(field) || String.valueOf(body.get(field)).isBlank()) {
                return ApiResponse.fail(ErrorCodes.BAD_REQUEST, "缺少必填字段：" + field);
            }
        }
        Map<String, Object> booking = bookingService.createBooking(user.id(), body);
        String message = "PENDING_APPROVAL".equals(String.valueOf(booking.get("status"))) ? "已提交审批，请等待管理员确认" : "预定成功";
        return ApiResponse.ok(message, booking);
    }

    @GetMapping("/bookings/my")
    public ApiResponse<List<Map<String, Object>>> myBookings(HttpServletRequest request, @RequestParam(required = false) String status) {
        RequestUser user = authService.requireAuth(request);
        List<Map<String, Object>> bookings = bookingService.getMyBookings(user.id(), status);
        return ApiResponse.ok("success", bookings, bookings.size());
    }

    @PostMapping("/bookings/{bookingId}/cancel")
    public ApiResponse<?> cancel(HttpServletRequest request, @PathVariable long bookingId) {
        RequestUser user = authService.requireAuth(request);
        return ApiResponse.ok("已取消预定", bookingService.cancelBooking(bookingId, user.id()));
    }

    @PostMapping("/bookings/{bookingId}/check-in")
    public ApiResponse<?> checkIn(HttpServletRequest request, @PathVariable long bookingId) {
        RequestUser user = authService.requireAuth(request);
        return ApiResponse.ok("签到成功", bookingService.checkInBooking(bookingId, user.id()));
    }
}
