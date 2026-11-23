package com.eventpulse.venues.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.venues.dto.CreateVenueRequest;
import com.eventpulse.venues.dto.VenueDto;
import com.eventpulse.venues.service.VenueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizer/venues")
@Tag(name = "Organizer Venue Designer", description = "Endpoints for organizers to design and publish custom venue seating layouts")
public class OrganizerVenueController {

    @Autowired
    private VenueService venueService;

    @PostMapping
    @Operation(summary = "Create custom venue and seating layout", description = "Validates section codes, duplicate seat identifiers, coordinates, and persists physical geometry")
    public ResponseEntity<ApiResponse<VenueDto>> createVenue(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateVenueRequest request) {
        VenueDto venue = venueService.createVenue(principal != null ? principal.getId() : null, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Venue layout designed and saved successfully", venue));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update and version custom venue seating layout", description = "Safely updates layout geometry, versions the layout, and persists elements")
    public ResponseEntity<ApiResponse<VenueDto>> updateVenue(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateVenueRequest request) {
        VenueDto venue = venueService.updateVenueLayout(id, request, principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Venue layout updated and versioned successfully", venue));
    }
}
