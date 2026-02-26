package com.smartship.service;

import com.smartship.dto.Dimensions;
import com.smartship.dto.PackingResult;
import com.smartship.entity.ProductReference;
import com.smartship.entity.ShippingCarrier;
import com.smartship.repository.ShippingCarrierRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    /**
     * Find best shipping options by trying to pack items into each carrier's
     * container.
     * 
     * KEY IMPROVEMENT: Instead of calculating a single bounding box and checking
     * which
     * containers it fits, we now TRY PACKING into each container. This allows the
     * 3D
     * algorithm to rotate/arrange items differently per container, potentially
     * finding
     * cheaper options (e.g., laying items flat to fit ネコポス's 3cm height).
     * 
     * @param items The products to ship
     * @param dims  Pre-calculated dimensions (used for weight check and "why not"
     *              reasons)
     * @return List of shipping options, cheapest fitting first
     */
    public List<ShippingMatch> findBestOptions(List<ProductReference> items, Dimensions dims) {
        List<ShippingMatch> results = new ArrayList<>();

        if (items == null || items.isEmpty()) {
            return results;
        }

        // Get all carriers sorted by price (cheapest first)
        List<ShippingCarrier> allCarriers = carrierRepository.findAllByOrderByPriceYenAsc();
        List<ShippingCarrier> fittingCarriers = new ArrayList<>();
        List<ShippingCarrier> notFitting = new ArrayList<>();
        Map<ShippingCarrier, Dimensions> fittingDimsByCarrier = new HashMap<>();
        Map<ShippingCarrier, String> notFitReasonByCarrier = new HashMap<>();

        // First pass: Try ACTUAL 3D packing for each carrier (not just dimension check)
        for (ShippingCarrier carrier : allCarriers) {
            // Quick pre-check 1: weight must fit (no packing can fix overweight)
            if (carrier.getMaxWeightG() != null && dims.getWeightG() > carrier.getMaxWeightG()) {
                notFitting.add(carrier);
                notFitReasonByCarrier.put(carrier,
                        String.format("重量超過 (%dg > %dg)", dims.getWeightG(), carrier.getMaxWeightG()));
                continue;
            }

            // Carrier-specific packing result (single container). This prevents
            // false rejections from using only global packed dimensions.
            PackingResult packedForCarrier = packingService.calculatePackedResultForCarrier(items, carrier);
            if (packedForCarrier == null || packedForCarrier.dimensions() == null) {
                notFitting.add(carrier);
                notFitReasonByCarrier.put(carrier, "形状的に箱に入りません (3D Packing)");
                continue;
            }

            Dimensions carrierDims = packedForCarrier.dimensions();

            // Apply size-sum rule using carrier-specific packed dimensions.
            if (carrier.getSizeSumLimit() != null && carrierDims.getSizeSum() > carrier.getSizeSumLimit()) {
                notFitting.add(carrier);
                notFitReasonByCarrier.put(carrier,
                        String.format("サイズ超過 (3辺合計 %.1fcm > %dcm)",
                                carrierDims.getSizeSum(), carrier.getSizeSumLimit()));
                continue;
            }

            fittingCarriers.add(carrier);
            fittingDimsByCarrier.put(carrier, carrierDims);
        }

        if (fittingCarriers.isEmpty()) {
            return results;
        }

        // Find the cheapest TRACKABLE option for recommendation
        ShippingCarrier recommended = null;
        for (ShippingCarrier carrier : fittingCarriers) {
            if (Boolean.TRUE.equals(carrier.getHasTracking())) {
                recommended = carrier;
                break; // First trackable (already sorted by price) is cheapest trackable
            }
        }

        // If no trackable option found, use the cheapest overall
        if (recommended == null) {
            recommended = fittingCarriers.get(0);
        }

        // Build results: recommended first, then all others sorted by price
        for (ShippingCarrier carrier : fittingCarriers) {
            boolean isRecommended = carrier.equals(recommended);
            String reason = generateFitReason(carrier, fittingDimsByCarrier.getOrDefault(carrier, dims));
            results.add(new ShippingMatch(carrier, true, isRecommended, reason));
        }

        // Move recommended to the front if it's not already there
        for (int i = 0; i < results.size(); i++) {
            if (results.get(i).recommended()) {
                ShippingMatch rec = results.remove(i);
                results.add(0, rec);
                break;
            }
        }

        // Update recommended with "why not" reason
        if (!notFitting.isEmpty() && !results.isEmpty()) {
            ShippingMatch rec = results.get(0);
            String sizeInfo = generateFitReason(rec.carrier(), fittingDimsByCarrier.getOrDefault(rec.carrier(), dims));
            String whyNot = generateWhyNotReason(rec.carrier(), notFitting, notFitReasonByCarrier, dims);
            String combinedReason = sizeInfo + (whyNot != null ? "|||" + whyNot : "");
            results.set(0, new ShippingMatch(
                    rec.carrier(),
                    rec.canFit(),
                    rec.recommended(),
                    combinedReason));
        }

        return results;
    }

    private boolean checkDimensionsFit(ShippingCarrier carrier, Dimensions dims) {
        // 1. Check Weight
        if (carrier.getMaxWeightG() != null && dims.getWeightG() > carrier.getMaxWeightG()) {
            return false;
        }

        // 2. Check Size Sum (if applicable)
        if (carrier.getSizeSumLimit() != null) {
            if (dims.getSizeSum() > carrier.getSizeSumLimit()) {
                return false;
            }
        }

        // 3. Check Geometry (Length x Width x Height)
        // We sort both dimensions to check if they fit in ANY orientation
        // Since the 3D packer already produced a bounding box (L, W, H),
        // we check if that bounding box fits inside the carrier's max dimensions.
        double[] itemDims = { dims.getLengthCm(), dims.getWidthCm(), dims.getHeightCm() };
        // Handle null dimensions (unlimited) by using MAX_VALUE
        double cL = carrier.getMaxLength() != null ? carrier.getMaxLength() : Double.MAX_VALUE;
        double cW = carrier.getMaxWidth() != null ? carrier.getMaxWidth() : Double.MAX_VALUE;
        double cH = carrier.getMaxHeight() != null ? carrier.getMaxHeight() : Double.MAX_VALUE;

        double[] carrierDims = { cL, cW, cH };

        java.util.Arrays.sort(itemDims);
        java.util.Arrays.sort(carrierDims);

        // Check if smallest item dim fits in smallest carrier dim, etc.
        return itemDims[0] <= carrierDims[0] &&
                itemDims[1] <= carrierDims[1] &&
                itemDims[2] <= carrierDims[2];
    }

    public ShippingMatch getRecommendedOption(List<ProductReference> items, Dimensions dims) {
        List<ShippingMatch> options = findBestOptions(items, dims);
        if (options.isEmpty()) {
            return null;
        }
        return options.get(0);
    }

    private String generateFitReason(ShippingCarrier carrier, Dimensions dims) {
        if (carrier.getSizeSumLimit() != null) {
            return String.format("3辺合計 %dcm対応", carrier.getSizeSumLimit());
        } else {
            return String.format("最大 %.0f×%.0f×%.0fcm",
                    carrier.getMaxLength(), carrier.getMaxWidth(), carrier.getMaxHeight());
        }
    }

    private String generateWhyNotReason(ShippingCarrier recommended,
            List<ShippingCarrier> notFitting,
            Map<ShippingCarrier, String> notFitReasonByCarrier,
            Dimensions dims) {
        ShippingCarrier nearestCheaper = null;
        int nearestCheaperPrice = 0;

        for (ShippingCarrier carrier : notFitting) {
            if (carrier.getPriceYen() < recommended.getPriceYen()) {
                // Find the closest cheaper option (highest price among cheaper ones)
                if (nearestCheaper == null || carrier.getPriceYen() > nearestCheaperPrice) {
                    nearestCheaper = carrier;
                    nearestCheaperPrice = carrier.getPriceYen();
                }
            }
        }

        if (nearestCheaper == null) {
            return null; // No cheaper options, just show size info
        }

        String explicitReason = notFitReasonByCarrier.get(nearestCheaper);
        if (explicitReason != null && !explicitReason.isBlank()) {
            return nearestCheaper.getServiceName() + "は使えない理由: " + explicitReason;
        }

        StringBuilder reason = new StringBuilder();
        reason.append(nearestCheaper.getServiceName()).append("は使えない理由: ");

        // Use the old Stacked Dimensions to guess the reason.
        // This might be slightly inaccurate if 3D packing failed for a complex reason,
        // but it covers 90% of cases (too heavy, too big total volume).
        if (nearestCheaper.getMaxHeight() != null && dims.getHeightCm() > nearestCheaper.getMaxHeight()) {
            reason.append(String.format("厚さ超過 (%.1fcm > %.1fcm)",
                    dims.getHeightCm(), nearestCheaper.getMaxHeight()));
        } else if (nearestCheaper.getMaxLength() != null && dims.getLengthCm() > nearestCheaper.getMaxLength()) {
            reason.append(String.format("長さ超過 (%.1fcm > %.1fcm)",
                    dims.getLengthCm(), nearestCheaper.getMaxLength()));
        } else if (nearestCheaper.getMaxWidth() != null && dims.getWidthCm() > nearestCheaper.getMaxWidth()) {
            reason.append(String.format("幅超過 (%.1fcm > %.1fcm)",
                    dims.getWidthCm(), nearestCheaper.getMaxWidth()));
        } else if (nearestCheaper.getMaxWeightG() != null
                && dims.getWeightG() > nearestCheaper.getMaxWeightG()) {
            reason.append(String.format("重量超過 (%dg > %dg)",
                    dims.getWeightG(), nearestCheaper.getMaxWeightG()));
        } else if (nearestCheaper.getSizeSumLimit() != null
                && dims.getSizeSum() > nearestCheaper.getSizeSumLimit()) {
            reason.append(String.format("サイズ超過 (3辺合計 %.0fcm > %dcm)",
                    dims.getSizeSum(), nearestCheaper.getSizeSumLimit()));
        } else {
            reason.append("形状的に箱に入りません (3D Packing)");
        }

        return reason.toString();
    }
}
