package com.smartship.dto.response;

import java.time.Instant;

public record StatsSummaryResponse(
        long totalCalculations,
        long estimatedYenSaved,
        long estimatedCo2eSavedG,
        double cumulativeVolumeSavedCm3,
        Instant updatedAt) {
}
