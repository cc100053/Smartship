package com.smartship.repository;

import com.smartship.entity.ProductReference;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProductRepository extends JpaRepository<ProductReference, Integer> {
    List<ProductReference> findByCategoryIgnoreCaseOrderByNameAsc(String category);

    @Query("select distinct p.category from ProductReference p order by p.category")
    List<String> findDistinctCategories();
}
