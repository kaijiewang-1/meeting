package com.meeting.backend.common;

public record ApiResponse<T>(int code, String message, T data, Integer total) {
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(0, message, data, null);
    }

    public static <T> ApiResponse<T> ok(String message, T data, Integer total) {
        return new ApiResponse<>(0, message, data, total);
    }

    public static <T> ApiResponse<T> fail(int code, String message) {
        return new ApiResponse<>(code, message, null, null);
    }
}
