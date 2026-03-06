package com.smartship.repository;

import com.smartship.entity.Account;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByNormalizedLoginId(String normalizedLoginId);
}
