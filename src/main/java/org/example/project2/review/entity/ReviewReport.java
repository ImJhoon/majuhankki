package org.example.project2.review.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.user.entity.User;

@Table(name = "review_reports", uniqueConstraints = @UniqueConstraint(columnNames = {"review_id", "reporter_id"}))
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class ReviewReport extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "review_id", nullable = false) private Review review;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "reporter_id", nullable = false) private User reporter;
    @Column(nullable = false, length = 200) private String reason;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ReviewReportStatus status = ReviewReportStatus.PENDING;
}
