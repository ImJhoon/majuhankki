package org.example.project2.recruitment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.user.entity.User;
import java.math.BigDecimal;
import java.time.Instant;

@Table(name = "recruitment_posts", indexes = @Index(name = "idx_posts_status", columnList = "status"))
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class RecruitmentPost extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "writer_id", nullable = false) private User writer;
    @Column(nullable = false, length = 100) private String title;
    @Column(columnDefinition = "text") private String description;
    @Column(name = "meal_at", nullable = false) private Instant mealAt;
    @Column(length = 100) private String region;
    @Column(precision = 9, scale = 6) private BigDecimal latitude;
    @Column(precision = 9, scale = 6) private BigDecimal longitude;
    @Column(nullable = false) private int capacity;
    @Column(name = "current_count", nullable = false) private int currentCount = 1;
    @Enumerated(EnumType.STRING) @Column(name = "recruit_type", nullable = false, length = 20) private RecruitType recruitType = RecruitType.SMALL;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private PostStatus status = PostStatus.OPEN;
}
