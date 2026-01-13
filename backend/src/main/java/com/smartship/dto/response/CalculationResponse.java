package com.smartship.dto.response;

import com.smartship.dto.Dimensions;
import java.util.List;

public record CalculationResponse(
    Dimensions dimensions,
    ShippingResultResponse recommended,
    List<ShippingResultResponse> options
) {}
