package com.eventpulse.analytics.controller;

import com.eventpulse.analytics.service.CsvExportService;
import com.eventpulse.auth.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Business Intelligence & CSV Exports", description = "Role-scoped, RFC-4180 compliant CSV exports with formula injection protection")
public class CsvExportController {

    @Autowired
    private CsvExportService exportService;

    @GetMapping("/organizer/reports/export/attendees")
    @Operation(summary = "Export attendee roster CSV for an authorized event")
    public ResponseEntity<byte[]> exportAttendees(
            @RequestParam UUID eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        byte[] csv = exportService.exportAttendeesCsv(eventId, principal != null ? principal.getId() : null);
        String filename = "eventpulse-attendees-" + eventId + "-" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @GetMapping("/organizer/reports/export/orders")
    @Operation(summary = "Export orders and sales summary CSV")
    public ResponseEntity<byte[]> exportOrders(
            @RequestParam(required = false) UUID eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        byte[] csv = exportService.exportOrdersCsv(eventId, principal != null ? principal.getId() : null);
        String filename = "eventpulse-orders-" + (eventId != null ? eventId : "all") + "-" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @GetMapping("/organizer/reports/export/inventory")
    @Operation(summary = "Export ticket tier inventory report CSV")
    public ResponseEntity<byte[]> exportInventory(
            @RequestParam UUID eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        byte[] csv = exportService.exportInventoryCsv(eventId, principal != null ? principal.getId() : null);
        String filename = "eventpulse-inventory-" + eventId + "-" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @GetMapping("/organizer/reports/export/coupons")
    @Operation(summary = "Export coupon redemptions report CSV")
    public ResponseEntity<byte[]> exportCoupons(@AuthenticationPrincipal UserPrincipal principal) {
        byte[] csv = exportService.exportCouponsCsv(principal != null ? principal.getId() : null);
        String filename = "eventpulse-coupons-" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @GetMapping("/organizer/reports/export/checkin")
    @Operation(summary = "Export gate check-in logs CSV")
    public ResponseEntity<byte[]> exportCheckin(
            @RequestParam UUID eventId,
            @AuthenticationPrincipal UserPrincipal principal) {
        byte[] csv = exportService.exportCheckinCsv(eventId, principal != null ? principal.getId() : null);
        String filename = "eventpulse-checkin-" + eventId + "-" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @GetMapping("/admin/reports/export/users")
    @Operation(summary = "Export platform users report CSV (Admin only)")
    public ResponseEntity<byte[]> exportPlatformUsers() {
        byte[] csv = exportService.exportPlatformUsersCsv();
        String filename = "eventpulse-platform-users-" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @GetMapping("/admin/reports/export/orders")
    @Operation(summary = "Export platform orders and transactions CSV (Admin only)")
    public ResponseEntity<byte[]> exportPlatformOrders() {
        byte[] csv = exportService.exportOrdersCsv(null, null);
        String filename = "eventpulse-all-orders-" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }
}
