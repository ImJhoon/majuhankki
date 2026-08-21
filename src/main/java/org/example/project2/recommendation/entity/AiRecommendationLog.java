package org.example.project2.recommendation.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.user.entity.User;

@Table(name = "ai_recommendation_logs")
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class AiRecommendationLog extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(length = 100) private String region;
    @Column(name = "food_type", length = 50) private String foodType;
    @Column(name = "party_size") private Integer partySize;
    @Column(name = "recommended_result", columnDefinition = "text") private String recommendedResult;
}
