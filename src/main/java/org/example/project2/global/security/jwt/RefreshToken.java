package org.example.project2.global.security.jwt;

import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;
import org.springframework.data.redis.core.index.Indexed;

@RedisHash("refresh_token")
@NoArgsConstructor
@Getter
@Builder
@AllArgsConstructor
public class RefreshToken {
    // import org.springframework.data.annotation.Id;
    @Id
    private String jti; // JWT ID
    // UUID로 생성을 함 -> username 기반으로 조합을 함
    // import org.springframework.data.redis.core.index.Indexed;
    @Indexed
    private String username; // unique
    @TimeToLive // 얼마나 유지시킬 것인가 (초단위)
    private long ttl;
}