package com.eventpulse.organizations.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.organizations.dto.CreateOrganizationRequest;
import com.eventpulse.organizations.dto.OrganizationDto;
import com.eventpulse.organizations.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Organizations & Applications", description = "Endpoints for organizer profile onboarding, verification status, and administrative review")
public class OrganizationController {

    @Autowired
    private OrganizationService organizationService;

    // --- Applicant / Organizer Endpoints ---

    @GetMapping({"/organizer/organization/me", "/organizer-applications/me"})
    @Operation(summary = "Get current organizer organization profile / application status")
    public ResponseEntity<ApiResponse<OrganizationDto>> getMyOrganization(
            @AuthenticationPrincipal UserPrincipal principal) {
        OrganizationDto org = organizationService.getMyOrganization(principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Organization application retrieved", org));
    }

    @PostMapping({"/organizer/organization/apply", "/organizer-applications"})
    @Operation(summary = "Submit new organizer verification application")
    public ResponseEntity<ApiResponse<OrganizationDto>> applyForVerification(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateOrganizationRequest request) {
        OrganizationDto org = organizationService.applyForVerification(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Verification application submitted successfully", org));
    }

    @PutMapping({"/organizer/organization/me", "/organizer-applications/me"})
    @Operation(summary = "Update or resubmit organizer verification application")
    public ResponseEntity<ApiResponse<OrganizationDto>> updateOrganization(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateOrganizationRequest request) {
        OrganizationDto org = organizationService.updateOrganization(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Organization profile updated successfully", org));
    }

    // --- Administrator Review Endpoints ---

    @GetMapping({"/admin/organizations/pending", "/admin/organizer-applications/pending"})
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @Operation(summary = "List all pending organizer verification requests")
    public ResponseEntity<ApiResponse<List<OrganizationDto>>> getPendingOrganizations() {
        List<OrganizationDto> list = organizationService.getPendingOrganizations();
        return ResponseEntity.ok(ApiResponse.ok("Pending organizations retrieved", list));
    }

    @GetMapping({"/admin/organizations", "/admin/organizer-applications"})
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @Operation(summary = "List all registered organizations and applications")
    public ResponseEntity<ApiResponse<List<OrganizationDto>>> getAllOrganizations() {
        List<OrganizationDto> list = organizationService.getAllOrganizations();
        return ResponseEntity.ok(ApiResponse.ok("All organizations retrieved", list));
    }

    @GetMapping({"/admin/organizations/{id}", "/admin/organizer-applications/{id}"})
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @Operation(summary = "Get specific organization application details")
    public ResponseEntity<ApiResponse<OrganizationDto>> getOrganizationById(@PathVariable UUID id) {
        OrganizationDto org = organizationService.getOrganizationById(id);
        return ResponseEntity.ok(ApiResponse.ok("Organization details retrieved", org));
    }

    @PostMapping({"/admin/organizations/{id}/verify", "/admin/organizer-applications/{id}/approve"})
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @Operation(summary = "Approve and verify organizer profile, promoting user to ORGANIZER")
    public ResponseEntity<ApiResponse<OrganizationDto>> verifyOrganization(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID adminId = principal != null ? principal.getId() : null;
        OrganizationDto org = organizationService.approveOrganization(id, adminId);
        return ResponseEntity.ok(ApiResponse.ok("Organization verified successfully", org));
    }

    @PostMapping({"/admin/organizations/{id}/reject", "/admin/organizer-applications/{id}/reject"})
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @Operation(summary = "Reject organizer verification application with mandatory reason")
    public ResponseEntity<ApiResponse<OrganizationDto>> rejectOrganization(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) Map<String, String> body) {
        UUID adminId = principal != null ? principal.getId() : null;
        String reason = body != null ? body.get("reason") : null;
        OrganizationDto org = organizationService.rejectOrganization(id, adminId, reason);
        return ResponseEntity.ok(ApiResponse.ok("Organization rejected", org));
    }
}
