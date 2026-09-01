package org.example.project2.global.security.jwt;

import org.example.project2.global.security.AuthProperties;
import org.example.project2.global.security.CookieProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import java.time.Duration;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class AuthCookieUtilTest {

    @Test
    void productionAuthenticationCookiesUseSecureAndNone() {
        AuthCookieUtil cookieUtil = cookieUtil(new CookieProperties(true, "None"));

        assertCookieAttributes(cookieUtil.createAccessTokenCookie("access-token"), true, "None");
        assertCookieAttributes(cookieUtil.createRefreshTokenCookie("refresh-token"), true, "None");
        assertCookieAttributes(cookieUtil.deleteAccessTokenCookie(), true, "None");
        assertCookieAttributes(cookieUtil.deleteRefreshTokenCookie(), true, "None");
    }

    @Test
    void developmentAuthenticationCookiesUseHttpAndLax() {
        AuthCookieUtil cookieUtil = cookieUtil(new CookieProperties(false, "Lax"));

        assertCookieAttributes(cookieUtil.createAccessTokenCookie("access-token"), false, "Lax");
        assertCookieAttributes(cookieUtil.createRefreshTokenCookie("refresh-token"), false, "Lax");
    }

    private void assertCookieAttributes(ResponseCookie cookie, boolean secure, String sameSite) {
        String serializedCookie = cookie.toString();

        assertThat(serializedCookie).contains("SameSite=" + sameSite);
        if (secure) {
            assertThat(serializedCookie).contains("; Secure");
        } else {
            assertThat(serializedCookie).doesNotContain("; Secure");
        }
    }

    private AuthCookieUtil cookieUtil(CookieProperties cookieProperties) {
        AuthProperties authProperties = new AuthProperties(
                new AuthProperties.Password("argon2"),
                new AuthProperties.Jwt(
                        "project2",
                        "project2-api",
                        Base64.getEncoder().encodeToString(new byte[32]),
                        Duration.ofMinutes(15),
                        Duration.ofDays(14),
                        5,
                        Duration.ofDays(7)
                ),
                new AuthProperties.Cors("https://frontend.example")
        );
        return new AuthCookieUtil(authProperties, cookieProperties);
    }
}
