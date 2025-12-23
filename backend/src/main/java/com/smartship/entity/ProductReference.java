package com.smartship.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.io.Serializable;

@Entity
@Table(name = "product_reference")
public class ProductReference implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_jp", nullable = false, length = 100)
    private String nameJp;

    @Column(name = "length_cm", nullable = false)
    private double lengthCm;

    @Column(name = "width_cm", nullable = false)
    private double widthCm;

    @Column(name = "height_cm", nullable = false)
    private double heightCm;

    @Column(name = "weight_g", nullable = false)
    private int weightG;

    @Column(name = "image_icon", length = 50)
    private String imageIcon;

    public ProductReference() {}

    public ProductReference(Integer id, String category, String name, String nameJp,
                            double lengthCm, double widthCm, double heightCm,
                            int weightG, String imageIcon) {
        this.id = id;
        this.category = category;
        this.name = name;
        this.nameJp = nameJp;
        this.lengthCm = lengthCm;
        this.widthCm = widthCm;
        this.heightCm = heightCm;
        this.weightG = weightG;
        this.imageIcon = imageIcon;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getNameJp() { return nameJp; }
    public void setNameJp(String nameJp) { this.nameJp = nameJp; }

    public double getLengthCm() { return lengthCm; }
    public void setLengthCm(double lengthCm) { this.lengthCm = lengthCm; }

    public double getWidthCm() { return widthCm; }
    public void setWidthCm(double widthCm) { this.widthCm = widthCm; }

    public double getHeightCm() { return heightCm; }
    public void setHeightCm(double heightCm) { this.heightCm = heightCm; }

    public int getWeightG() { return weightG; }
    public void setWeightG(int weightG) { this.weightG = weightG; }

    public String getImageIcon() { return imageIcon; }
    public void setImageIcon(String imageIcon) { this.imageIcon = imageIcon; }

    @Transient
    public double getVolumeCm3() {
        return lengthCm * widthCm * heightCm;
    }

    @Override
    public String toString() {
        return String.format("ProductReference[id=%d, name=%s, %s, %.1f×%.1f×%.1fcm, %dg]",
            id, nameJp, category, lengthCm, widthCm, heightCm, weightG);
    }
}
