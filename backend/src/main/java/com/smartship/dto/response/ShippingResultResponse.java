package com.smartship.dto.response;

public record ShippingResultResponse(
    Integer id,
    String companyName,
    String serviceName,
    int priceYen,
    Boolean hasTracking,
    String sendLocation,
    String notes,
    double maxLength,
    double maxWidth,
    double maxHeight,
    Integer maxWeightG,
    Integer sizeSumLimit,
    boolean canFit,
    boolean recommended,
    String reason
) {}
