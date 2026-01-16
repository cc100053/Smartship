package com.smartship.dto;

import java.util.List;

public record PackingResult(
        Dimensions dimensions,
        List<PlacementInfo> placements) {
}
