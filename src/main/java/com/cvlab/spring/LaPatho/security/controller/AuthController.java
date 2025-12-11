package com.cvlab.spring.LaPatho.security.controller;

import com.cvlab.spring.LaPatho.security.dto.AuthResponse;
import com.cvlab.spring.LaPatho.security.dto.LoginRequest;
import com.cvlab.spring.LaPatho.security.dto.RegisterRequest;
import com.cvlab.spring.LaPatho.security.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }
}
