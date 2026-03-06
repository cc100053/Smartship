package com.smartship.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "calculation_events")
public class CalculationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "calculation_mode", nullable = false, length = 20)
    private String calculationMode;

    @Column(name = "item_count", nullable = false)
    private int itemCount;

    @Column(name = "packed_weight_g", nullable = false)
    private int packedWeightG;

    @Column(name = "recommended_option_id")
    private Integer recommendedOptionId;

    @Column(name = "recommended_price_yen", nullable = false)
    private int recommendedPriceYen;

    @Column(name = "second_option_id")
    private Integer secondOptionId;

    @Column(name = "second_option_price_yen")
    private Integer secondOptionPriceYen;

    @Column(name = "saving_yen", nullable = false)
    private int savingYen;

    @Column(name = "recommended_max_dimension_cm", nullable = false)
    private double recommendedMaxDimensionCm;

    @Column(name = "recommended_volume_cm3", nullable = false)
    private double recommendedVolumeCm3;

    @Column(name = "second_max_dimension_cm")
    private Double secondMaxDimensionCm;

    @Column(name = "second_option_volume_cm3")
    private Double secondOptionVolumeCm3;

    @Column(name = "size_gap_cm", nullable = false)
    private double sizeGapCm;

    @Column(name = "volume_saved_cm3", nullable = false)
    private double volumeSavedCm3;

    @Column(name = "estimated_co2e_saved_g", nullable = false)
    private int estimatedCo2eSavedG;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getCalculationMode() {
        return calculationMode;
    }

    public void setCalculationMode(String calculationMode) {
        this.calculationMode = calculationMode;
    }

    public int getItemCount() {
        return itemCount;
    }

    public void setItemCount(int itemCount) {
        this.itemCount = itemCount;
    }

    public int getPackedWeightG() {
        return packedWeightG;
    }

    public void setPackedWeightG(int packedWeightG) {
        this.packedWeightG = packedWeightG;
    }

    public Integer getRecommendedOptionId() {
        return recommendedOptionId;
    }

    public void setRecommendedOptionId(Integer recommendedOptionId) {
        this.recommendedOptionId = recommendedOptionId;
    }

    public int getRecommendedPriceYen() {
        return recommendedPriceYen;
    }

    public void setRecommendedPriceYen(int recommendedPriceYen) {
        this.recommendedPriceYen = recommendedPriceYen;
    }

    public Integer getSecondOptionId() {
        return secondOptionId;
    }

    public void setSecondOptionId(Integer secondOptionId) {
        this.secondOptionId = secondOptionId;
    }

    public Integer getSecondOptionPriceYen() {
        return secondOptionPriceYen;
    }

    public void setSecondOptionPriceYen(Integer secondOptionPriceYen) {
        this.secondOptionPriceYen = secondOptionPriceYen;
    }

    public int getSavingYen() {
        return savingYen;
    }

    public void setSavingYen(int savingYen) {
        this.savingYen = savingYen;
    }

    public double getRecommendedMaxDimensionCm() {
        return recommendedMaxDimensionCm;
    }

    public void setRecommendedMaxDimensionCm(double recommendedMaxDimensionCm) {
        this.recommendedMaxDimensionCm = recommendedMaxDimensionCm;
    }

    public Double getSecondMaxDimensionCm() {
        return secondMaxDimensionCm;
    }

    public void setSecondMaxDimensionCm(Double secondMaxDimensionCm) {
        this.secondMaxDimensionCm = secondMaxDimensionCm;
    }

    public double getRecommendedVolumeCm3() {
        return recommendedVolumeCm3;
    }

    public void setRecommendedVolumeCm3(double recommendedVolumeCm3) {
        this.recommendedVolumeCm3 = recommendedVolumeCm3;
    }

    public Double getSecondOptionVolumeCm3() {
        return secondOptionVolumeCm3;
    }

    public void setSecondOptionVolumeCm3(Double secondOptionVolumeCm3) {
        this.secondOptionVolumeCm3 = secondOptionVolumeCm3;
    }

    public double getSizeGapCm() {
        return sizeGapCm;
    }

    public void setSizeGapCm(double sizeGapCm) {
        this.sizeGapCm = sizeGapCm;
    }

    public double getVolumeSavedCm3() {
        return volumeSavedCm3;
    }

    public void setVolumeSavedCm3(double volumeSavedCm3) {
        this.volumeSavedCm3 = volumeSavedCm3;
    }

    public int getEstimatedCo2eSavedG() {
        return estimatedCo2eSavedG;
    }

    public void setEstimatedCo2eSavedG(int estimatedCo2eSavedG) {
        this.estimatedCo2eSavedG = estimatedCo2eSavedG;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
