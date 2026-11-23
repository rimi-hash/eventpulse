package com.eventpulse.events.controller;

import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.common.api.PageMetadata;
import com.eventpulse.events.dto.EventDetailDto;
import com.eventpulse.events.dto.EventSummaryDto;
import com.eventpulse.events.model.EventCategory;
import com.eventpulse.events.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/events")
@Tag(name = "Event Discovery & Catalog", description = "Public catalog search, featured events, and detailed pages")
public class EventController {

    @Autowired
    private EventService eventService;

    @GetMapping
    @Operation(summary = "Search and filter published events", description = "Browse live events with category filtering, city filtering, status, text query, and pagination")
    public ResponseEntity<ApiResponse<List<EventSummaryDto>>> searchEvents(
            @RequestParam(required = false) EventCategory category,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        int pageIndex = Math.max(0, page - 1);
        Page<EventSummaryDto> eventPage = eventService.searchEvents(
                category,
                city,
                status,
                query,
                PageRequest.of(pageIndex, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        PageMetadata metadata = new PageMetadata(
                page,
                size,
                eventPage.getTotalElements(),
                eventPage.getTotalPages()
        );

        return ResponseEntity.ok(ApiResponse.ok("Events retrieved successfully", eventPage.getContent(), metadata));
    }

    @GetMapping("/featured")
    @Operation(summary = "Get featured and trending events", description = "Returns high-demand curated featured events for landing page showcase")
    public ResponseEntity<ApiResponse<List<EventSummaryDto>>> getFeaturedEvents() {
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        return ResponseEntity.ok(ApiResponse.ok("Featured events retrieved successfully", featured));
    }

    @GetMapping("/past")
    @Operation(summary = "Get concluded and past events", description = "Returns verified historical and completed events for archival reference")
    public ResponseEntity<ApiResponse<List<EventSummaryDto>>> getPastEvents() {
        List<EventSummaryDto> past = eventService.getPastEvents();
        return ResponseEntity.ok(ApiResponse.ok("Past events retrieved successfully", past));
    }

    @GetMapping("/{idOrSlug}")
    @Operation(summary = "Get full event details", description = "Retrieves full event specification, schedule sessions, and ticket tier pricing")
    public ResponseEntity<ApiResponse<EventDetailDto>> getEventByIdOrSlug(@PathVariable String idOrSlug) {
        EventDetailDto detail = eventService.getEventByIdOrSlug(idOrSlug);
        return ResponseEntity.ok(ApiResponse.ok("Event details retrieved successfully", detail));
    }
}
