package com.smartship.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CartCalculationRequest(
        @NotNull @Size(min = 1, max = 60) List<@NotNull @Valid CartItemDto> items) {
}
