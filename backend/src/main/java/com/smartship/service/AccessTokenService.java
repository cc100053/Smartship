package com.smartship.service;

import com.smartship.entity.Account;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AccessTokenService {

    private final SecretKey secretKey;
    private final long accessTokenTtlSeconds;

    public AccessTokenService(
            @Value("${app.auth.access-token-secret:smartship-dev-access-token-secret-change-me-32chars}") String accessTokenSecret,
            @Value("${app.auth.access-token-ttl-seconds:900}") long accessTokenTtlSeconds) {
        this.secretKey = Keys.hmacShaKeyFor(accessTokenSecret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtlSeconds = accessTokenTtlSeconds;
    }

    public AccessTokenPayload issue(Account account) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plusSeconds(accessTokenTtlSeconds);
        String token = Jwts.builder()
                .subject(String.valueOf(account.getId()))
                .claim("loginId", account.getLoginId())
                .claim("type", "access")
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(secretKey)
                .compact();
        return new AccessTokenPayload(token, expiresAt.toEpochMilli());
    }

    public Optional<AccessTokenPrincipal> parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (!"access".equals(claims.get("type", String.class))) {
                return Optional.empty();
            }

            Long accountId = Long.valueOf(claims.getSubject());
            String loginId = claims.get("loginId", String.class);
            return Optional.of(new AccessTokenPrincipal(accountId, loginId));
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }

    public record AccessTokenPayload(String token, long expiresAtEpochMs) {
    }

    public record AccessTokenPrincipal(Long accountId, String loginId) {
    }
}
