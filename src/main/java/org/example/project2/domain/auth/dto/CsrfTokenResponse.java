package org.example.project2.domain.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "CSRF 토큰 응답")
public record CsrfTokenResponse(
        @Schema(description = "상태 변경 요청에 사용할 CSRF 토큰")
        String token
) {
}
