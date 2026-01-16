package com.smartship.service;

import com.smartship.dto.Dimensions;
import com.smartship.entity.ProductReference;
import com.smartship.entity.ShippingCarrier;
import com.smartship.repository.ShippingCarrierRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ShippingMatcher {

    public record ShippingMatch(
            ShippingCarrier carrier,
            boolean canFit,
            boolean recommended,
            String reason) {
    }

    private final ShippingCarrierRepository carrierRepository;
    private final PackingService packingService;

    public ShippingMatcher(ShippingCarrierRepository carrierRepository, PackingService packingService) {
        this.carrierRepository = carrierRepository;
        this.packingService = packingService;
    }

    public List<ShippingMatch> findBestOptions(List<ProductReference> items, Dimensions dims) {
        List<ShippingMatch> results = new ArrayList<>();

        if (items == null || items.isEmpty()) {
            return results;
        }

        List<ShippingCarrier> allCarriers = carrierRepository.findAllByOrderByPriceYenAsc();
        ShippingCarrier cheapestFitting = null;
        List<ShippingCarrier> notFitting = new ArrayList<>();

        for (ShippingCarrier carrier : allCarriers) {
            // Use 3D Packing Service for the definitive check
            boolean canFit = packingService.canFit(items, carrier);

            if (canFit) {
                String reason = generateFitReason(carrier, dims);
                boolean isRecommended = cheapestFitting == null;
                if (isRecommended) {
                    cheapestFitting = carrier;
                }

                results.add(new ShippingMatch(carrier, true, isRecommended, reason));
            } else {
                notFitting.add(carrier);
            }
        }

        if (results.isEmpty()) {
            return results;
        }

        if (!notFitting.isEmpty()) {
            ShippingMatch recommended = results.get(0);
            String betterReason = generateRecommendationReason(recommended.carrier(), notFitting, dims);
            results.set(0, new ShippingMatch(
                    recommended.carrier(),
                    recommended.canFit(),
                    recommended.recommended(),
                    betterReason));
        }

        return results;
    }

    public ShippingMatch getRecommendedOption(List<ProductReference> items, Dimensions dims) {
        List<ShippingMatch> options = findBestOptions(items, dims);
        if (options.isEmpty()) {
            return null;
        }
        return options.get(0);
    }

    private String generateFitReason(ShippingCarrier carrier, Dimensions dims) {
        StringBuilder reason = new StringBuilder();
        if (carrier.getSizeSumLimit() != null) {
            double sizeSum = dims.getSizeSum();
            reason.append(String.format("3辺合計 %.0fcm (上限 %dcm)", sizeSum, carrier.getSizeSumLimit()));
        } else {
            reason.append(String.format("%.0f×%.0f×%.0fcm 対応",
                    carrier.getMaxLength(), carrier.getMaxWidth(), carrier.getMaxHeight()));
        }
        return reason.toString();
    }

    private String generateRecommendationReason(ShippingCarrier recommended,
            List<ShippingCarrier> notFitting,
            Dimensions dims) {
        ShippingCarrier cheaperNotFit = null;
        for (ShippingCarrier carrier : notFitting) {
            if (carrier.getPriceYen() < recommended.getPriceYen()) {
                cheaperNotFit = carrier;
                // Keep looking to find the *closest* cheaper option (highest price among
                // cheaper ones)
                // Since the list is sorted by price ASC, the last one we find is the closest.
            }
        }

        if (cheaperNotFit == null) {
            return "最安価格の配送方法です！";
        }

        StringBuilder reason = new StringBuilder();
        reason.append(cheaperNotFit.getServiceName()).append("は使えない理由: ");

        // Use the old Stacked Dimensions to guess the reason.
        // This might be slightly inaccurate if 3D packing failed for a complex reason,
        // but it covers 90% of cases (too heavy, too big total volume).
        if (dims.getHeightCm() > cheaperNotFit.getMaxHeight()) {
            reason.append(String.format("厚さ超過 (%.1fcm > %.1fcm)",
                    dims.getHeightCm(), cheaperNotFit.getMaxHeight()));
        } else if (dims.getLengthCm() > cheaperNotFit.getMaxLength()) {
            reason.append(String.format("長さ超過 (%.1fcm > %.1fcm)",
                    dims.getLengthCm(), cheaperNotFit.getMaxLength()));
        } else if (dims.getWidthCm() > cheaperNotFit.getMaxWidth()) {
            reason.append(String.format("幅超過 (%.1fcm > %.1fcm)",
                    dims.getWidthCm(), cheaperNotFit.getMaxWidth()));
        } else if (cheaperNotFit.getMaxWeightG() != null
                && dims.getWeightG() > cheaperNotFit.getMaxWeightG()) {
            reason.append(String.format("重量超過 (%dg > %dg)",
                    dims.getWeightG(), cheaperNotFit.getMaxWeightG()));
        } else if (cheaperNotFit.getSizeSumLimit() != null
                && dims.getSizeSum() > cheaperNotFit.getSizeSumLimit()) {
            reason.append(String.format("サイズ超過 (3辺合計 %.0fcm > %dcm)",
                    dims.getSizeSum(), cheaperNotFit.getSizeSumLimit()));
        } else {
            reason.append("形状的に箱に入りません (3D Packing)");
        }

        return reason.toString();
    }
}
