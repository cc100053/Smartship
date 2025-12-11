package jv16_Kadai03_B19.dao;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

import jv16_Kadai03_B19.model.ProductReference;

/**
 * Data Access Object for ProductReference table.
 * Handles all database operations for product references.
 */
public class ProductDAO {
    
    /**
     * Get all products from database
     */
    public List<ProductReference> getAllProducts() {
        List<ProductReference> products = new ArrayList<>();
        String sql = "SELECT * FROM product_reference ORDER BY category, name";
        
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            
            while (rs.next()) {
                products.add(mapResultSetToProduct(rs));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return products;
    }
    
    /**
     * Get products by category
     */
    public List<ProductReference> getProductsByCategory(String category) {
        List<ProductReference> products = new ArrayList<>();
        String sql = "SELECT * FROM product_reference WHERE category = ? ORDER BY name";
        
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setString(1, category);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    products.add(mapResultSetToProduct(rs));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return products;
    }
    
    /**
     * Get product by ID
     */
    public ProductReference getProductById(int id) {
        String sql = "SELECT * FROM product_reference WHERE id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToProduct(rs);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Get all unique categories
     */
    public List<String> getAllCategories() {
        List<String> categories = new ArrayList<>();
        String sql = "SELECT DISTINCT category FROM product_reference ORDER BY category";
        
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            
            while (rs.next()) {
                categories.add(rs.getString("category"));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return categories;
    }
    
    /**
     * Map ResultSet row to ProductReference object
     */
    private ProductReference mapResultSetToProduct(ResultSet rs) throws SQLException {
        ProductReference product = new ProductReference();
        product.setId(rs.getInt("id"));
        product.setCategory(rs.getString("category"));
        product.setName(rs.getString("name"));
        product.setNameJp(rs.getString("name_jp"));
        product.setLengthCm(rs.getDouble("length_cm"));
        product.setWidthCm(rs.getDouble("width_cm"));
        product.setHeightCm(rs.getDouble("height_cm"));
        product.setWeightG(rs.getInt("weight_g"));
        product.setImageIcon(rs.getString("image_icon"));
        return product;
    }
}
