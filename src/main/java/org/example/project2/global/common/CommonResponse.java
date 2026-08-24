package org.example.project2.global.common;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "공통 API 응답 포맷")
public record CommonResponse<T>(
        @Schema(description = "성공 여부", example = "true")
        boolean success,

        @Schema(description = "응답 데이터")
        T data,

        @Schema(description = "에러 정보 (성공 시 null)", example = "null")
        Void error
) {
    public static <T> CommonResponse<T> success(T data) {
        return new CommonResponse<>(true, data, null);
    }
}
