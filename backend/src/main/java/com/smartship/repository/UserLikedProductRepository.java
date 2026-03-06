package com.smartship.repository;

import com.smartship.entity.UserLikedProduct;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserLikedProductRepository extends JpaRepository<UserLikedProduct, Long> {
    List<UserLikedProduct> findByAccountIdOrderByIdDesc(Long accountId);

    Optional<UserLikedProduct> findByAccountIdAndProductReferenceId(Long accountId, Integer productReferenceId);

    boolean existsByAccountIdAndProductReferenceId(Long accountId, Integer productReferenceId);

    void deleteByAccountIdAndProductReferenceId(Long accountId, Integer productReferenceId);
}
