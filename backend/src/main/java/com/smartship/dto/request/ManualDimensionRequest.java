package com.smartship.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ManualDimensionRequest(
        @DecimalMin(value = "0.1") @DecimalMax(value = "300.0") double lengthCm,
        @DecimalMin(value = "0.1") @DecimalMax(value = "300.0") double widthCm,
        @DecimalMin(value = "0.1") @DecimalMax(value = "300.0") double heightCm,
        @Min(1) @Max(50000) int weightG) {
}
