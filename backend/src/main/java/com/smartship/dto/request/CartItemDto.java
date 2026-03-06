package com.smartship.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record CartItemDto(
        Integer productId,
        Long savedProductId,
        @Min(1) @Max(20) int quantity) {
}
