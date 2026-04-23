package com.meeting.backend.common;

public final class ErrorCodes {
    public static final int SUCCESS = 0;
    public static final int BAD_REQUEST = 40001;
    public static final int UNAUTHORIZED = 40101;
    public static final int FORBIDDEN = 40301;
    public static final int NOT_FOUND_PATH = 40400;
    public static final int NOT_FOUND_RESOURCE = 40401;
    public static final int CONFLICT_TIME = 40901;
    public static final int CONFLICT_ROOM = 40902;
    public static final int CONFLICT_CAPACITY = 40903;

    private ErrorCodes() {
    }
}
