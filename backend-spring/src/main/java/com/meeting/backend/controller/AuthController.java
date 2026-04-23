package com.meeting.backend.controller;

import com.meeting.backend.common.ApiResponse;
import com.meeting.backend.common.ErrorCodes;
import com.meeting.backend.service.AuthService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<?> login(@RequestBody Map<String, Object> body) {
        String username = String.valueOf(body.getOrDefault("username", "")).trim();
        String password = String.valueOf(body.getOrDefault("password", ""));
        if (username.isBlank() || password.isBlank()) {
            return ApiResponse.fail(ErrorCodes.BAD_REQUEST, "用户名和密码不能为空");
        }
        Map<String, Object> result = authService.login(username, password);
        if (result == null) {
            return ApiResponse.fail(ErrorCodes.UNAUTHORIZED, "用户名或密码错误");
        }
        return ApiResponse.ok("登录成功", result);
    }
}
