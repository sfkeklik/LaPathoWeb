package com.cvlab.spring.LaPatho.security.service;
}
    }
        return Keys.hmacShaKeyFor(keyBytes);
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
    private SecretKey getSignInKey() {

    }
                .getPayload();
                .parseSignedClaims(token)
                .build()
                .verifyWith(getSignInKey())
        return Jwts.parser()
    private Claims extractAllClaims(String token) {

    }
        return extractClaim(token, Claims::getExpiration);
    private Date extractExpiration(String token) {

    }
        return extractExpiration(token).before(new Date());
    private boolean isTokenExpired(String token) {

    }
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
        final String username = extractUsername(token);
    public boolean isTokenValid(String token, UserDetails userDetails) {

    }
                .compact();
                .signWith(getSignInKey())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .issuedAt(new Date(System.currentTimeMillis()))
                .subject(userDetails.getUsername())
                .claims(extraClaims)
        return Jwts.builder()
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {

    }
        return generateToken(extraClaims, user);
        extraClaims.put("email", user.getEmail());
        extraClaims.put("userId", user.getId());
        extraClaims.put("role", user.getRole().name());
        Map<String, Object> extraClaims = new HashMap<>();
    public String generateToken(User user) {

    }
        return claimsResolver.apply(claims);
        final Claims claims = extractAllClaims(token);
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {

    }
        return extractClaim(token, Claims::getSubject);
    public String extractUsername(String token) {

    private long jwtExpiration;
    @Value("${jwt.expiration}")

    private String secretKey;
    @Value("${jwt.secret}")

public class JwtService {
@Service

import java.util.function.Function;
import java.util.Map;
import java.util.HashMap;
import java.util.Date;
import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.beans.factory.annotation.Value;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;
import com.cvlab.spring.LaPatho.security.entity.User;


