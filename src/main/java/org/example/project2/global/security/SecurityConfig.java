package org.example.project2.global.security;

import lombok.RequiredArgsConstructor;
import org.example.project2.global.security.jwt.JwtFilter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Map;

@Configuration
@RequiredArgsConstructor
@EnableConfigurationProperties(AuthProperties.class)
public class SecurityConfig {
    private final AuthProperties p;
    private final JwtFilter jwtFilter;

    // PasswordEncoder
    @Bean
    public PasswordEncoder passwordEncoder() {
//        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
        Map<String, PasswordEncoder> encodingMap = Map.of(
                "bcrypt", new BCryptPasswordEncoder(),
                "argon2", Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()
        );
        return new DelegatingPasswordEncoder(p.encodingId(), encodingMap);
    }

    // SecurityFilterChain
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // jwt
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable) // 기본 로그아웃 비활성화
                .sessionManagement(
                        session -> session
                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(
                        auth -> auth
                                .requestMatchers(
                                        "/", "/signup", "/login"
                                )
                                // ...
                                .permitAll()
                                .anyRequest()
                                .authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        ;
        return http.build();
    }


}