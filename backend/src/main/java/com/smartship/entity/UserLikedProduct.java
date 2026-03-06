package com.smartship.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
        name = "user_liked_products",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_liked_products_account_product", columnNames = {
                "account_id", "product_reference_id" }))
public class UserLikedProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_reference_id", nullable = false)
    private ProductReference productReference;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UserLikedProduct() {
    }

    public UserLikedProduct(Account account, ProductReference productReference) {
        this.account = account;
        this.productReference = productReference;
    }

    public Long getId() {
        return id;
    }

    public Account getAccount() {
        return account;
    }

    public ProductReference getProductReference() {
        return productReference;
    }
}
