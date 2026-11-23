package com.eventpulse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * EventPulse — Intelligent Event Commerce & Operations Platform.
 * Production-grade modular monolith entrypoint.
 */
@SpringBootApplication
@EnableScheduling
public class EventPulseApplication {

    public static void main(String[] args) {
        SpringApplication.run(EventPulseApplication.class, args);
    }
}
