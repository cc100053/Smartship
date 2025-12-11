package jv16_Kadai03_B19.dao;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

import jv16_Kadai03_B19.model.ShippingCarrier;

/**
 * Data Access Object for ShippingCarrier table.
 * Handles all database operations for shipping carriers.
 */
public class CarrierDAO {
    
    /**
     * Get all carriers from database, sorted by price
     */
    public List<ShippingCarrier> getAllCarriers() {
        List<ShippingCarrier> carriers = new ArrayList<>();
        String sql = "SELECT * FROM shipping_carrier ORDER BY price_yen";
        
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            
            while (rs.next()) {
                carriers.add(mapResultSetToCarrier(rs));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return carriers;
    }
    
    /**
     * Get carriers by company name
     */
    public List<ShippingCarrier> getCarriersByCompany(String companyName) {
        List<ShippingCarrier> carriers = new ArrayList<>();
        String sql = "SELECT * FROM shipping_carrier WHERE company_name = ? ORDER BY price_yen";
        
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setString(1, companyName);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    carriers.add(mapResultSetToCarrier(rs));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return carriers;
    }
    
    /**
     * Find carriers that can fit the given dimensions and weight.
     * This does the filtering in Java for more flexible logic.
     */
    public List<ShippingCarrier> findFittingCarriers(double length, double width, double height, int weightG) {
        List<ShippingCarrier> allCarriers = getAllCarriers();
        List<ShippingCarrier> fittingCarriers = new ArrayList<>();
        
        for (ShippingCarrier carrier : allCarriers) {
            if (carrier.canFit(length, width, height, weightG)) {
                fittingCarriers.add(carrier);
            }
        }
        
        return fittingCarriers;
    }
    
    /**
     * Get carrier by ID
     */
    public ShippingCarrier getCarrierById(int id) {
        String sql = "SELECT * FROM shipping_carrier WHERE id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToCarrier(rs);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Map ResultSet row to ShippingCarrier object
     */
    private ShippingCarrier mapResultSetToCarrier(ResultSet rs) throws SQLException {
        ShippingCarrier carrier = new ShippingCarrier();
        carrier.setId(rs.getInt("id"));
        carrier.setCompanyName(rs.getString("company_name"));
        carrier.setServiceName(rs.getString("service_name"));
        carrier.setMaxLength(rs.getDouble("max_length"));
        carrier.setMaxWidth(rs.getDouble("max_width"));
        carrier.setMaxHeight(rs.getDouble("max_height"));
        carrier.setMaxWeightG(rs.getInt("max_weight_g"));
        
        // Handle nullable size_sum_limit
        int sizeSumLimit = rs.getInt("size_sum_limit");
        carrier.setSizeSumLimit(rs.wasNull() ? null : sizeSumLimit);
        
        carrier.setPriceYen(rs.getInt("price_yen"));
        carrier.setHasTracking(rs.getBoolean("has_tracking"));
        carrier.setSendLocation(rs.getString("send_location"));
        carrier.setNotes(rs.getString("notes"));
        return carrier;
    }
}
