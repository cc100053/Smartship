package com.smartship.repository;

import com.smartship.entity.ProductReference;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<ProductReference, Integer> {
}
