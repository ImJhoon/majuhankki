package org.example.project2.domain.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.example.project2.domain.auth.dto.CsrfTokenResponse;
import org.example.project2.global.common.CommonResponse;
import org.example.project2.global.security.jwt.AuthCookieUtil;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Authentication", description = "인증 및 회원가입 관련 API")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class CsrfController {
    private final AuthCookieUtil authCookieUtil;

    @Operation(
            summary = "CSRF 토큰 발급",
            description = "쿠키 기반 인증 API 호출 전에 CSRF 토큰과 XSRF-TOKEN 쿠키를 발급받습니다. 응답의 data.token을 상태 변경 요청 헤더에 사용합니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "CSRF 토큰 발급 성공",
                    headers = @Header(
                            name = "Set-Cookie",
                            description = "XSRF-TOKEN 쿠키",
                            schema = @Schema(type = "string")
                    ),
                    content = @Content(schema = @Schema(implementation = CsrfTokenSuccessResponse.class))
            )
    })
    @GetMapping("/csrf")
    public ResponseEntity<CommonResponse<CsrfTokenResponse>> csrf(
            @Parameter(hidden = true) CsrfToken csrfToken,
            HttpServletResponse response
    ) {
        // 지연 생성된 토큰에 접근하면 SecurityFilter가 Path=/ 쿠키를 한 번만 기록한다.
        String token = csrfToken.getToken();
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                authCookieUtil.deleteLegacyCsrfTokenCookie().toString()
        );
        return ResponseEntity.ok(CommonResponse.success(new CsrfTokenResponse(token)));
    }

    @Schema(name = "CsrfTokenSuccessResponse")
    private static class CsrfTokenSuccessResponse {
        public boolean success;
        public CsrfTokenResponse data;
        public Void error;
    }
}
