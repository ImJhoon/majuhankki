package org.example.project2.global.security.jwt;

import lombok.RequiredArgsConstructor;
import org.example.project2.global.security.AuthProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@EnableConfigurationProperties(AuthProperties.class)
public class AuthCookieUtil {
    private final AuthProperties p;

    public ResponseCookie deleteAccessTokenCookie() {
        return ResponseCookie.from("accessToken", "")
                .maxAge(0)
                .build();
    }

    public ResponseCookie createAccessTokenCookie(String token) {
        return ResponseCookie.from("accessToken", token)
                // 보안
                .httpOnly(true) // JS 조회 X -> XSS
                .secure(true) // https, localhost, 127.0.0.1 -> TLS 인증서를 통해서 암호화되지 않으면 쓸 수 X
                // 네트워크 상에서의 해킹 방지
                .sameSite("Strict") // 같은 출처여야함
                .path("/") // 똑같은 출처면 다 쓸 수 있게
                .maxAge(p.jwt().accessTokenExpiry())
                .build();
    }

    public ResponseCookie createRefreshTokenCookie(String token) {
        return ResponseCookie.from("refreshToken", token)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(p.jwt().refreshTokenExpiry())
                .build();
    }
}