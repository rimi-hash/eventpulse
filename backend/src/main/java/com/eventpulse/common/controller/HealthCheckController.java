package com.eventpulse.common.controller;

import com.eventpulse.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health & Telemetry", description = "Endpoints for platform health verification and status monitoring")
public class HealthCheckController {

    private static final Logger log = LoggerFactory.getLogger(HealthCheckController.class);
    private final Instant startTime = Instant.now();

    @Autowired(required = false)
    private DataSource dataSource;

    @Autowired(required = false)
    private RedisConnectionFactory redisConnectionFactory;

    @GetMapping
    @Operation(summary = "Platform health status check", description = "Verifies application core, database connection, and Redis connectivity")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("version", "1.0.0");
        status.put("javaVersion", System.getProperty("java.version"));
        status.put("uptimeSeconds", Instant.now().getEpochSecond() - startTime.getEpochSecond());

        Map<String, String> components = new HashMap<>();

        // Check PostgreSQL connection
        if (dataSource != null) {
            try (Connection conn = dataSource.getConnection()) {
                components.put("database", conn.isValid(2) ? "CONNECTED" : "DEGRADED");
            } catch (Exception ex) {
                log.warn("Database health check failed: {}", ex.getMessage());
                components.put("database", "DISCONNECTED: " + ex.getMessage());
            }
        } else {
            components.put("database", "NOT_CONFIGURED");
        }

        // Check Redis connection
        if (redisConnectionFactory != null) {
            try (RedisConnection connection = redisConnectionFactory.getConnection()) {
                String ping = connection.ping();
                components.put("redis", "PONG".equalsIgnoreCase(ping) ? "CONNECTED" : "DEGRADED");
            } catch (Exception ex) {
                log.warn("Redis health check failed: {}", ex.getMessage());
                components.put("redis", "DISCONNECTED: " + ex.getMessage());
            }
        } else {
            components.put("redis", "NOT_CONFIGURED");
        }

        status.put("components", components);

        return ResponseEntity.ok(ApiResponse.ok("EventPulse platform is operational", status));
    }
}
