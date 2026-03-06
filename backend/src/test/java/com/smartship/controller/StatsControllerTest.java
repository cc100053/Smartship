package com.smartship.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartship.dto.response.StatsSummaryResponse;
import com.smartship.service.StatsService;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(StatsController.class)
class StatsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StatsService statsService;

    @Test
    void getSummaryReturnsAggregatePayload() throws Exception {
        when(statsService.getSummary()).thenReturn(
                new StatsSummaryResponse(8, 2400, 360, 128500, Instant.parse("2026-03-06T08:30:00Z")));

        mockMvc.perform(get("/api/stats/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCalculations").value(8))
                .andExpect(jsonPath("$.estimatedYenSaved").value(2400))
                .andExpect(jsonPath("$.estimatedCo2eSavedG").value(360))
                .andExpect(jsonPath("$.cumulativeVolumeSavedCm3").value(128500))
                .andExpect(jsonPath("$.updatedAt").value("2026-03-06T08:30:00Z"));
    }

    @Test
    void resetStatsClearsEvents() throws Exception {
        mockMvc.perform(post("/api/stats/reset"))
                .andExpect(status().isNoContent());

        verify(statsService).resetAllStats();
    }
}
