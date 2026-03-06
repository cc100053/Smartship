package com.smartship.repository;

import com.smartship.dto.response.StatsSummaryResponse;
import com.smartship.entity.CalculationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CalculationEventRepository extends JpaRepository<CalculationEvent, Long> {

    @Query("""
            select new com.smartship.dto.response.StatsSummaryResponse(
                count(e),
                coalesce(sum(e.savingYen), 0),
                coalesce(sum(e.estimatedCo2eSavedG), 0),
                coalesce(sum(e.itemCount), 0),
                max(e.createdAt)
            )
            from CalculationEvent e
            """)
    StatsSummaryResponse getSummary();
}
