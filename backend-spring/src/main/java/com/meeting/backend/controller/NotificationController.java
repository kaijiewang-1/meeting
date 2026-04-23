package com.meeting.backend.controller;

import com.meeting.backend.common.ApiResponse;
import com.meeting.backend.common.RequestUser;
import com.meeting.backend.service.AuthService;
import com.meeting.backend.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final AuthService authService;
    private final NotificationService notificationService;

    public NotificationController(AuthService authService, NotificationService notificationService) {
        this.authService = authService;
        this.notificationService = notificationService;
    }

    @GetMapping
    public ApiResponse<?> notifications(
            HttpServletRequest request,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(name = "unread_only", defaultValue = "false") boolean unreadOnly
    ) {
        RequestUser user = authService.requireAuth(request);
        return ApiResponse.ok("success", notificationService.getUserNotifications(user.id(), limit, offset, unreadOnly));
    }

    @GetMapping("/unread-count")
    public ApiResponse<?> unreadCount(HttpServletRequest request) {
        RequestUser user = authService.requireAuth(request);
        return ApiResponse.ok("success", Map.of("count", notificationService.getUnreadCount(user.id())));
    }

    @PostMapping("/{notificationId}/read")
    public ApiResponse<?> markRead(HttpServletRequest request, @PathVariable long notificationId) {
        RequestUser user = authService.requireAuth(request);
        return notificationService.markAsRead(notificationId, user.id())
                ? ApiResponse.ok("已标记为已读", null)
                : ApiResponse.fail(40001, "操作失败");
    }

    @PostMapping("/read-all")
    public ApiResponse<?> markAllRead(HttpServletRequest request) {
        RequestUser user = authService.requireAuth(request);
        notificationService.markAllAsRead(user.id());
        return ApiResponse.ok("已全部标记为已读", null);
    }

    @DeleteMapping("/{notificationId}")
    public ApiResponse<?> delete(HttpServletRequest request, @PathVariable long notificationId) {
        RequestUser user = authService.requireAuth(request);
        return notificationService.deleteNotification(notificationId, user.id())
                ? ApiResponse.ok("删除成功", null)
                : ApiResponse.fail(40001, "删除失败");
    }
}
