package org.example.project2.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.user.entity.User;
import java.time.Instant;

@Table(name = "chat_messages", indexes = @Index(name = "idx_messages_room_time", columnList = "chat_room_id, sent_at DESC"))
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class ChatMessage extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "chat_room_id", nullable = false) private ChatRoom chatRoom;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "sender_id", nullable = false) private User sender;
    @Column(nullable = false, columnDefinition = "text") private String content;
    @Column(name = "sent_at", nullable = false) private Instant sentAt;
}
