package com.smartship.dto.request;

import java.util.List;

public record CartCalculationRequest(List<CartItemDto> items) {}
