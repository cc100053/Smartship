package com.smartship.controller;

import com.smartship.dto.request.CreateSavedProductRequest;
import com.smartship.dto.response.PersonalizedProductsResponse;
import com.smartship.dto.response.ProductResponse;
import com.smartship.entity.Account;
import com.smartship.service.AuthService;
import com.smartship.service.UserProductService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
public class UserProductController {

    private final AuthService authService;
    private final UserProductService userProductService;

    public UserProductController(AuthService authService, UserProductService userProductService) {
        this.authService = authService;
        this.userProductService = userProductService;
    }

    @GetMapping("/products")
    public PersonalizedProductsResponse getPersonalizedProducts(HttpServletRequest request) {
        Account account = authService.requireCurrentAccount(request);
        return userProductService.getPersonalizedProducts(account);
    }

    @PostMapping("/saved-products")
    public ProductResponse createSavedProduct(@Valid @RequestBody CreateSavedProductRequest requestBody, HttpServletRequest request) {
        Account account = authService.requireCurrentAccount(request);
        return userProductService.createSavedProduct(account, requestBody);
    }

    @DeleteMapping("/saved-products/{savedProductId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSavedProduct(@PathVariable Long savedProductId, HttpServletRequest request) {
        Account account = authService.requireCurrentAccount(request);
        userProductService.deleteSavedProduct(account, savedProductId);
    }

    @PostMapping("/liked-products/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void likeProduct(@PathVariable Integer productId, HttpServletRequest request) {
        Account account = authService.requireCurrentAccount(request);
        userProductService.likeProduct(account, productId);
    }

    @DeleteMapping("/liked-products/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlikeProduct(@PathVariable Integer productId, HttpServletRequest request) {
        Account account = authService.requireCurrentAccount(request);
        userProductService.unlikeProduct(account, productId);
    }
}
