package org.example.project2.global.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.example.project2.global.security.AuthProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

@Component
@EnableConfigurationProperties(AuthProperties.class)
@RequiredArgsConstructor
public class JwtProvider {
    private final AuthProperties p;

    private SecretKey getSecretKey() {
        return Keys.hmacShaKeyFor(p.jwt().secretKey().getBytes());
    }

    public String issueToken(String username) {
        Date now = new Date();
        Date expiration = new Date(now.getTime()
                + p.jwt().accessTokenExpiry().toMillis());
        return Jwts.builder()
                .signWith(getSecretKey())
                .issuedAt(now)
                .expiration(expiration)
                .subject(username)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(getSecretKey())
                .build()
                .parseSignedClaims(token) // exception
                .getPayload();
    }

    public RefreshTokenDetail createRefreshToken(String username) {
        // parse는 공용으로 쓰고 claims 내부의 값으로 refresh token 인지 여부를 판단
        Date now = new Date();
        Date expiration = new Date(now.getTime()
                + p.jwt().refreshTokenExpiry().toMillis());
        String jti = UUID.randomUUID().toString();
        String token = Jwts.builder()
                .id(jti)
                .signWith(getSecretKey())
                .issuedAt(now)
                .expiration(expiration)
                .subject(username)
                .compact();
        long ttl = p.jwt().refreshTokenExpiry().toSeconds(); // 초단위
        return new RefreshTokenDetail(token, jti, ttl);
    }

    public record RefreshTokenDetail(String token, String jti, long ttl) {
    }
}