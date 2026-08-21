package org.example.project2.matching.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.user.entity.User;

@Table(name = "match_participants", uniqueConstraints = @UniqueConstraint(columnNames = {"match_id", "user_id"}))
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class MatchParticipant extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "match_id", nullable = false) private Match match;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "request_id") private RealtimeMatchRequest request;
}
