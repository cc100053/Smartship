package com.smartship.controller;

import com.smartship.dto.request.AuthRequest;
import com.smartship.dto.response.AuthSessionResponse;
import com.smartship.service.AuthService;
import jakarta.servlet.http.HttpSession;
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
    public AuthSessionResponse loginOrRegister(@RequestBody AuthRequest request, HttpSession session) {
        return authService.loginOrRegister(request.loginId(), request.password(), session);
    }

    @GetMapping("/session")
    public AuthSessionResponse getSession(HttpSession session) {
        return authService.getSession(session);
    }

    @PostMapping("/logout")
    public AuthSessionResponse logout(HttpSession session) {
        authService.logout(session);
        return new AuthSessionResponse(false, null, null, false, null);
    }
}
