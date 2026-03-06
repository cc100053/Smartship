package com.smartship.dto.response;

public record ProductResponse(
    Long id,
    String category,
    String name,
    String nameJp,
    double lengthCm,
    double widthCm,
    double heightCm,
    int weightG,
    String imageIcon,
    String source
) {}
