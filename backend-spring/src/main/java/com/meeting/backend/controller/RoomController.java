package com.meeting.backend.controller;

import com.meeting.backend.common.ApiResponse;
import com.meeting.backend.common.ErrorCodes;
import com.meeting.backend.common.RequestUser;
import com.meeting.backend.service.AuthService;
import com.meeting.backend.service.RoomService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class RoomController {
    private final AuthService authService;
    private final RoomService roomService;

    public RoomController(AuthService authService, RoomService roomService) {
        this.authService = authService;
        this.roomService = roomService;
    }

    @GetMapping("/rooms")
    public ApiResponse<List<Map<String, Object>>> rooms(
            HttpServletRequest request,
            @RequestParam(required = false) String building,
            @RequestParam(required = false) String floor,
            @RequestParam(required = false) String capacity,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String date,
            @RequestParam(required = false, name = "startTime") String startTime,
            @RequestParam(required = false, name = "endTime") String endTime,
            @RequestParam(required = false, name = "facilities") List<String> facilities
    ) {
        RequestUser user = authService.requireAuth(request);
        Map<String, Object> filters = new HashMap<>();
        filters.put("building", building);
        filters.put("floor", floor);
        filters.put("capacity", capacity);
        filters.put("status", status);
        filters.put("date", date);
        filters.put("start", startTime);
        filters.put("end", endTime);
        filters.put("facilities", facilities);
        List<Map<String, Object>> rooms = roomService.getAllRooms(filters, user);
        return ApiResponse.ok("success", rooms, rooms.size());
    }

    @GetMapping("/rooms/available")
    public ApiResponse<List<Map<String, Object>>> availableRooms(
            HttpServletRequest request,
            @RequestParam(required = false) String date,
            @RequestParam(required = false, name = "startTime") String startTime,
            @RequestParam(required = false, name = "endTime") String endTime,
            @RequestParam(required = false) String capacity,
            @RequestParam(required = false) String building,
            @RequestParam(required = false) String floor,
            @RequestParam(required = false, name = "facilities") List<String> facilities
    ) {
        RequestUser user = authService.requireAuth(request);
        Map<String, Object> filters = new HashMap<>();
        filters.put("date", date);
        filters.put("start", startTime);
        filters.put("end", endTime);
        filters.put("capacity", capacity);
        filters.put("building", building);
        filters.put("floor", floor);
        filters.put("facilities", facilities);
        List<Map<String, Object>> rooms = roomService.getAvailableRooms(filters, user);
        return ApiResponse.ok("success", rooms, rooms.size());
    }

    @GetMapping("/rooms/{roomId}")
    public ApiResponse<?> room(HttpServletRequest request, @PathVariable long roomId) {
        RequestUser user = authService.requireAuth(request);
        Map<String, Object> room = roomService.getRoomById(roomId, user);
        if (room == null) {
            return ApiResponse.fail(ErrorCodes.NOT_FOUND_RESOURCE, "会议室不存在");
        }
        return ApiResponse.ok("success", room);
    }

    @GetMapping("/rooms/{roomId}/schedule")
    public ApiResponse<?> schedule(HttpServletRequest request, @PathVariable long roomId, @RequestParam(required = false) String date) {
        RequestUser user = authService.requireAuth(request);
        Map<String, Object> room = roomService.getRoomById(roomId, user);
        if (room == null) {
            return ApiResponse.fail(ErrorCodes.NOT_FOUND_RESOURCE, "会议室不存在");
        }
        String day = date == null || date.isBlank() ? java.time.LocalDate.now().toString() : date;
        return ApiResponse.ok("success", roomService.getRoomSchedule(roomId, day));
    }
}
