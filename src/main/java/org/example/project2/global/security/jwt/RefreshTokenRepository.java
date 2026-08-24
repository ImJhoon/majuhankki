package org.example.project2.global.security.jwt;

import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface RefreshTokenRepository extends CrudRepository<RefreshToken, String> {
    List<RefreshToken> findByUsername(String username);
}