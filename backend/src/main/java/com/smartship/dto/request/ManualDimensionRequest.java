package com.smartship.dto.request;

public record ManualDimensionRequest(
    double lengthCm,
    double widthCm,
    double heightCm,
    int weightG
) {}
