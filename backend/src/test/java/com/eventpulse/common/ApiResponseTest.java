package com.eventpulse.common;

import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.common.api.PageMetadata;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ApiResponseTest {

    @Test
    @DisplayName("ApiResponse.ok wraps payload correctly with success true")
    void testOkWrapper() {
        String testData = "EventPulse Discovery";
        ApiResponse<String> response = ApiResponse.ok(testData);

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isEqualTo(testData);
        assertThat(response.getMessage()).isEqualTo("Operation completed successfully");
        assertThat(response.getTimestamp()).isNotNull();
    }

    @Test
    @DisplayName("ApiResponse.ok with pagination metadata populates metadata correctly")
    void testOkWithPagination() {
        PageMetadata metadata = new PageMetadata(1, 20, 100, 5);
        ApiResponse<List<String>> response = ApiResponse.ok("Found events", List.of("Event 1", "Event 2"), metadata);

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMetadata()).isNotNull();
        assertThat(response.getMetadata().getPage()).isEqualTo(1);
        assertThat(response.getMetadata().getTotalPages()).isEqualTo(5);
        assertThat(response.getMetadata().getTotalElements()).isEqualTo(100);
    }

    @Test
    @DisplayName("ApiResponse.error builds failed response with error list")
    void testErrorWrapper() {
        ApiResponse<Void> response = ApiResponse.error("Failed validation", List.of("Email is required"));

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).isEqualTo("Failed validation");
        assertThat(response.getErrors()).containsExactly("Email is required");
    }
}
