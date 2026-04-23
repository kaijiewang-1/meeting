package com.meeting.backend.service;

import com.meeting.backend.common.AppException;
import com.meeting.backend.common.ErrorCodes;
import com.meeting.backend.common.RequestUser;
import com.meeting.backend.security.JwtService;
import com.meeting.backend.security.WerkzeugPasswordService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AuthService {
    private final JdbcTemplate jdbcTemplate;
    private final JwtService jwtService;
    private final WerkzeugPasswordService passwordService;

    public AuthService(JdbcTemplate jdbcTemplate, JwtService jwtService, WerkzeugPasswordService passwordService) {
        this.jdbcTemplate = jdbcTemplate;
        this.jwtService = jwtService;
        this.passwordService = passwordService;
    }

    public Map<String, Object> login(String username, String password) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, username, password_hash, name, email, college_code, role, status FROM users WHERE username = ?",
                username
        );
        if (rows.isEmpty()) {
            return null;
        }
        Map<String, Object> row = rows.get(0);
        if (!"ACTIVE".equals(row.get("status"))) {
            return null;
        }
        if (!passwordService.matches(password, String.valueOf(row.get("password_hash")))) {
            return null;
        }
        Map<String, Object> user = new HashMap<>();
        user.put("id", row.get("id"));
        user.put("username", row.get("username"));
        user.put("name", row.get("name"));
        user.put("email", row.get("email"));
        user.put("college_code", row.get("college_code") == null ? "" : row.get("college_code"));
        user.put("role", row.get("role"));

        String token = jwtService.generateToken(((Number) row.get("id")).longValue(), String.valueOf(row.get("username")), String.valueOf(row.get("role")));

        return Map.of(
                "user", user,
                "token", token,
                "role", row.get("role")
        );
    }

    public RequestUser requireAuth(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new AppException(ErrorCodes.UNAUTHORIZED, "未登录或登录已过期", HttpStatus.UNAUTHORIZED.value());
        }
        try {
            Claims claims = jwtService.parse(authHeader.substring(7));
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT id, username, name, email, college_code, role, status FROM users WHERE id = ?",
                    ((Number) claims.get("user_id")).longValue()
            );
            if (rows.isEmpty()) {
                throw new AppException(ErrorCodes.UNAUTHORIZED, "未登录或登录已过期", HttpStatus.UNAUTHORIZED.value());
            }
            RequestUser user = RequestUser.fromMap(rows.get(0));
            if (!"ACTIVE".equalsIgnoreCase(user.status())) {
                throw new AppException(ErrorCodes.UNAUTHORIZED, "未登录或登录已过期", HttpStatus.UNAUTHORIZED.value());
            }
            return user;
        } catch (Exception exception) {
            if (exception instanceof AppException appException) {
                throw appException;
            }
            throw new AppException(ErrorCodes.UNAUTHORIZED, "未登录或登录已过期", HttpStatus.UNAUTHORIZED.value());
        }
    }

    public RequestUser requireAdmin(HttpServletRequest request) {
        RequestUser user = requireAuth(request);
        if (!user.isAdmin()) {
            throw new AppException(ErrorCodes.FORBIDDEN, "无权限访问", HttpStatus.FORBIDDEN.value());
        }
        return user;
    }

    public RequestUser requireStaff(HttpServletRequest request) {
        RequestUser user = requireAuth(request);
        if (!user.isStaff()) {
            throw new AppException(ErrorCodes.FORBIDDEN, "无权限访问", HttpStatus.FORBIDDEN.value());
        }
        return user;
    }
}
