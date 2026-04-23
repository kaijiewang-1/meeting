package com.meeting.backend.common;

public class AppException extends RuntimeException {
    private final int code;
    private final int status;

    public AppException(int code, String message, int status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public int getCode() {
        return code;
    }

    public int getStatus() {
        return status;
    }
}
