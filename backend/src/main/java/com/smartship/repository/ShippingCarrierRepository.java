package com.smartship.repository;

import com.smartship.entity.ShippingCarrier;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShippingCarrierRepository extends JpaRepository<ShippingCarrier, Integer> {
}
