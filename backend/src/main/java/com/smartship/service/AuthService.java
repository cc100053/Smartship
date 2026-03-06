package com.smartship.service;

import com.smartship.dto.response.AuthSessionResponse;
import com.smartship.entity.AccountRefreshToken;
import com.smartship.entity.Account;
import com.smartship.repository.AccountRefreshTokenRepository;
import com.smartship.repository.AccountRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder(10);
    private static final String BEARER_PREFIX = "Bearer ";

    private final AccountRepository accountRepository;
    private final AccountRefreshTokenRepository accountRefreshTokenRepository;
    private final AccessTokenService accessTokenService;
    private final String refreshCookieName;
    private final long refreshTokenTtlSeconds;
    private final boolean refreshCookieSecure;
    private final String refreshCookieSameSite;

    public AuthService(
            AccountRepository accountRepository,
            AccountRefreshTokenRepository accountRefreshTokenRepository,
            AccessTokenService accessTokenService,
            @Value("${app.auth.refresh-cookie-name:SMARTSHIP_REFRESH}") String refreshCookieName,
            @Value("${app.auth.refresh-token-ttl-seconds:2592000}") long refreshTokenTtlSeconds,
            @Value("${app.auth.refresh-cookie.secure:true}") boolean refreshCookieSecure,
            @Value("${app.auth.refresh-cookie.same-site:Lax}") String refreshCookieSameSite) {
        this.accountRepository = accountRepository;
        this.accountRefreshTokenRepository = accountRefreshTokenRepository;
        this.accessTokenService = accessTokenService;
        this.refreshCookieName = refreshCookieName;
        this.refreshTokenTtlSeconds = refreshTokenTtlSeconds;
        this.refreshCookieSecure = refreshCookieSecure;
        this.refreshCookieSameSite = refreshCookieSameSite;
    }

    @Transactional
    public AuthSessionResponse loginOrRegister(String rawLoginId, String rawPassword, HttpServletResponse response) {
        String loginId = sanitizeLoginId(rawLoginId);
        String normalizedLoginId = normalizeLoginId(rawLoginId);
        String password = rawPassword == null ? "" : rawPassword;

        if (loginId.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID を入力してください。");
        }
        if (password.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "パスワードを入力してください。");
        }

        Optional<Account> existing = accountRepository.findByNormalizedLoginId(normalizedLoginId);
        boolean justRegistered = false;
        Account account;

        if (existing.isPresent()) {
            account = existing.get();
            if (!PASSWORD_ENCODER.matches(password, account.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ID またはパスワードが正しくありません。");
            }
        } else {
            account = accountRepository.save(new Account(loginId, normalizedLoginId, PASSWORD_ENCODER.encode(password)));
            justRegistered = true;
        }

        accountRefreshTokenRepository.deleteByExpiresAtBefore(Instant.now());
        issueRefreshToken(account, response);
        return buildAuthenticatedResponse(
                account,
                justRegistered,
                justRegistered ? "IDが見つからなかったため、そのままアカウントを作成しました。" : null,
                true);
    }

    @Transactional
    public AuthSessionResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        accountRefreshTokenRepository.deleteByExpiresAtBefore(Instant.now());

        Optional<AccountRefreshToken> currentToken = resolveRefreshToken(request);
        if (currentToken.isEmpty()) {
            clearRefreshCookie(response);
            return unauthenticated();
        }

        AccountRefreshToken refreshToken = currentToken.get();
        Account account = refreshToken.getAccount();
        accountRefreshTokenRepository.delete(refreshToken);
        issueRefreshToken(account, response);
        return buildAuthenticatedResponse(account, false, null, true);
    }

    public AuthSessionResponse getSession(HttpServletRequest request) {
        return getCurrentAccount(request)
                .map(account -> buildAuthenticatedResponse(account, false, null, false))
                .orElseGet(this::unauthenticated);
    }

    @Transactional
    public AuthSessionResponse logout(HttpServletRequest request, HttpServletResponse response) {
        readRefreshCookie(request)
                .flatMap(this::extractTokenId)
                .ifPresent(accountRefreshTokenRepository::deleteByTokenId);
        clearRefreshCookie(response);
        return unauthenticated();
    }

    public Optional<Account> getCurrentAccount(HttpServletRequest request) {
        Optional<String> bearerToken = readBearerToken(request);
        if (bearerToken.isEmpty()) {
            return Optional.empty();
        }
        return accessTokenService.parse(bearerToken.get())
                .flatMap(principal -> accountRepository.findById(principal.accountId()));
    }

    public Account requireCurrentAccount(HttpServletRequest request) {
        return getCurrentAccount(request)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ログインが必要です。"));
    }

    public String sanitizeLoginId(String rawLoginId) {
        return rawLoginId == null ? "" : rawLoginId.trim();
    }

    public String normalizeLoginId(String rawLoginId) {
        return sanitizeLoginId(rawLoginId).toLowerCase(Locale.ROOT);
    }

    private void issueRefreshToken(Account account, HttpServletResponse response) {
        String tokenId = UUID.randomUUID().toString();
        String secret = UUID.randomUUID() + UUID.randomUUID().toString().replace("-", "");
        Instant expiresAt = Instant.now().plus(refreshTokenTtlSeconds, ChronoUnit.SECONDS);

        AccountRefreshToken refreshToken = new AccountRefreshToken();
        refreshToken.setAccount(account);
        refreshToken.setTokenId(tokenId);
        refreshToken.setTokenHash(hashTokenSecret(secret));
        refreshToken.setExpiresAt(expiresAt);
        refreshToken.setLastUsedAt(Instant.now());
        accountRefreshTokenRepository.save(refreshToken);

        String rawToken = tokenId + "." + secret;
        ResponseCookie cookie = ResponseCookie.from(refreshCookieName, rawToken)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/")
                .maxAge(refreshTokenTtlSeconds)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    private Optional<AccountRefreshToken> resolveRefreshToken(HttpServletRequest request) {
        Optional<String> refreshCookie = readRefreshCookie(request);
        if (refreshCookie.isEmpty()) {
            return Optional.empty();
        }

        Optional<String> tokenId = extractTokenId(refreshCookie.get());
        Optional<String> secret = extractTokenSecret(refreshCookie.get());
        if (tokenId.isEmpty() || secret.isEmpty()) {
            return Optional.empty();
        }

        Optional<AccountRefreshToken> storedToken = accountRefreshTokenRepository.findByTokenId(tokenId.get());
        if (storedToken.isEmpty()) {
            return Optional.empty();
        }

        AccountRefreshToken refreshToken = storedToken.get();
        if (refreshToken.getExpiresAt().isBefore(Instant.now())) {
            accountRefreshTokenRepository.delete(refreshToken);
            return Optional.empty();
        }
        if (!hashTokenSecret(secret.get()).equals(refreshToken.getTokenHash())) {
            accountRefreshTokenRepository.delete(refreshToken);
            return Optional.empty();
        }

        refreshToken.setLastUsedAt(Instant.now());
        return Optional.of(refreshToken);
    }

    private Optional<String> readBearerToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (!StringUtils.hasText(authorization) || !authorization.startsWith(BEARER_PREFIX)) {
            return Optional.empty();
        }
        return Optional.of(authorization.substring(BEARER_PREFIX.length()).trim());
    }

    private Optional<String> readRefreshCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) {
            return Optional.empty();
        }

        for (Cookie cookie : cookies) {
            if (refreshCookieName.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                return Optional.of(cookie.getValue());
            }
        }
        return Optional.empty();
    }

    private Optional<String> extractTokenId(String rawToken) {
        int separator = rawToken.indexOf('.');
        if (separator <= 0) {
            return Optional.empty();
        }
        return Optional.of(rawToken.substring(0, separator));
    }

    private Optional<String> extractTokenSecret(String rawToken) {
        int separator = rawToken.indexOf('.');
        if (separator <= 0 || separator == rawToken.length() - 1) {
            return Optional.empty();
        }
        return Optional.of(rawToken.substring(separator + 1));
    }

    private String hashTokenSecret(String rawSecret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawSecret.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hashBytes.length * 2);
            for (byte hashByte : hashBytes) {
                builder.append(String.format("%02x", hashByte));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm is unavailable", exception);
        }
    }

    private AuthSessionResponse buildAuthenticatedResponse(Account account, boolean justRegistered, String message, boolean issueAccessToken) {
        AccessTokenService.AccessTokenPayload accessToken = issueAccessToken ? accessTokenService.issue(account) : null;
        return new AuthSessionResponse(
                true,
                account.getId(),
                account.getLoginId(),
                justRegistered,
                message,
                accessToken == null ? null : accessToken.token(),
                accessToken == null ? null : accessToken.expiresAtEpochMs());
    }

    private AuthSessionResponse unauthenticated() {
        return new AuthSessionResponse(false, null, null, false, null, null, null);
    }
}
