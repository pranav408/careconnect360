package com.careconnect360.dashboard.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

class DashboardServiceSourceInspectionTest {

    @Test
    void dashboardServiceUsesRepositoryAggregationsWithoutFindAllBasedCounting() throws IOException {
        String source = Files.readString(Path.of("src/main/java/com/careconnect360/dashboard/service/DashboardService.java"));

        assertTrue(source.contains("countByStatus("));
        assertTrue(source.contains("countByPatientIdAndStatus("));
        assertTrue(source.contains("countByAppointmentPatientIdAndStatus("));
        assertTrue(source.contains("sumOutstandingPatientResponsibility("));
        assertTrue(source.contains("sumAmountByStatus("));

        assertFalse(source.contains("findAll().size()"));
        assertFalse(source.contains("findAll().stream().count()"));
        assertFalse(source.contains("findAll().stream().filter"));
    }
}