package com.smartship.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartship.dto.response.AuthSessionResponse;
import com.smartship.entity.Account;
import com.smartship.repository.AccountRefreshTokenRepository;
import com.smartship.repository.AccountRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountRefreshTokenRepository accountRefreshTokenRepository;

    @Mock
    private AccessTokenService accessTokenService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                accountRepository,
                accountRefreshTokenRepository,
                accessTokenService,
                "SMARTSHIP_REFRESH",
                2_592_000L,
                false,
                "Lax");
    }

    @Test
    void loginOrRegisterCreatesAccountWhenMissing() {
        when(accountRepository.findByNormalizedLoginId("demo")).thenReturn(Optional.empty());
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> {
            Account account = invocation.getArgument(0);
            ReflectionTestUtils.setField(account, "id", 42L);
            return account;
        });
        when(accessTokenService.issue(any(Account.class)))
                .thenReturn(new AccessTokenService.AccessTokenPayload("access-token", 123456789L));

        MockHttpServletResponse response = new MockHttpServletResponse();
        AuthSessionResponse authResponse = authService.loginOrRegister(" Demo ", "p", response);

        assertThat(authResponse.authenticated()).isTrue();
        assertThat(authResponse.accountId()).isEqualTo(42L);
        assertThat(authResponse.loginId()).isEqualTo("Demo");
        assertThat(authResponse.justRegistered()).isTrue();
        assertThat(authResponse.message()).isEqualTo("IDが見つからなかったため、そのままアカウントを作成しました。");
        assertThat(authResponse.accessToken()).isEqualTo("access-token");
        assertThat(response.getHeader("Set-Cookie")).contains("SMARTSHIP_REFRESH=").contains("HttpOnly");
        verify(accountRepository).save(any(Account.class));
        verify(accountRefreshTokenRepository).save(any());
    }

    @Test
    void loginOrRegisterRejectsWrongPasswordForExistingAccount() {
        Account existing = new Account("demo", "demo", "$2a$10$YQCdC4mS5nCuxnxOQk4S2enI4f3xFrqF0lXwS6uN0I2P0uV4M1fcW");
        when(accountRepository.findByNormalizedLoginId("demo")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> authService.loginOrRegister("demo", "wrong", new MockHttpServletResponse()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("401 UNAUTHORIZED");
    }

    @Test
    void getSessionReturnsAuthenticatedWhenBearerTokenIsValid() {
        Account account = new Account("demo", "demo", "hash");
        ReflectionTestUtils.setField(account, "id", 42L);
        when(accessTokenService.parse("good-token"))
                .thenReturn(Optional.of(new AccessTokenService.AccessTokenPrincipal(42L, "demo")));
        when(accountRepository.findById(42L)).thenReturn(Optional.of(account));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer good-token");

        AuthSessionResponse response = authService.getSession(request);

        assertThat(response.authenticated()).isTrue();
        assertThat(response.accountId()).isEqualTo(42L);
        assertThat(response.accessToken()).isNull();
        verify(accessTokenService).parse("good-token");
        verify(accountRepository).findById(42L);
    }

    @Test
    void requireCurrentAccountRejectsMissingBearerToken() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThatThrownBy(() -> authService.requireCurrentAccount(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("401 UNAUTHORIZED");
    }
}
