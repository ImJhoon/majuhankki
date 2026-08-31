package org.example.project2.global.security;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * 환경별 인증 및 CSRF 쿠키 속성을 관리한다.
 */
@ConfigurationProperties(prefix = "app.security.cookie")
@Validated
public record CookieProperties(
        @DefaultValue("false")
        boolean secure,
        @DefaultValue("Lax")
        @NotBlank
        @Pattern(
                regexp = "Strict|Lax|None",
                message = "SameSite는 Strict, Lax, None 중 하나여야 합니다."
        )
        String sameSite
) {

    @AssertTrue(message = "SameSite=None은 Secure=true와 함께 사용해야 합니다.")
    public boolean isSecureForCrossSiteCookie() {
        return !"None".equals(sameSite) || secure;
    }
}
