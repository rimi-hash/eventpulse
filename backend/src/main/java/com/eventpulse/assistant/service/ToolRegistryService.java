package com.eventpulse.assistant.service;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Production Capability Registry for YAS AI Assistant.
 * Maps every authorized EventPulse business action to its strict schema,
 * permission level (0 to 3), and authentication / authorization boundaries.
 */
@Service
public class ToolRegistryService {

    public enum PermissionLevel {
        LEVEL_0_READ_ONLY_NAVIGATION,
        LEVEL_1_REVERSIBLE_SELECTION,
        LEVEL_2_CONSEQUENTIAL_FINANCIAL,
        LEVEL_3_SENSITIVE_ADMINISTRATIVE
    }

    public record ToolParameter(
            String name,
            String type,
            boolean required,
            String description
    ) {}

    public record ToolDefinition(
            String name,
            String intentName,
            String description,
            PermissionLevel permissionLevel,
            boolean requiresAuth,
            List<String> allowedRoles,
            boolean requiresConfirmation,
            List<ToolParameter> parameters
    ) {}

    private final Map<String, ToolDefinition> tools = new LinkedHashMap<>();

    public ToolRegistryService() {
        registerTools();
    }

    private void registerTools() {
        // Level 0: Read-only and Navigation
        register(new ToolDefinition(
                "search_events",
                "SEARCH_EVENTS",
                "Search events by query, category, city, max price, or date filter",
                PermissionLevel.LEVEL_0_READ_ONLY_NAVIGATION,
                false,
                List.of(),
                false,
                List.of(
                        new ToolParameter("query", "string", false, "Search keyword, artist name, or event title"),
                        new ToolParameter("category", "string", false, "Event category: MUSIC, COMEDY, CONCERT, FESTIVAL, THEATRE, etc."),
                        new ToolParameter("city", "string", false, "City name filter"),
                        new ToolParameter("maxPrice", "number", false, "Maximum starting ticket price"),
                        new ToolParameter("dateFilter", "string", false, "Date window: THIS_WEEKEND, THIS_MONTH, NEXT_MONTH, TODAY")
                )
        ));

        register(new ToolDefinition(
                "get_event_details",
                "VIEW_EVENT_DETAILS",
                "Retrieve verified details, venue information, sessions, and ticket pricing tiers for a specific event",
                PermissionLevel.LEVEL_0_READ_ONLY_NAVIGATION,
                false,
                List.of(),
                false,
                List.of(
                        new ToolParameter("eventIdOrSlug", "string", true, "Event UUID or URL slug")
                )
        ));

        register(new ToolDefinition(
                "get_ticket_availability",
                "VIEW_EVENT_DETAILS",
                "Retrieve real-time seat inventory availability and tiers for an event session",
                PermissionLevel.LEVEL_0_READ_ONLY_NAVIGATION,
                false,
                List.of(),
                false,
                List.of(
                        new ToolParameter("eventId", "string", true, "Event UUID"),
                        new ToolParameter("sessionId", "string", true, "Session UUID")
                )
        ));

        register(new ToolDefinition(
                "get_my_tickets",
                "VIEW_MY_TICKETS",
                "Retrieve digital cryptographic admission passes belonging to the authenticated customer",
                PermissionLevel.LEVEL_0_READ_ONLY_NAVIGATION,
                true,
                List.of("CUSTOMER", "ORGANIZER", "PLATFORM_ADMIN"),
                false,
                List.of()
        ));

        register(new ToolDefinition(
                "get_my_orders",
                "VIEW_MY_ORDERS",
                "Retrieve complete purchase and order history for the authenticated customer",
                PermissionLevel.LEVEL_0_READ_ONLY_NAVIGATION,
                true,
                List.of("CUSTOMER", "ORGANIZER", "PLATFORM_ADMIN"),
                false,
                List.of()
        ));

        register(new ToolDefinition(
                "get_order_status",
                "CHECK_ORDER_STATUS",
                "Retrieve live payment and confirmation status for a specific order",
                PermissionLevel.LEVEL_0_READ_ONLY_NAVIGATION,
                true,
                List.of("CUSTOMER", "ORGANIZER", "PLATFORM_ADMIN"),
                false,
                List.of(
                        new ToolParameter("orderId", "string", true, "Order UUID")
                )
        ));

        register(new ToolDefinition(
                "search_resale_listings",
                "SEARCH_RESALE_LISTINGS",
                "Search verified fan-to-fan resale tickets complying with anti-scalping price ceiling",
                PermissionLevel.LEVEL_0_READ_ONLY_NAVIGATION,
                false,
                List.of(),
                false,
                List.of(
                        new ToolParameter("query", "string", false, "Event search term"),
                        new ToolParameter("maxPrice", "number", false, "Maximum price limit")
                )
        ));

        register(new ToolDefinition(
                "navigate_to_page",
                "NAVIGATE_TO_PAGE",
                "Navigate the client to an authorized application section",
                PermissionLevel.LEVEL_0_READ_ONLY_NAVIGATION,
                false,
                List.of(),
                false,
                List.of(
                        new ToolParameter("pageRoute", "string", true, "Target application route: /events, /my-tickets, /my-orders, /resale, /organizer, /venue-studio, /scanner, /admin")
                )
        ));

        // Level 1: Reversible Selection Changes
        register(new ToolDefinition(
                "select_seats",
                "SELECT_SEATS",
                "Select one or more seats on the active seat map without committing purchase",
                PermissionLevel.LEVEL_1_REVERSIBLE_SELECTION,
                false,
                List.of(),
                false,
                List.of(
                        new ToolParameter("seatLabels", "array", true, "List of seat identifiers, e.g. ['A12', 'A13']"),
                        new ToolParameter("sectionName", "string", false, "Specific section name if ambiguous")
                )
        ));

        register(new ToolDefinition(
                "update_ticket_selection",
                "UPDATE_SELECTION",
                "Update the active ticket tier or quantity before checkout",
                PermissionLevel.LEVEL_1_REVERSIBLE_SELECTION,
                false,
                List.of(),
                false,
                List.of(
                        new ToolParameter("ticketTierName", "string", false, "Name of ticket category: VIP, GA, Balcony, etc."),
                        new ToolParameter("quantity", "number", false, "Desired number of tickets")
                )
        ));

        // Level 2: Consequential or Financial Actions (Require Explicit Confirmation)
        register(new ToolDefinition(
                "prepare_booking",
                "START_TICKET_PURCHASE",
                "Prepare authoritative pricing breakdown, validate real inventory, and request purchase confirmation",
                PermissionLevel.LEVEL_2_CONSEQUENTIAL_FINANCIAL,
                true,
                List.of("CUSTOMER", "ORGANIZER", "PLATFORM_ADMIN"),
                true,
                List.of(
                        new ToolParameter("eventIdOrSlug", "string", false, "Event identifier or active context"),
                        new ToolParameter("ticketTierName", "string", false, "Preferred ticket category"),
                        new ToolParameter("seatLabels", "array", false, "Specific seat labels, e.g. ['A12']"),
                        new ToolParameter("quantity", "number", false, "Ticket quantity")
                )
        ));

        register(new ToolDefinition(
                "confirm_booking",
                "START_TICKET_PURCHASE",
                "Commit atomic seat hold (Redis/Postgres pessimistic lock) and generate pending checkout order",
                PermissionLevel.LEVEL_2_CONSEQUENTIAL_FINANCIAL,
                true,
                List.of("CUSTOMER", "ORGANIZER", "PLATFORM_ADMIN"),
                false,
                List.of(
                        new ToolParameter("actionToken", "string", true, "Confirmation token issued during prepare_booking")
                )
        ));

        register(new ToolDefinition(
                "confirm_payment",
                "CONFIRM_PAYMENT",
                "Execute verified order settlement, increment ticket sales, and issue digital cryptographic passes",
                PermissionLevel.LEVEL_2_CONSEQUENTIAL_FINANCIAL,
                true,
                List.of("CUSTOMER", "ORGANIZER", "PLATFORM_ADMIN"),
                true,
                List.of(
                        new ToolParameter("orderId", "string", true, "Active order UUID"),
                        new ToolParameter("paymentMethod", "string", false, "CARD, UPI, or NETBANKING")
                )
        ));

        register(new ToolDefinition(
                "view_organizer_analytics",
                "VIEW_ORGANIZER_ANALYTICS",
                "Retrieve real ticket sales, revenue metrics, and inventory telemetry for authorized organizer",
                PermissionLevel.LEVEL_0_READ_ONLY_NAVIGATION,
                true,
                List.of("ORGANIZER", "PLATFORM_ADMIN"),
                false,
                List.of()
        ));

        register(new ToolDefinition(
                "view_organizer_events",
                "VIEW_ORGANIZER_EVENTS",
                "List events managed by the authenticated organizer",
                PermissionLevel.LEVEL_0_READ_ONLY_NAVIGATION,
                true,
                List.of("ORGANIZER", "PLATFORM_ADMIN"),
                false,
                List.of()
        ));

        // Level 3: Sensitive Administrative Actions
        register(new ToolDefinition(
                "admin_reports",
                "ADMIN_REPORTS",
                "Generate global platform telemetry and audit reports",
                PermissionLevel.LEVEL_3_SENSITIVE_ADMINISTRATIVE,
                true,
                List.of("PLATFORM_ADMIN"),
                true,
                List.of()
        ));
    }

    private void register(ToolDefinition tool) {
        tools.put(tool.name(), tool);
    }

    public List<ToolDefinition> getAllTools() {
        return new ArrayList<>(tools.values());
    }

    public Optional<ToolDefinition> getTool(String name) {
        return Optional.ofNullable(tools.get(name));
    }

    public Optional<ToolDefinition> getToolByIntent(String intentName) {
        return tools.values().stream()
                .filter(t -> t.intentName().equalsIgnoreCase(intentName))
                .findFirst();
    }
}
