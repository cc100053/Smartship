package com.smartship.controller;

import com.smartship.dto.response.StatsSummaryResponse;
import com.smartship.dto.response.StatsVolumeTrendResponse;
import com.smartship.service.StatsService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/summary")
    public StatsSummaryResponse getSummary() {
        return statsService.getSummary();
    }

    @GetMapping("/volume-trend")
    public StatsVolumeTrendResponse getVolumeTrend() {
        return statsService.getRecentVolumeTrend();
    }

    @PostMapping("/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetStats() {
        statsService.resetAllStats();
    }
}
