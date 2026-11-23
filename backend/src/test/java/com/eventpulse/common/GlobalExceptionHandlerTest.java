package com.eventpulse.common;

import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.GlobalExceptionHandler;
import com.eventpulse.common.exception.ResourceNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = GlobalExceptionHandlerTest.TestErrorController.class)
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc(addFilters = false)
@Import({GlobalExceptionHandler.class, GlobalExceptionHandlerTest.TestErrorController.class})
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.eventpulse.auth.service.JwtService jwtService;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.eventpulse.users.repository.UserRepository userRepository;

    @Test
    @DisplayName("ResourceNotFoundException maps to RFC 7807 404 response with correct error code")
    void testResourceNotFoundExceptionMapping() throws Exception {
        mockMvc.perform(get("/test/not-found"))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.title").value("Requested resource was not found"))
                .andExpect(jsonPath("$.detail").value("Event with identifier '123' was not found"));
    }

    @Test
    @DisplayName("ConflictException maps to RFC 7807 409 response")
    void testConflictExceptionMapping() throws Exception {
        mockMvc.perform(get("/test/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.errorCode").value("CONFLICT"))
                .andExpect(jsonPath("$.detail").value("Seat A12 is currently held"));
    }

    @RestController
    static class TestErrorController {
        @GetMapping("/test/not-found")
        public void throwNotFound() {
            throw new ResourceNotFoundException("Event", "123");
        }

        @GetMapping("/test/conflict")
        public void throwConflict() {
            throw new ConflictException("Seat A12 is currently held");
        }
    }
}
