package org.example.project2.domain.chat.service;

import lombok.RequiredArgsConstructor;
import org.example.project2.domain.chat.dto.ChatMessageDTO;
import org.example.project2.domain.chat.entity.ChatMessage;
import org.example.project2.domain.chat.entity.ChatRoom;
import org.example.project2.domain.chat.entity.ChatRoomStatus;
import org.example.project2.domain.chat.repository.ChatMessageRepository;
import org.example.project2.domain.chat.repository.ChatRoomRepository;
import org.example.project2.domain.user.entity.User;
import org.example.project2.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import org.example.project2.domain.chat.dto.ChatMessageListResponse;
import java.util.List;
import java.util.ArrayList;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;

    /**
     * 특정 채팅방의 이전 메시지 내역을 조회합니다 (커서 기반 페이지네이션).
     */
    public ChatMessageListResponse getPreviousMessages(Long roomId, Long cursor, int size, UUID userId) {
        // 1. 해당 채팅방에 유저가 참여 중인지 검증
        if (!chatRoomRepository.existsParticipantByRoomIdAndUserId(roomId, userId)) {
            throw new AccessDeniedException("해당 채팅방에 접근할 권한이 없습니다.");
        }

        // 2. size + 1 개를 조회하여 다음 페이지 존재 여부 확인
        PageRequest pageRequest = PageRequest.of(0, size + 1);
        List<ChatMessage> messages = chatMessageRepository.findMessagesWithCursor(roomId, cursor, pageRequest);

        boolean hasNext = messages.size() > size;
        List<ChatMessage> resultList = hasNext ? messages.subList(0, size) : messages;

        // 3. 시간 순서로 클라이언트가 보기 편하도록 역순(DESC)으로 조회된 리스트를 반대로 뒤집음
        List<ChatMessageListResponse.MessageItem> items = new ArrayList<>();
        for (int i = resultList.size() - 1; i >= 0; i--) {
            ChatMessage msg = resultList.get(i);
            items.add(new ChatMessageListResponse.MessageItem(
                    msg.getId(),
                    msg.getSender().getId(),
                    msg.getContent(),
                    msg.getCreatedAt()
            ));
        }

        return new ChatMessageListResponse(items, hasNext);
    }

    /**
     * 채팅 메시지를 DB에 영구 저장합니다.
     */
    @Transactional
    public ChatMessage saveMessage(ChatMessageDTO messageDto) {
        // 1. 채팅방 조회
        Long roomId = messageDto.roomId();
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다. ID: " + roomId));
        if (chatRoom.getStatus() != ChatRoomStatus.ACTIVE) {
            throw new IllegalStateException("종료된 채팅방에는 메시지를 저장할 수 없습니다.");
        }

        // 2. 송신자 조회 (sender 필드가 닉네임일 수도 있고 UUID일 수도 있습니다. 여기서는 UUID 스트링이라고 가정합니다)
        UUID senderId = messageDto.sender();
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + senderId));

        // 3. 메시지 엔티티 빌드 및 저장
        ChatMessage chatMessage = ChatMessage.builder()
                .chatRoom(chatRoom)
                .sender(sender)
                .content(messageDto.message())
                .build();

        return chatMessageRepository.save(chatMessage);
    }
}
