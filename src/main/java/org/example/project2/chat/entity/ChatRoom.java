package org.example.project2.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.matching.entity.Match;

@Table(name = "chat_rooms")
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class ChatRoom extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "match_id", nullable = false, unique = true) private Match match;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ChatRoomStatus status = ChatRoomStatus.ACTIVE;
}
