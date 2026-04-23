package com.meeting.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
    private final SecretKey secretKey;
    private final long expiryHours;

    public JwtService(@Value("${meeting.jwt-secret}") String secret, @Value("${meeting.jwt-expiry-hours}") long expiryHours) {
        this.secretKey = Keys.hmacShaKeyFor(normalizeSecret(secret));
        this.expiryHours = expiryHours;
    }

    public String generateToken(long userId, String username, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .claims(Map.of(
                        "user_id", userId,
                        "username", username,
                        "role", role
                ))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiryHours, ChronoUnit.HOURS)))
                .signWith(secretKey)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload();
    }

    private byte[] normalizeSecret(String secret) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
