package org.example.project2.domain.chat.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.project2.domain.chat.dto.ChatMessageListResponse;
import org.example.project2.domain.chat.service.ChatService;
import org.example.project2.global.common.CommonResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Tag(name = "Chat Rooms", description = "채팅방 이전 메시지 조회 및 관련 API")
@RestController
@RequestMapping("/chatrooms")
@RequiredArgsConstructor
public class ChatRoomController {

    private final ChatService chatService;

    @Operation(summary = "이전 메시지 조회 (FR-05-04)")
    @GetMapping("/{roomId}/messages")
    public ResponseEntity<CommonResponse<ChatMessageListResponse>> getPreviousMessages(
            @PathVariable("roomId") Long roomId,
            @RequestParam(value = "cursor", required = false) Long cursor,
            @RequestParam(value = "size", defaultValue = "30") int size,
            @AuthenticationPrincipal UUID userId
    ) {
        ChatMessageListResponse response = chatService.getPreviousMessages(roomId, cursor, size, userId);
        return ResponseEntity.ok(CommonResponse.success(response));
    }
}
