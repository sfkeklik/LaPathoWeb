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
                    "http://localhost:4200",    // Development
                    "http://localhost",         // Production (port 80)
                    "http://localhost:80",      // Production explicit port
                    "http://192.168.18.42",     // Your specific IP
                    "http://192.168.18.42:80",  // Your specific IP with port 80
                    "http://192.168.18.42:8080" // Your specific IP with port 8080
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
