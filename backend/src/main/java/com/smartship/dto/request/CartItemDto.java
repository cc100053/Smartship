package com.smartship.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;

public record CartItemDto(
        @Positive int productId,
        @Min(1) @Max(20) int quantity) {
}
