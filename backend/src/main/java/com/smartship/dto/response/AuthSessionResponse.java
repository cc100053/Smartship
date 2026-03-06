package com.smartship.dto.response;

public record AuthSessionResponse(
        boolean authenticated,
        Long accountId,
        String loginId,
        boolean justRegistered,
        String message) {
}
