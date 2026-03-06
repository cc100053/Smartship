package com.smartship.repository;

import com.smartship.entity.UserSavedProduct;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSavedProductRepository extends JpaRepository<UserSavedProduct, Long> {
    List<UserSavedProduct> findByAccountIdOrderByCreatedAtDesc(Long accountId);

    Optional<UserSavedProduct> findByIdAndAccountId(Long id, Long accountId);
}
