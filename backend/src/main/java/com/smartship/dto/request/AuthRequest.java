package com.smartship.dto.request;

public record AuthRequest(
        String loginId,
        String password) {
}
