package com.eventpulse.assistant.model;

/**
 * Strict allowlist of recognized assistant intents for EventPulse.
 * Arbitrary or unlisted actions are rejected by the validation pipeline.
 */
public enum AssistantIntent {
    // Read-only discovery & search (Level 0)
    SEARCH_EVENTS,
    FILTER_EVENTS,
    VIEW_EVENT_DETAILS,

    // Customer personal records (Level 0, authenticated)
    VIEW_MY_TICKETS,
    VIEW_MY_ORDERS,
    CHECK_ORDER_STATUS,

    // Navigation & verified secondary market (Level 0)
    NAVIGATE_TO_PAGE,
    SEARCH_RESALE_LISTINGS,

    // Business & Organizer Operations (Level 0 / 2, role-restricted)
    VIEW_ORGANIZER_ANALYTICS,
    VIEW_ORGANIZER_EVENTS,

    // Reversible UI selection (Level 1)
    SELECT_SEATS,
    UPDATE_SELECTION,

    // Transactional operations (Level 2, require explicit confirmation)
    START_TICKET_PURCHASE,
    HOLD_SEATS,
    CONFIRM_PAYMENT,
    START_RESALE_PURCHASE,
    CREATE_OR_EDIT_EVENT,
    CREATE_EVENT_COUPON,

    // Sensitive operations (Level 3)
    ADMIN_REPORTS,

    // Fallback for unrecognized commands
    UNKNOWN_OR_UNSUPPORTED;

    public boolean isTransactional() {
        return switch (this) {
            case START_TICKET_PURCHASE,
                 HOLD_SEATS,
                 CONFIRM_PAYMENT,
                 START_RESALE_PURCHASE,
                 CREATE_OR_EDIT_EVENT,
                 CREATE_EVENT_COUPON,
                 ADMIN_REPORTS -> true;
            default -> false;
        };
    }

    public boolean requiresAuthentication() {
        return switch (this) {
            case VIEW_MY_TICKETS,
                 VIEW_MY_ORDERS,
                 CHECK_ORDER_STATUS,
                 VIEW_ORGANIZER_ANALYTICS,
                 VIEW_ORGANIZER_EVENTS,
                 START_TICKET_PURCHASE,
                 HOLD_SEATS,
                 CONFIRM_PAYMENT,
                 START_RESALE_PURCHASE,
                 CREATE_OR_EDIT_EVENT,
                 CREATE_EVENT_COUPON,
                 ADMIN_REPORTS -> true;
            default -> false;
        };
    }
}
