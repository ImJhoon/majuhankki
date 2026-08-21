package org.example.project2.recruitment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.user.entity.User;
import java.time.Instant;

@Table(name = "post_participants", uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "user_id"}))
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class PostParticipant extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "post_id", nullable = false) private RecruitmentPost post;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private PostParticipantStatus status = PostParticipantStatus.JOINED;
    @Column(name = "joined_at", nullable = false) private Instant joinedAt;
}
