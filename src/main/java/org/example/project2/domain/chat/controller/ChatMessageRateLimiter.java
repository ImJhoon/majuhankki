package org.example.project2.domain.chat.controller;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** 사용자별 WebSocket 메시지 전송 빈도를 제한한다. */
@Component
public class ChatMessageRateLimiter {
    private static final int MAX_MESSAGES = 10;
    private static final long WINDOW_MILLIS = 1_000L;

    private final Clock clock;
    private final ConcurrentHashMap<UUID, Deque<Long>> messageTimes = new ConcurrentHashMap<>();

    public ChatMessageRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public void check(UUID userId) {
        long now = clock.millis();
        Deque<Long> times = messageTimes.computeIfAbsent(userId, ignored -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && now - times.peekFirst() >= WINDOW_MILLIS) {
                times.removeFirst();
            }
            if (times.size() >= MAX_MESSAGES) {
                throw new IllegalArgumentException("메시지 전송이 너무 빠릅니다. 잠시 후 다시 시도해 주세요.");
            }
            times.addLast(now);
        }
    }
}
