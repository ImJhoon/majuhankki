package org.example.project2.domain.chat.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ChatMessageListResponse(
        List<MessageItem> content,
        boolean hasNext
) {
    public record MessageItem(
            Long messageId,
            UUID senderId,
            String content,
            Instant sentAt
    ) {}
}
