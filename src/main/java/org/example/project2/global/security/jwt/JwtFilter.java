package org.example.project2.global.security.jwt;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
//@EnableConfigurationProperties(AuthProperties.class)
public class JwtFilter extends OncePerRequestFilter {
//    private final AuthProperties p;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            // 1. extractToken (cookie, header)
            String token = extractToken(request); // request -> cookie, header...
            // 2. extractClaims
            Claims claims = extractClaims(token); // jwtProvider -> claims
            // 3. Authentication
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    claims.getSubject(),
                    null,
                    AuthorityUtils.createAuthorityList("ROLE_USER")
            );
            SecurityContext context = SecurityContextHolder.getContext();
//            context.setAuthentication(null);
            context.setAuthentication(auth);
            System.out.println("인증 완료");
        } catch (Exception e) {
//            e.printStackTrace();
            if (!refreshAuth(request, response)) {
                SecurityContextHolder.clearContext();
            }
        }
        // 무조건 실행이 되어야함
        filterChain.doFilter(request, response);
    }

    private boolean refreshAuth(HttpServletRequest request, HttpServletResponse response) {
        try {
            // refresh token을 검증해서, 일단 성공하면 새로운 accessToken을 발부하고 갱신
            Cookie[] cookies = request.getCookies();
            if (cookies == null) return false;
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals("refreshToken")) {
                    String refreshToken = cookie.getValue();
                    Claims claims = jwtProvider.parseToken(refreshToken);
                    // claims.getId() -> jti -> redis -> refresh token 존재 여부를 검사
                    if (!refreshTokenRepository.existsById(claims.getId())) {
                        return false;
                    }
                    // 1. response -> accessToken
                    String accessToken = jwtProvider.issueToken(claims.getSubject());
                    ResponseCookie accessTokenCookie = authCookieUtil
                            .createAccessTokenCookie(accessToken);
                    response.addHeader("Set-Cookie", accessTokenCookie.toString());
                    // 2. SecurityContextHolder.getContext().setAuthentication(...);
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            claims.getSubject(),
                            null,
                            AuthorityUtils.createAuthorityList("ROLE_USER")
                    );
                    SecurityContext context = SecurityContextHolder.getContext();
                    context.setAuthentication(auth);
                    return true;
                }
            }
        } catch (Exception e) {
            System.out.println("e.getMessage() = " + e.getMessage());
        }
        return false;
    }

    private final AuthCookieUtil authCookieUtil;
    private final RefreshTokenRepository refreshTokenRepository;

    private String extractToken(HttpServletRequest request) {
        // header <- 외부로 openapi 형식으로 할 때
        String authHeader = request.getHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7); // 'Bearer '
            if (!StringUtils.hasText(token)) {
                return token;
            }
        }
        // cookie <- 내부에서 호출할 때
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null; // 어차피 claims 시에 문제가 생기므로...
        for (Cookie cookie : cookies) {
            if (cookie.getName().equals("accessToken")) {
                return cookie.getValue(); // JWT
            }
        }
        return null;
    }

    private final JwtProvider jwtProvider;

    private Claims extractClaims(String token) {
        return jwtProvider.parseToken(token);
    }
}