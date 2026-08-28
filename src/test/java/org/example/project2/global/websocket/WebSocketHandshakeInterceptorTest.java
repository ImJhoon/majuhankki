package org.example.project2.global.websocket;

import org.example.project2.global.security.jwt.JwtProvider;
import org.junit.jupiter.api.Test;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.socket.WebSocketHandler;

import java.util.HashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class WebSocketHandshakeInterceptorTest {
    @Test
    void rejectsHandshakeWithoutAccessTokenCookie() {
        WebSocketHandshakeInterceptor interceptor = new WebSocketHandshakeInterceptor(mock(JwtProvider.class));
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean accepted = interceptor.beforeHandshake(
                new ServletServerHttpRequest(request),
                new org.springframework.http.server.ServletServerHttpResponse(response),
                mock(WebSocketHandler.class),
                new HashMap<>());

        assertThat(accepted).isFalse();
    }
}
