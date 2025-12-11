package jv16_Kadai03_B19.service;

import java.util.ArrayList;
import java.util.List;

import jv16_Kadai03_B19.dao.CarrierDAO;
import jv16_Kadai03_B19.model.Dimensions;
import jv16_Kadai03_B19.model.ShippingCarrier;
import jv16_Kadai03_B19.model.ShippingResult;

/**
 * Service for matching dimensions to available shipping carriers.
 * Finds the best (cheapest) option and explains why.
 */
public class ShippingMatcher {
    
    private CarrierDAO carrierDAO;
    
    public ShippingMatcher() {
        this.carrierDAO = new CarrierDAO();
    }
    
    /**
     * Find all shipping options for the given dimensions.
     * Returns a list sorted by price, with the cheapest marked as recommended.
     */
    public List<ShippingResult> findBestOptions(Dimensions dims) {
        List<ShippingResult> results = new ArrayList<>();
        
        if (dims == null || dims.getItemCount() == 0) {
            return results;
        }
        
        // Get all carriers from database
        List<ShippingCarrier> allCarriers = carrierDAO.getAllCarriers();
        
        // Check each carrier
        ShippingCarrier cheapestFitting = null;
        List<ShippingCarrier> notFitting = new ArrayList<>();
        
        for (ShippingCarrier carrier : allCarriers) {
            boolean canFit = carrier.canFit(
                dims.getLengthCm(), 
                dims.getWidthCm(), 
                dims.getHeightCm(), 
                dims.getWeightG()
            );
            
            if (canFit) {
                // Check if dimensions require size sum check
                String reason = generateFitReason(carrier, dims);
                
                // Mark the first fitting carrier as cheapest (already sorted by price)
                boolean isRecommended = (cheapestFitting == null);
                if (isRecommended) {
                    cheapestFitting = carrier;
                }
                
                results.add(new ShippingResult(carrier, true, isRecommended, reason));
            } else {
                notFitting.add(carrier);
            }
        }
        
        // If no carriers fit, return size over message
        if (results.isEmpty()) {
            return results; // Empty means size over
        }
        
        // Add reason to the recommended option explaining why others don't fit
        if (!results.isEmpty() && !notFitting.isEmpty()) {
            ShippingResult recommended = results.get(0);
            String betterReason = generateRecommendationReason(recommended.getCarrier(), notFitting, dims);
            recommended.setReason(betterReason);
        }
        
        return results;
    }
    
    /**
     * Get only the recommended (cheapest) option, or null if none fit.
     */
    public ShippingResult getRecommendedOption(Dimensions dims) {
        List<ShippingResult> options = findBestOptions(dims);
        if (options.isEmpty()) {
            return null;
        }
        return options.get(0);
    }
    
    /**
     * Check if any carrier can fit the dimensions.
     */
    public boolean canShip(Dimensions dims) {
        return getRecommendedOption(dims) != null;
    }
    
    /**
     * Generate a reason why this carrier fits.
     */
    private String generateFitReason(ShippingCarrier carrier, Dimensions dims) {
        StringBuilder reason = new StringBuilder();
        
        // Check if using size sum limit
        if (carrier.getSizeSumLimit() != null) {
            double sizeSum = dims.getSizeSum();
            reason.append(String.format("3辺合計 %.0fcm (上限 %dcm)", sizeSum, carrier.getSizeSumLimit()));
        } else {
            reason.append(String.format("%.0f×%.0f×%.0fcm 対応", 
                carrier.getMaxLength(), carrier.getMaxWidth(), carrier.getMaxHeight()));
        }
        
        return reason.toString();
    }
    
    /**
     * Generate a reason explaining why this is recommended over cheaper alternatives.
     */
    private String generateRecommendationReason(ShippingCarrier recommended, 
                                                 List<ShippingCarrier> notFitting,
                                                 Dimensions dims) {
        // Find the cheapest carrier that didn't fit
        ShippingCarrier cheaperNotFit = null;
        for (ShippingCarrier carrier : notFitting) {
            if (carrier.getPriceYen() < recommended.getPriceYen()) {
                cheaperNotFit = carrier;
                break; // First one is cheapest (sorted by price)
            }
        }
        
        if (cheaperNotFit == null) {
            return "最安価格の配送方法です！";
        }
        
        // Explain why the cheaper one doesn't fit
        StringBuilder reason = new StringBuilder();
        reason.append(cheaperNotFit.getServiceName()).append("は使えない理由: ");
        
        // Check what exceeded
        if (dims.getHeightCm() > cheaperNotFit.getMaxHeight()) {
            reason.append(String.format("厚さ超過 (%.1fcm > %.1fcm)", 
                dims.getHeightCm(), cheaperNotFit.getMaxHeight()));
        } else if (dims.getLengthCm() > cheaperNotFit.getMaxLength()) {
            reason.append(String.format("長さ超過 (%.1fcm > %.1fcm)", 
                dims.getLengthCm(), cheaperNotFit.getMaxLength()));
        } else if (dims.getWidthCm() > cheaperNotFit.getMaxWidth()) {
            reason.append(String.format("幅超過 (%.1fcm > %.1fcm)", 
                dims.getWidthCm(), cheaperNotFit.getMaxWidth()));
        } else if (dims.getWeightG() > cheaperNotFit.getMaxWeightG()) {
            reason.append(String.format("重量超過 (%dg > %dg)", 
                dims.getWeightG(), cheaperNotFit.getMaxWeightG()));
        } else if (cheaperNotFit.getSizeSumLimit() != null && 
                   dims.getSizeSum() > cheaperNotFit.getSizeSumLimit()) {
            reason.append(String.format("サイズ超過 (3辺合計 %.0fcm > %dcm)", 
                dims.getSizeSum(), cheaperNotFit.getSizeSumLimit()));
        }
        
        return reason.toString();
    }
}
