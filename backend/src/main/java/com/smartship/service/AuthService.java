package com.smartship.service;

import com.smartship.dto.response.AuthSessionResponse;
import com.smartship.entity.Account;
import com.smartship.repository.AccountRepository;
import jakarta.servlet.http.HttpSession;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    public static final String SESSION_ACCOUNT_ID = "accountId";
    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder(10);

    private final AccountRepository accountRepository;

    public AuthService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Transactional
    public AuthSessionResponse loginOrRegister(String rawLoginId, String rawPassword, HttpSession session) {
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

        session.setAttribute(SESSION_ACCOUNT_ID, account.getId());
        return new AuthSessionResponse(
                true,
                account.getId(),
                account.getLoginId(),
                justRegistered,
                justRegistered ? "IDが見つからなかったため、そのままアカウントを作成しました。" : null);
    }

    public AuthSessionResponse getSession(HttpSession session) {
        return getCurrentAccount(session)
                .map(account -> new AuthSessionResponse(true, account.getId(), account.getLoginId(), false, null))
                .orElseGet(() -> new AuthSessionResponse(false, null, null, false, null));
    }

    public void logout(HttpSession session) {
        session.invalidate();
    }

    public Optional<Account> getCurrentAccount(HttpSession session) {
        Object accountIdValue = session.getAttribute(SESSION_ACCOUNT_ID);
        if (!(accountIdValue instanceof Long accountId)) {
            return Optional.empty();
        }
        return accountRepository.findById(accountId);
    }

    public Account requireCurrentAccount(HttpSession session) {
        return getCurrentAccount(session)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ログインが必要です。"));
    }

    public String sanitizeLoginId(String rawLoginId) {
        return rawLoginId == null ? "" : rawLoginId.trim();
    }

    public String normalizeLoginId(String rawLoginId) {
        return sanitizeLoginId(rawLoginId).toLowerCase(Locale.ROOT);
    }
}
