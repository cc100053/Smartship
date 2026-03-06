package com.smartship.controller;

import com.smartship.dto.request.AuthRequest;
import com.smartship.dto.response.AuthSessionResponse;
import com.smartship.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login-or-register")
    public AuthSessionResponse loginOrRegister(
            @RequestBody AuthRequest request,
            HttpServletResponse response) {
        return authService.loginOrRegister(request.loginId(), request.password(), response);
    }

    @GetMapping("/session")
    public AuthSessionResponse getSession(HttpServletRequest request) {
        return authService.getSession(request);
    }

    @PostMapping("/refresh")
    public AuthSessionResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        return authService.refresh(request, response);
    }

    @PostMapping("/logout")
    public AuthSessionResponse logout(HttpServletRequest request, HttpServletResponse response) {
        return authService.logout(request, response);
    }
}
