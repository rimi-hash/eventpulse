package com.eventpulse;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class EventPulseApplicationTests {

    @Test
    @DisplayName("Spring Application Context loads successfully with test profile")
    void contextLoads() {
        // Confirms that Spring Boot modular monolith context wires successfully
    }
}
