package org.example.project2.review.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Check;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.matching.entity.Match;
import org.example.project2.user.entity.User;

@Table(name = "reviews", uniqueConstraints = @UniqueConstraint(columnNames = {"match_id", "writer_id", "target_user_id"}))
@Entity
@Check(constraints = "rating IS NULL OR rating BETWEEN 1 AND 5")
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class Review extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "match_id", nullable = false) private Match match;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "writer_id", nullable = false) private User writer;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "target_user_id", nullable = false) private User targetUser;
    private Integer rating;
    @Column(columnDefinition = "text") private String content;
    @Column(name = "is_public", nullable = false) private boolean isPublic = true;
}
