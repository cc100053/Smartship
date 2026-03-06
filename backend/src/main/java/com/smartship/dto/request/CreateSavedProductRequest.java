package com.smartship.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record CreateSavedProductRequest(
        @NotBlank String name,
        String category,
        @Positive double lengthCm,
        @Positive double widthCm,
        @Positive double heightCm,
        @Positive int weightG) {
}
