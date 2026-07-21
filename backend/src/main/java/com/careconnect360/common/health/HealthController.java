package com.careconnect360.common.health;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("application", "CareConnect 360");
        response.put("status", "UP");
        response.put("timestamp", Instant.now());
        response.put("phase", "Phase 1 - Foundation");
        return ResponseEntity.ok(response);
    }
}
