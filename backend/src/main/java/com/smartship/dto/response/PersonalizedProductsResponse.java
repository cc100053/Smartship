package com.smartship.dto.response;

import java.util.List;

public record PersonalizedProductsResponse(
        List<ProductResponse> savedProducts,
        List<ProductResponse> likedProducts,
        List<Long> likedProductIds) {
}
