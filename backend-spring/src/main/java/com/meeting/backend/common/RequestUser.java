package com.meeting.backend.common;

import java.util.Map;

public record RequestUser(
        Long id,
        String username,
        String name,
        String email,
        String collegeCode,
        String role,
        String status
) {
    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(role);
    }

    public boolean isApprover() {
        return "APPROVER".equalsIgnoreCase(role);
    }

    public boolean isStaff() {
        return isAdmin() || isApprover();
    }

    public static RequestUser fromMap(Map<String, Object> row) {
        return new RequestUser(
                ((Number) row.get("id")).longValue(),
                String.valueOf(row.get("username")),
                String.valueOf(row.get("name")),
                row.get("email") == null ? null : String.valueOf(row.get("email")),
                row.get("college_code") == null ? "" : String.valueOf(row.get("college_code")),
                String.valueOf(row.get("role")),
                String.valueOf(row.get("status"))
        );
    }
}
