package org.example.project2.community.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.user.entity.User;

@Table(name = "community_posts")
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Builder
public class CommunityPost extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "writer_id", nullable = false) private User writer;
    @Column(nullable = false, length = 100) private String title;
    @Column(nullable = false, columnDefinition = "text") private String content;
}
