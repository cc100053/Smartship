package com.smartship.controller;

import com.smartship.dto.response.ProductResponse;
import com.smartship.entity.ProductReference;
import com.smartship.repository.ProductRepository;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @GetMapping
    public List<ProductResponse> getProducts(@RequestParam(required = false) String category) {
        List<ProductReference> products;
        if (category == null || category.isBlank()) {
            products = productRepository.findAll(Sort.by("category", "name"));
        } else {
            products = productRepository.findByCategoryIgnoreCaseOrderByNameAsc(category);
        }
        return products.stream().map(this::toResponse).toList();
    }

    @GetMapping("/categories")
    public List<String> getCategories() {
        return productRepository.findDistinctCategories();
    }

    private ProductResponse toResponse(ProductReference product) {
        return new ProductResponse(
            product.getId(),
            product.getCategory(),
            product.getName(),
            product.getNameJp(),
            product.getLengthCm(),
            product.getWidthCm(),
            product.getHeightCm(),
            product.getWeightG(),
            product.getImageIcon()
        );
    }
}
