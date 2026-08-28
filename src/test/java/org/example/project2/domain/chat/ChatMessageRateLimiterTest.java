package org.example.project2.domain.chat;

import org.example.project2.domain.chat.controller.ChatMessageRateLimiter;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChatMessageRateLimiterTest {
    @Test
    void rejectsEleventhMessageWithinOneSecond() {
        ChatMessageRateLimiter limiter = new ChatMessageRateLimiter(
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
        UUID userId = UUID.randomUUID();

        for (int i = 0; i < 10; i++) {
            limiter.check(userId);
        }

        assertThatThrownBy(() -> limiter.check(userId))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void allowsMessagesAfterRateLimitWindow() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        MutableClock clock = new MutableClock(now);
        ChatMessageRateLimiter limiter = new ChatMessageRateLimiter(clock);
        UUID userId = UUID.randomUUID();

        for (int i = 0; i < 10; i++) {
            limiter.check(userId);
        }

        clock.advanceSeconds(1);
        assertThatCode(() -> limiter.check(userId)).doesNotThrowAnyException();
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        private void advanceSeconds(long seconds) {
            instant = instant.plusSeconds(seconds);
        }

        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return instant; }
    }
}
