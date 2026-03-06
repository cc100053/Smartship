package com.smartship.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartship.dto.response.AuthSessionResponse;
import com.smartship.entity.Account;
import com.smartship.repository.AccountRepository;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AccountRepository accountRepository;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(accountRepository);
    }

    @Test
    void loginOrRegisterCreatesAccountWhenMissing() {
        when(accountRepository.findByNormalizedLoginId("demo")).thenReturn(Optional.empty());
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> {
            Account account = invocation.getArgument(0);
            ReflectionTestUtils.setField(account, "id", 42L);
            return account;
        });

        HttpSession session = new MockHttpSession();
        AuthSessionResponse response = authService.loginOrRegister(" Demo ", "p", session);

        assertThat(response.authenticated()).isTrue();
        assertThat(response.accountId()).isEqualTo(42L);
        assertThat(response.loginId()).isEqualTo("Demo");
        assertThat(response.justRegistered()).isTrue();
        assertThat(response.message()).isEqualTo("IDが見つからなかったため、そのままアカウントを作成しました。");
        assertThat(session.getAttribute(AuthService.SESSION_ACCOUNT_ID)).isEqualTo(42L);
        verify(accountRepository).save(any(Account.class));
    }

    @Test
    void loginOrRegisterRejectsWrongPasswordForExistingAccount() {
        Account existing = new Account("demo", "demo", "$2a$10$YQCdC4mS5nCuxnxOQk4S2enI4f3xFrqF0lXwS6uN0I2P0uV4M1fcW");
        when(accountRepository.findByNormalizedLoginId("demo")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> authService.loginOrRegister("demo", "wrong", new MockHttpSession()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("401 UNAUTHORIZED");
    }
}
