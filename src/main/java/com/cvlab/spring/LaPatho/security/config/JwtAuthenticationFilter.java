package com.cvlab.spring.LaPatho.security.config;
}
    }
        filterChain.doFilter(request, response);

        }
            logger.debug("Invalid JWT token: " + e.getMessage());
            // Token is invalid, continue without authentication
        } catch (Exception e) {
            }
                }
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    );
                            userDetails.getAuthorities()
                            null,
                            userDetails,
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                if (jwtService.isTokenValid(jwt, userDetails)) {

                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            username = jwtService.extractUsername(jwt);
        try {

        jwt = authHeader.substring(7);

        }
            return;
            filterChain.doFilter(request, response);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {

        final String username;
        final String jwt;
        final String authHeader = request.getHeader("Authorization");
    ) throws ServletException, IOException {
            @NonNull FilterChain filterChain
            @NonNull HttpServletResponse response,
            @NonNull HttpServletRequest request,
    protected void doFilterInternal(
    @Override

    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
@RequiredArgsConstructor
@Component

import java.io.IOException;

import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.stereotype.Component;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.lang.NonNull;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.ServletException;
import jakarta.servlet.FilterChain;
import com.cvlab.spring.LaPatho.security.service.JwtService;


