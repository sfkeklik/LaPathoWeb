package com.cvlab.spring.LaPatho.security.controller;
}
    }
        return ResponseEntity.ok(authService.register(request));
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
    @PostMapping("/register")

    }
        return ResponseEntity.ok(authService.login(request));
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
    @PostMapping("/login")

    private final AuthService authService;

public class AuthController {
@RequiredArgsConstructor
@RequestMapping("/api/auth")
@RestController

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import com.cvlab.spring.LaPatho.security.service.AuthService;
import com.cvlab.spring.LaPatho.security.dto.RegisterRequest;
import com.cvlab.spring.LaPatho.security.dto.LoginRequest;
import com.cvlab.spring.LaPatho.security.dto.AuthResponse;


