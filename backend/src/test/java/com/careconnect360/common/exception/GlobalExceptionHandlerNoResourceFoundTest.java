package com.careconnect360.common.exception;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.careconnect360.auth.service.AuthService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"test", "prod"})
class GlobalExceptionHandlerNoResourceFoundTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @Test
    @WithMockUser(username = "tester@careconnect360.local", roles = {"PATIENT"})
    void unknownPath_returnsNotFoundWithStandardErrorPayload() throws Exception {
        mockMvc.perform(get("/api/unknown-path"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Resource not found"))
                .andExpect(jsonPath("$.path").value("/api/unknown-path"));
    }

    @Test
    void missingStaticResource_returnsNotFoundWithStandardErrorPayload() throws Exception {
        mockMvc.perform(get("/swagger-ui/non-existent.js"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Resource not found"))
                .andExpect(jsonPath("$.path").value("/swagger-ui/non-existent.js"));
    }

    @Test
    void disabledApiDocsEndpointInProdProfile_returnsNotFound() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Resource not found"))
                .andExpect(jsonPath("$.path").value("/v3/api-docs"));
    }

    @Test
    void disabledSwaggerUiEndpointInProdProfile_returnsNotFound() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Resource not found"))
                .andExpect(jsonPath("$.path").value("/swagger-ui/index.html"));
    }

    @Test
    void healthOnlyActuatorExposureInProdProfile_returnsNotFoundForInfoEndpoint() throws Exception {
        mockMvc.perform(get("/actuator/info"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Resource not found"))
                .andExpect(jsonPath("$.path").value("/actuator/info"));
    }

    @Test
    void unexpectedException_stillReturnsInternalServerError() throws Exception {
        when(authService.login(any())).thenThrow(new RuntimeException("Unexpected failure"));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "email": "user@example.com",
                          "password": "Password123!"
                        }
                        """))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andExpect(jsonPath("$.message").value("Internal server error"))
                .andExpect(jsonPath("$.path").value("/api/auth/login"));
    }
}
