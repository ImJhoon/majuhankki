package org.example.project2.global.config.redis;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "spring.data.redis")
public record RedisProperties(
        String host,
        int port,
        String username,
        String password,
        Ssl ssl
) {
    public RedisProperties {
        if (host == null || host.isBlank()) {
            host = "localhost";
        }
        if (port == 0) {
            port = 6379;
        }
        if (ssl == null) {
            ssl = new Ssl(false);
        }
    }

    public record Ssl(boolean enabled) {
    }
}
