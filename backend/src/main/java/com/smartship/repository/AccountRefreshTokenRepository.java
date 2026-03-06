package com.smartship.repository;

import com.smartship.entity.AccountRefreshToken;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRefreshTokenRepository extends JpaRepository<AccountRefreshToken, Long> {
    Optional<AccountRefreshToken> findByTokenId(String tokenId);

    void deleteByTokenId(String tokenId);

    void deleteByExpiresAtBefore(Instant expiresAt);
}
