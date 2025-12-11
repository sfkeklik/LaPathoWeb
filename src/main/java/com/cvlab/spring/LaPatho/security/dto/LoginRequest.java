package com.cvlab.spring.LaPatho.security.dto;
}
    private String password;
    @NotBlank(message = "Password is required")

    private String username;
    @NotBlank(message = "Username is required")
public class LoginRequest {
@AllArgsConstructor
@NoArgsConstructor
@Data

import lombok.NoArgsConstructor;
import lombok.Data;
import lombok.AllArgsConstructor;
import jakarta.validation.constraints.NotBlank;


