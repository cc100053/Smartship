package com.smartship.service;

import com.smartship.dto.response.CalculationResponse;
import com.smartship.dto.response.ShippingResultResponse;
import com.smartship.dto.response.StatsSummaryResponse;
import com.smartship.dto.response.StatsVolumeTrendResponse;
import com.smartship.entity.CalculationEvent;
import com.smartship.repository.CalculationEventRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StatsService {
    private static final double MIN_WEIGHT_FACTOR = 0.8;
    private static final double MAX_WEIGHT_FACTOR = 2.0;
    private static final double CO2E_GRAMS_PER_CM = 12.0;
    private static final int DEFAULT_TREND_LIMIT = 16;

    private final CalculationEventRepository calculationEventRepository;

    public StatsService(CalculationEventRepository calculationEventRepository) {
        this.calculationEventRepository = calculationEventRepository;
    }

    @Transactional
    public void recordSuccessfulCalculation(String calculationMode, CalculationResponse response) {
        CalculationEvent event = new CalculationEvent();
        var dimensions = response.dimensions();
        ShippingResultResponse recommended = response.recommended();
        ShippingResultResponse secondBest = findSecondBestOption(response.options());

        double recommendedMaxDimension = getMaxDimension(recommended);
        double recommendedVolumeCm3 = getVolumeCm3(recommended);
        Double secondMaxDimension = secondBest == null ? null : getMaxDimension(secondBest);
        Double secondOptionVolumeCm3 = secondBest == null ? null : getVolumeCm3(secondBest);
        double sizeGapCm = secondBest == null ? 0 : Math.max(0, secondMaxDimension - recommendedMaxDimension);
        double volumeSavedCm3 = secondBest == null ? 0 : Math.max(0, secondOptionVolumeCm3 - recommendedVolumeCm3);

        event.setCalculationMode(calculationMode);
        event.setItemCount(dimensions != null ? dimensions.getItemCount() : 0);
        event.setPackedWeightG(dimensions != null ? dimensions.getWeightG() : 0);
        event.setRecommendedOptionId(recommended != null ? recommended.id() : null);
        event.setRecommendedPriceYen(recommended != null ? recommended.priceYen() : 0);
        event.setSecondOptionId(secondBest != null ? secondBest.id() : null);
        event.setSecondOptionPriceYen(secondBest != null ? secondBest.priceYen() : null);
        event.setSavingYen(calculateSavingYen(recommended, secondBest));
        event.setRecommendedMaxDimensionCm(recommendedMaxDimension);
        event.setRecommendedVolumeCm3(recommendedVolumeCm3);
        event.setSecondMaxDimensionCm(secondMaxDimension);
        event.setSecondOptionVolumeCm3(secondOptionVolumeCm3);
        event.setSizeGapCm(sizeGapCm);
        event.setVolumeSavedCm3(volumeSavedCm3);
        event.setEstimatedCo2eSavedG(calculateEstimatedCo2eSavedG(sizeGapCm, dimensions != null ? dimensions.getWeightG() : 0));

        calculationEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public StatsSummaryResponse getSummary() {
        StatsSummaryResponse summary = calculationEventRepository.getSummary();
        if (summary != null) {
            return summary;
        }
        return new StatsSummaryResponse(0, 0, 0, 0, null);
    }

    @Transactional(readOnly = true)
    public StatsVolumeTrendResponse getRecentVolumeTrend() {
        List<CalculationEvent> recentEvents = calculationEventRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(0, DEFAULT_TREND_LIMIT));

        if (recentEvents.isEmpty()) {
            return new StatsVolumeTrendResponse(List.of());
        }

        List<CalculationEvent> chronological = new ArrayList<>(recentEvents);
        Collections.reverse(chronological);

        double runningTotal = 0;
        List<Double> points = new ArrayList<>(chronological.size());
        for (CalculationEvent event : chronological) {
            runningTotal += Math.max(0, event.getVolumeSavedCm3());
            points.add(runningTotal);
        }

        return new StatsVolumeTrendResponse(points);
    }

    @Transactional
    public void resetAllStats() {
        calculationEventRepository.deleteAllInBatch();
    }

    ShippingResultResponse findSecondBestOption(List<ShippingResultResponse> options) {
        if (options == null || options.isEmpty()) {
            return null;
        }

        return options.stream()
                .filter(option -> option != null && !option.recommended() && option.canFit())
                .findFirst()
                .orElse(null);
    }

    int calculateSavingYen(ShippingResultResponse recommended, ShippingResultResponse secondBest) {
        if (recommended == null || secondBest == null) {
            return 0;
        }
        return Math.max(0, secondBest.priceYen() - recommended.priceYen());
    }

    int calculateEstimatedCo2eSavedG(double sizeGapCm, int packedWeightG) {
        if (sizeGapCm <= 0) {
            return 0;
        }

        double weightKg = packedWeightG / 1000.0;
        double weightFactor = clamp(weightKg, MIN_WEIGHT_FACTOR, MAX_WEIGHT_FACTOR);
        return (int) Math.round(sizeGapCm * CO2E_GRAMS_PER_CM * weightFactor);
    }

    private double getMaxDimension(ShippingResultResponse option) {
        if (option == null) {
            return 0;
        }
        return Math.max(option.maxLength(), Math.max(option.maxWidth(), option.maxHeight()));
    }

    private double getVolumeCm3(ShippingResultResponse option) {
        if (option == null) {
            return 0;
        }
        return option.maxLength() * option.maxWidth() * option.maxHeight();
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
