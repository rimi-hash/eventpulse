package com.eventpulse.venues.controller;

import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.venues.dto.VenueDto;
import com.eventpulse.venues.service.VenueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/venues")
@Tag(name = "Venues & Physical Layouts", description = "Endpoints for venues, sections, and seating geometries")
public class VenueController {

    @Autowired
    private VenueService venueService;

    @GetMapping
    @Operation(summary = "List all registered venues")
    public ResponseEntity<ApiResponse<List<VenueDto>>> getAllVenues() {
        List<VenueDto> venues = venueService.getAllVenues();
        return ResponseEntity.ok(ApiResponse.ok("Venues retrieved successfully", venues));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get venue layout by ID")
    public ResponseEntity<ApiResponse<VenueDto>> getVenueById(@PathVariable UUID id) {
        VenueDto venue = venueService.getVenueById(id);
        return ResponseEntity.ok(ApiResponse.ok("Venue retrieved successfully", venue));
    }
}
