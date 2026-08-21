package org.example.project2.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import java.math.BigDecimal;

@Table(name = "users")
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class User extends BaseEntity {
    @Column(nullable = false, unique = true) private String email;
    @Column(name = "password_hash") private String passwordHash;
    @Column(nullable = false, length = 50) private String nickname;
    @Column(name = "profile_image_url", length = 500) private String profileImageUrl;
    @Column(precision = 9, scale = 6) private BigDecimal latitude;
    @Column(precision = 9, scale = 6) private BigDecimal longitude;
    @Column(name = "location_consent", nullable = false) private boolean locationConsent;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private UserRole role = UserRole.MEMBER;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private UserStatus status = UserStatus.ACTIVE;
}
