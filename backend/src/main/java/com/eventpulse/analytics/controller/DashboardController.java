package com.eventpulse.analytics.controller;

import com.eventpulse.analytics.dto.AdminDashboardStatsDto;
import com.eventpulse.analytics.dto.OrganizerDashboardStatsDto;
import com.eventpulse.analytics.service.DashboardService;
import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Analytics & Dashboards", description = "Endpoints for organizer and administrative metrics and operational logs")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/organizer/dashboard/stats")
    @Operation(summary = "Get organizer dashboard analytics")
    public ResponseEntity<ApiResponse<OrganizerDashboardStatsDto>> getOrganizerStats(
            @AuthenticationPrincipal UserPrincipal principal) {
        OrganizerDashboardStatsDto stats = dashboardService.getOrganizerStats(principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Organizer stats retrieved", stats));
    }

    @GetMapping("/admin/dashboard/stats")
    @Operation(summary = "Get platform admin dashboard telemetry")
    public ResponseEntity<ApiResponse<AdminDashboardStatsDto>> getAdminStats() {
        AdminDashboardStatsDto stats = dashboardService.getAdminStats();
        return ResponseEntity.ok(ApiResponse.ok("Admin stats retrieved", stats));
    }
}
