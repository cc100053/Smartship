package com.smartship.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartship.dto.Dimensions;
import com.smartship.dto.response.CalculationResponse;
import com.smartship.dto.response.ShippingResultResponse;
import com.smartship.dto.response.StatsSummaryResponse;
import com.smartship.entity.CalculationEvent;
import com.smartship.repository.CalculationEventRepository;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StatsServiceTest {

    @Mock
    private CalculationEventRepository calculationEventRepository;

    private StatsService statsService;

    @BeforeEach
    void setUp() {
        statsService = new StatsService(calculationEventRepository);
    }

    @Test
    void recordSuccessfulCalculationStoresSavingsAndCo2e() {
        CalculationResponse response = new CalculationResponse(
                new Dimensions(20, 15, 4, 1200, 3),
                option(1, "推奨", 450, 25, 20, 5, true),
                List.of(
                        option(1, "推奨", 450, 25, 20, 5, true),
                        option(2, "次選", 700, 60, 60, 60, false)));

        statsService.recordSuccessfulCalculation("cart", response);

        ArgumentCaptor<CalculationEvent> captor = forClass(CalculationEvent.class);
        verify(calculationEventRepository).save(captor.capture());

        CalculationEvent saved = captor.getValue();
        assertThat(saved.getCalculationMode()).isEqualTo("cart");
        assertThat(saved.getItemCount()).isEqualTo(3);
        assertThat(saved.getPackedWeightG()).isEqualTo(1200);
        assertThat(saved.getSavingYen()).isEqualTo(250);
        assertThat(saved.getRecommendedMaxDimensionCm()).isEqualTo(25);
        assertThat(saved.getSecondMaxDimensionCm()).isEqualTo(60);
        assertThat(saved.getSizeGapCm()).isEqualTo(35);
        assertThat(saved.getEstimatedCo2eSavedG()).isEqualTo(504);
    }

    @Test
    void recordSuccessfulCalculationFallsBackToZeroWhenNoSecondOptionExists() {
        CalculationResponse response = new CalculationResponse(
                new Dimensions(20, 15, 4, 300, 1),
                option(1, "推奨", 450, 25, 20, 5, true),
                List.of(option(1, "推奨", 450, 25, 20, 5, true)));

        statsService.recordSuccessfulCalculation("manual", response);

        ArgumentCaptor<CalculationEvent> captor = forClass(CalculationEvent.class);
        verify(calculationEventRepository).save(captor.capture());

        CalculationEvent saved = captor.getValue();
        assertThat(saved.getSavingYen()).isZero();
        assertThat(saved.getSecondOptionId()).isNull();
        assertThat(saved.getSecondMaxDimensionCm()).isNull();
        assertThat(saved.getEstimatedCo2eSavedG()).isZero();
    }

    @Test
    void getSummaryReturnsRepositoryAggregate() {
        StatsSummaryResponse summary = new StatsSummaryResponse(12, 3450, 678, 44, Instant.parse("2026-03-06T12:34:56Z"));
        when(calculationEventRepository.getSummary()).thenReturn(summary);

        StatsSummaryResponse result = statsService.getSummary();

        assertThat(result).isEqualTo(summary);
    }

    private ShippingResultResponse option(
            Integer id,
            String serviceName,
            int priceYen,
            double maxLength,
            double maxWidth,
            double maxHeight,
            boolean recommended) {
        return new ShippingResultResponse(
                id,
                "テスト配送",
                serviceName,
                priceYen,
                true,
                null,
                null,
                maxLength,
                maxWidth,
                maxHeight,
                2000,
                null,
                true,
                recommended,
                null);
    }
}
