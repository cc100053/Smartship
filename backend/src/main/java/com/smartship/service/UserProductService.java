package com.smartship.service;

import com.smartship.dto.request.CreateSavedProductRequest;
import com.smartship.dto.response.PersonalizedProductsResponse;
import com.smartship.dto.response.ProductResponse;
import com.smartship.entity.Account;
import com.smartship.entity.ProductReference;
import com.smartship.entity.UserLikedProduct;
import com.smartship.entity.UserSavedProduct;
import com.smartship.repository.ProductRepository;
import com.smartship.repository.UserLikedProductRepository;
import com.smartship.repository.UserSavedProductRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserProductService {

    private final UserSavedProductRepository userSavedProductRepository;
    private final UserLikedProductRepository userLikedProductRepository;
    private final ProductRepository productRepository;

    public UserProductService(
            UserSavedProductRepository userSavedProductRepository,
            UserLikedProductRepository userLikedProductRepository,
            ProductRepository productRepository) {
        this.userSavedProductRepository = userSavedProductRepository;
        this.userLikedProductRepository = userLikedProductRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public PersonalizedProductsResponse getPersonalizedProducts(Account account) {
        List<ProductResponse> savedProducts = userSavedProductRepository.findByAccountIdOrderByCreatedAtDesc(account.getId())
                .stream()
                .map(this::toSavedProductResponse)
                .toList();

        List<UserLikedProduct> likedProducts = userLikedProductRepository.findByAccountIdOrderByIdDesc(account.getId());
        List<ProductResponse> likedProductResponses = likedProducts.stream()
                .map(UserLikedProduct::getProductReference)
                .map(this::toReferenceProductResponse)
                .toList();
        List<Long> likedProductIds = likedProducts.stream()
                .map(like -> like.getProductReference().getId().longValue())
                .toList();

        return new PersonalizedProductsResponse(savedProducts, likedProductResponses, likedProductIds);
    }

    @Transactional
    public ProductResponse createSavedProduct(Account account, CreateSavedProductRequest request) {
        UserSavedProduct product = new UserSavedProduct();
        product.setAccount(account);
        product.setCategory(normalizeCategory(request.category()));
        product.setName(request.name().trim());
        product.setLengthCm(request.lengthCm());
        product.setWidthCm(request.widthCm());
        product.setHeightCm(request.heightCm());
        product.setWeightG(request.weightG());
        product.setImageIcon("box");
        return toSavedProductResponse(userSavedProductRepository.save(product));
    }

    @Transactional
    public void deleteSavedProduct(Account account, Long savedProductId) {
        UserSavedProduct product = userSavedProductRepository.findByIdAndAccountId(savedProductId, account.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Saved product not found."));
        userSavedProductRepository.delete(product);
    }

    @Transactional
    public void likeProduct(Account account, Integer productId) {
        if (userLikedProductRepository.existsByAccountIdAndProductReferenceId(account.getId(), productId)) {
            return;
        }

        ProductReference product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found."));
        userLikedProductRepository.save(new UserLikedProduct(account, product));
    }

    @Transactional
    public void unlikeProduct(Account account, Integer productId) {
        userLikedProductRepository.deleteByAccountIdAndProductReferenceId(account.getId(), productId);
    }

    public ProductReference requireSavedProductAsReference(Account account, Long savedProductId) {
        UserSavedProduct product = userSavedProductRepository.findByIdAndAccountId(savedProductId, account.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown saved product ID: " + savedProductId));
        return new ProductReference(
                0,
                product.getCategory(),
                product.getName(),
                product.getName(),
                product.getLengthCm(),
                product.getWidthCm(),
                product.getHeightCm(),
                product.getWeightG(),
                product.getImageIcon());
    }

    private ProductResponse toReferenceProductResponse(ProductReference product) {
        return new ProductResponse(
                product.getId().longValue(),
                product.getCategory(),
                product.getName(),
                product.getNameJp(),
                product.getLengthCm(),
                product.getWidthCm(),
                product.getHeightCm(),
                product.getWeightG(),
                product.getImageIcon(),
                "reference");
    }

    private ProductResponse toSavedProductResponse(UserSavedProduct product) {
        return new ProductResponse(
                product.getId(),
                product.getCategory(),
                product.getName(),
                product.getName(),
                product.getLengthCm(),
                product.getWidthCm(),
                product.getHeightCm(),
                product.getWeightG(),
                product.getImageIcon(),
                "saved");
    }

    private String normalizeCategory(String rawCategory) {
        if (rawCategory == null || rawCategory.isBlank()) {
            return "Other";
        }
        return switch (rawCategory.trim()) {
            case "Books", "Games", "Fashion", "Electronics", "Hobbies", "Other" -> rawCategory.trim();
            default -> "Other";
        };
    }
}
