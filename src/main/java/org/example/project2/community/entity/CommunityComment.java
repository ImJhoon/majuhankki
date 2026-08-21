package org.example.project2.community.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.project2.global.entity.BaseEntity;
import org.example.project2.user.entity.User;

@Table(name = "community_comments")
@Entity
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
public class CommunityComment extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "community_post_id", nullable = false)
    private CommunityPost communityPost;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "writer_id", nullable = false)
    private User writer;
    @Column(nullable = false, columnDefinition = "text")
    private String content;
}
