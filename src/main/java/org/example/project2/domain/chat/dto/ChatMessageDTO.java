package org.example.project2.domain.chat.dto;

import java.util.UUID;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChatMessageDTO(
        @NotNull(message = "채팅방 ID는 필수입니다.")
        Long roomId,
        UUID sender,
        @NotBlank(message = "메시지는 공백일 수 없습니다.")
        @Size(max = 1_000, message = "메시지는 1,000자 이내로 입력해야 합니다.")
        String message
) {
}
