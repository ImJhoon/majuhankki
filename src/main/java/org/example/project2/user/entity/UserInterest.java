package org.example.project2.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;

@Table(name = "user_interests", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "interest_name"}))
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class UserInterest extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "interest_name", nullable = false, length = 50) private String interestName;
}
