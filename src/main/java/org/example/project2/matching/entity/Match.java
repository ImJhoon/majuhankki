package org.example.project2.matching.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.recruitment.entity.RecruitmentPost;
import java.time.Instant;

@Table(name = "matches")
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class Match extends BaseEntity {
    @Enumerated(EnumType.STRING) @Column(name = "match_type", nullable = false, length = 20) private MatchType matchType;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "source_post_id") private RecruitmentPost sourcePost;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private MatchStatus status = MatchStatus.MATCHED;
    @Column(name = "matched_at", nullable = false) private Instant matchedAt;
}
