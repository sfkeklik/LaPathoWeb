package com.cvlab.spring.LaPatho;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(
                    "http://localhost:4200",      // Development
                    "http://localhost",           // Production (port 80)
                    "http://localhost:80",        // Production explicit port
                    "http://192.168.18.245",
                    "http://192.168.18.245:80",
                    "http://192.168.18.245:8080",
                    "http://193.140.169.245",     // Your specific IP
                    "http://193.140.169.245:80",  // Your specific IP with port 80
                    "http://193.140.169.245:8080", // Your specific IP with port 8080
                    "https://193.140.169.245",    // HTTPS support
                    "https://193.140.169.245:443", // HTTPS explicit port
                    "http://193.140.169.245:4200" // Development port on server
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
