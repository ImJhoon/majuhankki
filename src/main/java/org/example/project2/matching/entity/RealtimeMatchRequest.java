package org.example.project2.matching.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.user.entity.User;
import java.math.BigDecimal;
import java.time.Instant;

@Table(name = "realtime_match_requests")
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class RealtimeMatchRequest extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(nullable = false, precision = 9, scale = 6) private BigDecimal latitude;
    @Column(nullable = false, precision = 9, scale = 6) private BigDecimal longitude;
    @Column(name = "desired_time_slot", nullable = false, length = 50) private String desiredTimeSlot;
    @Column(name = "desired_group_type", nullable = false, length = 20) private String desiredGroupType;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private RealtimeMatchRequestStatus status = RealtimeMatchRequestStatus.WAITING;
    @Column(name = "requested_at", nullable = false) private Instant requestedAt;
    @Column(name = "expired_at") private Instant expiredAt;
}
