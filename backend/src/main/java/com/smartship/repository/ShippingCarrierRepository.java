package com.smartship.repository;

import com.smartship.entity.ShippingCarrier;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShippingCarrierRepository extends JpaRepository<ShippingCarrier, Integer> {
    // Sort by price only - trackable-first logic handled in ShippingMatcher
    List<ShippingCarrier> findAllByOrderByPriceYenAsc();
}
