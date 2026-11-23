package com.eventpulse.assistant.service;

import com.eventpulse.assistant.dto.ApplicationContextDto;
import com.eventpulse.assistant.dto.ParsedIntentDto;
import com.eventpulse.assistant.model.AssistantIntent;
import com.eventpulse.assistant.provider.AiProviderClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Validates, interprets, and parses user natural language commands into strict structured intents.
 * Employs Gemini Developer API with strict schema enforcement and infallible deterministic heuristics.
 */
@Service
public class IntentParserService {

    private static final Logger log = LoggerFactory.getLogger(IntentParserService.class);

    private final AiProviderClient aiProviderClient;
    private final ObjectMapper objectMapper;

    private static final Pattern SEAT_PATTERN = Pattern.compile("(?i)\\bseats?\\s+([a-z]?\\d{1,3}(?:\\s*(?:,|and|&)?\\s*[a-z]?\\d{1,3})*)|(?i)\\b([a-z]\\d{1,3})\\b");
    private static final Pattern QUANTITY_PATTERN = Pattern.compile("(?i)\\b(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|single|pair)\\s*(?:tickets?|passes?|seats?)\\b");

    private static final String SYSTEM_INSTRUCTION = """
            You are YAS, the intelligent operations and voice assistant for EventPulse, an enterprise event ticketing platform.
            Your job is to classify the user's natural language command into exactly ONE approved intent from this allowlist:
            
            1. SEARCH_EVENTS: User wants to discover, find, or search events (e.g., "Find comedy shows in Chennai", "Search concerts under 2000").
            2. FILTER_EVENTS: User wants to filter events by category or city (e.g., "Show only music events", "Filter by Bangalore").
            3. VIEW_EVENT_DETAILS: User wants to view details or see availability for a specific event (e.g., "Tell me about Hip Hop Tamizha", "Open Vir Das show").
            4. VIEW_MY_TICKETS: User asks for digital passes/tickets (e.g., "Show my tickets", "Open my ticket wallet").
            5. VIEW_MY_ORDERS: User asks for order history or past bookings (e.g., "Show my orders", "What did I buy?").
            6. CHECK_ORDER_STATUS: User asks for order status (e.g., "Check status of my order", "Is my payment confirmed?").
            7. NAVIGATE_TO_PAGE: User asks to go to a section of the app (e.g., "Go to resale marketplace", "Open organizer dashboard").
            8. VIEW_ORGANIZER_ANALYTICS: Organizer asks for sales/revenue metrics (e.g., "How many tickets did I sell?", "Show my revenue").
            9. VIEW_ORGANIZER_EVENTS: Organizer asks for their managed events (e.g., "Show my events", "List organizer events").
            10. SEARCH_RESALE_LISTINGS: User wants secondary marketplace tickets (e.g., "Search resale tickets").
            11. SELECT_SEATS: User asks to select or highlight seats on the seat map (e.g., "Select seat A12", "Pick seats B1 and B2").
            12. UPDATE_SELECTION: User asks to change quantity or tier (e.g., "Make it three instead", "Choose the cheaper category").
            13. START_TICKET_PURCHASE: User requests to book, reserve, or purchase tickets (e.g., "Book two tickets for this concert", "Book seat A12", "Buy 2 tickets for Anuv Jain").
            14. CONFIRM_PAYMENT: User confirms payment for an active order (e.g., "Confirm payment", "Pay now", "Complete payment").
            15. UNKNOWN_OR_UNSUPPORTED: Anything ambiguous, unrelated, or unsupported.
            
            ACTIVE EVENT CATALOG (Use exact slug for parameters.eventSlug):
            - "route-143-anuv-jain-live-chennai": Route 143, Anuv Jain, root 143, road 143, Baarishein, Husn
            - "the-sing-along-night-hip-hop-tamizha-idam": Hip Hop Tamizha, Hip Hop Adhi, Adhi, The Sing-Along Night
            - "max-urbn-unmute-spotify-rap-91-chennai": MAX URBN UNMUTE, Asal Kolaar, Asal Kolar, Dacalty, Rap 91
            - "vir-das-sounds-of-india-chennai": Vir Das, Sounds of India, comedy, standup
            - "rolling-loud-india-2026-mumbai": Rolling Loud India 2026, hip hop
            - "gorillaz-the-mountain-tour-bengaluru-2027": Gorillaz, The Mountain Tour
            - "aws-future-builders-connect-chennai-2026": AWS Builder Center, Future Builders Connect
            
            You must output ONLY valid JSON matching this schema:
            {
              "intent": "<ONE_OF_THE_ABOVE_INTENTS>",
              "parameters": {
                "query": "<optional search keyword, artist, or event name>",
                "category": "<optional category uppercase>",
                "city": "<optional city name>",
                "eventSlug": "<exact event slug if recognized>",
                "seatLabels": ["<seat label, e.g. A12>"],
                "sectionName": "<optional section name>",
                "quantity": 1,
                "ticketTierName": "<optional tier>",
                "orderId": "<optional order id>",
                "pageRoute": "<optional route>"
              },
              "confirmationRequired": false,
              "explanation": "<short rationale>"
            }
            Do not output any markdown formatting, backticks, or text outside the JSON.
            """;

    public IntentParserService(AiProviderClient aiProviderClient, ObjectMapper objectMapper) {
        this.aiProviderClient = aiProviderClient;
        this.objectMapper = objectMapper;
    }

    public ParsedIntentDto parseIntent(String rawTranscript) {
        return parseIntent(rawTranscript, null);
    }

    public ParsedIntentDto parseIntent(String rawTranscript, ApplicationContextDto context) {
        if (rawTranscript == null || rawTranscript.trim().isEmpty()) {
            return new ParsedIntentDto(
                    AssistantIntent.UNKNOWN_OR_UNSUPPORTED,
                    Map.of(),
                    false,
                    "Empty input received"
            );
        }

        String sanitizedInput = sanitizeTranscript(rawTranscript);

        // Try AI interpretation via provider client
        String rawResponse = null;
        try {
            rawResponse = aiProviderClient.generateContent(SYSTEM_INSTRUCTION, sanitizedInput);
        } catch (Exception e) {
            log.warn("AI provider invocation failed: {}", e.getMessage());
        }

        if (rawResponse != null && !rawResponse.trim().isEmpty()) {
            ParsedIntentDto parsed = tryParseJsonResponse(rawResponse, context);
            if (parsed != null && parsed.intent() != null && parsed.intent() != AssistantIntent.UNKNOWN_OR_UNSUPPORTED) {
                return parsed;
            }
        }

        // Resilient deterministic fallback for core EventPulse intents
        log.info("Employing deterministic heuristic parser for: '{}'", sanitizedInput);
        return fallbackDeterministicParser(sanitizedInput, context);
    }

    private ParsedIntentDto tryParseJsonResponse(String json, ApplicationContextDto context) {
        try {
            JsonNode root = objectMapper.readTree(json);
            String intentStr = root.path("intent").asText("");
            AssistantIntent intent;
            try {
                intent = AssistantIntent.valueOf(intentStr.toUpperCase().trim());
            } catch (IllegalArgumentException e) {
                intent = AssistantIntent.UNKNOWN_OR_UNSUPPORTED;
            }

            Map<String, Object> params = new LinkedHashMap<>();
            JsonNode paramsNode = root.path("parameters");
            if (paramsNode.isObject()) {
                paramsNode.fields().forEachRemaining(entry -> {
                    if (!entry.getValue().isNull()) {
                        if (entry.getValue().isArray()) {
                            List<String> list = new ArrayList<>();
                            entry.getValue().forEach(item -> list.add(item.asText()));
                            params.put(entry.getKey(), list);
                        } else {
                            params.put(entry.getKey(), entry.getValue().asText().trim());
                        }
                    }
                });
            }

            // Enrich with context if missing in AI response
            enrichWithContext(params, context);

            boolean confirmationRequired = root.path("confirmationRequired").asBoolean(intent.isTransactional());
            String explanation = root.path("explanation").asText("Interpreted via " + aiProviderClient.getProviderName());

            return new ParsedIntentDto(intent, params, confirmationRequired, explanation);
        } catch (Exception e) {
            log.warn("Failed to parse JSON response from AI provider: {} | Raw: {}", e.getMessage(), json);
            return null;
        }
    }

    private void enrichWithContext(Map<String, Object> params, ApplicationContextDto context) {
        if (context == null) return;

        if (!params.containsKey("eventSlug") && !params.containsKey("eventId")) {
            if (context.eventSlug() != null && !context.eventSlug().isBlank()) {
                params.put("eventSlug", context.eventSlug());
            } else if (context.eventId() != null) {
                params.put("eventId", context.eventId().toString());
            }
        }

        if (!params.containsKey("sectionName") && context.activeSection() != null) {
            params.put("sectionName", context.activeSection());
        }

        if (!params.containsKey("orderId") && context.orderId() != null) {
            params.put("orderId", context.orderId().toString());
        }
    }

    public ParsedIntentDto fallbackDeterministicParser(String text, ApplicationContextDto context) {
        String lower = text.toLowerCase().trim();

        // 0. Normalize speech recognition typos
        String normalized = lower
                .replace("sea availability", "see availability")
                .replace("sea available", "see available")
                .replace("sea tickets", "see tickets")
                .replace("sea ", "see ")
                .replace("root 143", "route 143")
                .replace("road 143", "route 143")
                .replace("root", "route")
                .replace("asal kolar", "asal kolaar")
                .replace("hip hop adhi", "hip hop tamizha")
                .replace("hiphop adhi", "hip hop tamizha")
                .replace("hiphop tamizha", "hip hop tamizha")
                .replace("tamila", "tamizha");

        Map<String, Object> params = new LinkedHashMap<>();

        // Extract Seats (e.g. A12, seats A12 and A13, seat B4)
        List<String> extractedSeats = extractSeats(normalized);
        if (!extractedSeats.isEmpty()) {
            params.put("seatLabels", extractedSeats);
        }

        // Extract Quantity
        Integer quantity = extractQuantity(normalized);
        if (quantity != null) {
            params.put("quantity", quantity);
        }

        // Extract Section (e.g. "in VIP", "section Balcony")
        String section = extractSection(normalized);
        if (section != null) {
            params.put("sectionName", section);
        }

        // Event Detection by Name / Keywords
        String detectedSlug = null;
        if (normalized.contains("143") || normalized.contains("anuv") || normalized.contains("route 143")) {
            detectedSlug = "route-143-anuv-jain-live-chennai";
        } else if (normalized.contains("tamizha") || normalized.contains("sing along") || normalized.contains("adhi") || normalized.contains("hip hop") || normalized.contains("hiphop")) {
            detectedSlug = "the-sing-along-night-hip-hop-tamizha-idam";
        } else if (normalized.contains("asal") || normalized.contains("kolaar") || normalized.contains("kolar") || normalized.contains("dacalty") || normalized.contains("unmute")) {
            detectedSlug = "max-urbn-unmute-spotify-rap-91-chennai";
        } else if (normalized.contains("vir") || normalized.contains("das")) {
            detectedSlug = "vir-das-sounds-of-india-chennai";
        } else if (normalized.contains("gorillaz")) {
            detectedSlug = "gorillaz-the-mountain-tour-bengaluru-2027";
        } else if (normalized.contains("rolling loud")) {
            detectedSlug = "rolling-loud-india-2026-mumbai";
        } else if (normalized.contains("aws") || normalized.contains("builders")) {
            detectedSlug = "aws-future-builders-connect-chennai-2026";
        }

        // If no explicit event in speech, check if user refers to "this concert" / "here" / "this event"
        if (detectedSlug == null && context != null) {
            if (normalized.contains("this concert") || normalized.contains("this event") || normalized.contains("here") ||
                    normalized.contains("these tickets") || normalized.contains("the event") || normalized.contains("seat ") || !extractedSeats.isEmpty() || quantity != null) {
                if (context.eventSlug() != null && !context.eventSlug().isBlank()) {
                    detectedSlug = context.eventSlug();
                } else if (context.eventId() != null) {
                    params.put("eventId", context.eventId().toString());
                }
            }
        }

        if (detectedSlug != null) {
            params.put("eventSlug", detectedSlug);
        }

        enrichWithContext(params, context);

        // 1. Payment Confirmation
        if (normalized.contains("confirm payment") || normalized.contains("complete payment") ||
                normalized.contains("pay now") || normalized.contains("proceed to payment") || normalized.contains("pay for order")) {
            return new ParsedIntentDto(AssistantIntent.CONFIRM_PAYMENT, params, true, "Rule match: Payment confirmation");
        }

        // 2. Select Seats on map (Level 1 reversible selection)
        if (normalized.startsWith("select seat") || normalized.startsWith("pick seat") || normalized.startsWith("choose seat") ||
                normalized.contains("select seat") || normalized.contains("pick seat")) {
            return new ParsedIntentDto(AssistantIntent.SELECT_SEATS, params, false, "Rule match: Seat selection on map");
        }

        // 3. Selection Updates ("make it three instead", "choose the cheaper category")
        if (normalized.contains("make it") || normalized.contains("change quantity") || normalized.contains("cheaper category") || normalized.contains("vip category")) {
            if (normalized.contains("cheaper")) params.put("ticketTierPreference", "CHEAPEST");
            if (normalized.contains("vip")) params.put("ticketTierName", "VIP");
            return new ParsedIntentDto(AssistantIntent.UPDATE_SELECTION, params, false, "Rule match: Update pending selection");
        }

        // 4. Booking Requests (e.g. "book two tickets for this concert", "book seat A12", "buy 2 tickets for Anuv Jain")
        if (normalized.startsWith("book") || normalized.startsWith("buy") || normalized.startsWith("reserve") ||
                normalized.contains("book two tickets") || normalized.contains("book 2 tickets") ||
                normalized.contains("book tickets") || normalized.contains("book seat") || normalized.contains("hold seat")) {
            boolean isHold = normalized.contains("hold");
            AssistantIntent intent = isHold ? AssistantIntent.HOLD_SEATS : AssistantIntent.START_TICKET_PURCHASE;
            return new ParsedIntentDto(intent, params, true, "Rule match: Ticket booking initiation");
        }

        // 5. Navigation Commands (evaluate before generic words)
        if (lower.startsWith("go to ") || lower.startsWith("navigate to ") || lower.contains("navigate to ") || lower.startsWith("take me to ") || lower.startsWith("open ")) {
            String route = "/events";
            if (lower.contains("ticket")) route = "/my-tickets";
            else if (lower.contains("order")) route = "/my-orders";
            else if (lower.contains("resale") || lower.contains("marketplace")) route = "/resale";
            else if (lower.contains("organizer") && (lower.contains("dashboard") || lower.contains("studio") || lower.contains("page"))) route = "/organizer";
            else if (lower.contains("admin") || lower.contains("telemetry")) route = "/admin";
            else if (lower.contains("scanner") || lower.contains("gate")) route = "/scanner";
            else if (lower.contains("venue")) route = "/venue-studio";
            else if (lower.contains("login") || lower.contains("sign in")) route = "/login";
            else if (detectedSlug != null) route = "/events/" + detectedSlug;

            return new ParsedIntentDto(AssistantIntent.NAVIGATE_TO_PAGE, Map.of("pageRoute", route), false, "Rule match: Navigation");
        }

        // 6. Ticket Wallet
        if (lower.contains("my ticket") || lower.contains("my pass") || lower.contains("show tickets") || lower.contains("open wallet") || lower.contains("ticket pass")) {
            return new ParsedIntentDto(AssistantIntent.VIEW_MY_TICKETS, params, false, "Rule match: Ticket wallet query");
        }

        // 7. Order Status & History
        if ((lower.contains("order") && (lower.contains("status") || lower.contains("check"))) || lower.contains("payment status")) {
            Matcher matcher = Pattern.compile("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}").matcher(text);
            if (matcher.find()) {
                params.put("orderId", matcher.group());
            }
            return new ParsedIntentDto(AssistantIntent.CHECK_ORDER_STATUS, params, false, "Rule match: Order status query");
        }

        if (lower.contains("my order") || lower.contains("booking history") || lower.contains("past orders") || lower.contains("show orders")) {
            return new ParsedIntentDto(AssistantIntent.VIEW_MY_ORDERS, params, false, "Rule match: Order history query");
        }

        // 8. Organizer Commands
        if (lower.contains("organizer") || lower.contains("my event")) {
            if (lower.contains("stats") || lower.contains("analytics") || lower.contains("revenue") || lower.contains("sales") || lower.contains("sold")) {
                return new ParsedIntentDto(AssistantIntent.VIEW_ORGANIZER_ANALYTICS, params, false, "Rule match: Organizer analytics");
            }
            if (lower.contains("my events") || lower.contains("list events") || lower.contains("manage events")) {
                return new ParsedIntentDto(AssistantIntent.VIEW_ORGANIZER_EVENTS, params, false, "Rule match: Organizer events");
            }
        }

        // 9. Resale Secondary Market
        if (lower.contains("resale") || lower.contains("secondary market") || lower.contains("fan ticket")) {
            return new ParsedIntentDto(AssistantIntent.SEARCH_RESALE_LISTINGS, params, false, "Rule match: Resale market");
        }

        // 10. View Event Details
        if (detectedSlug != null) {
            return new ParsedIntentDto(AssistantIntent.VIEW_EVENT_DETAILS, params, false, "Rule match: Event details query");
        }

        // 11. Event Search & Filter
        String category = null;
        if (lower.contains("comedy") || lower.contains("standup")) category = "COMEDY";
        else if (lower.contains("concert") || lower.contains("music") || lower.contains("live music")) category = "CONCERT";
        else if (lower.contains("festival")) category = "FESTIVAL";
        else if (lower.contains("sports")) category = "SPORTS";
        else if (lower.contains("theatre")) category = "THEATRE";
        else if (lower.contains("conference")) category = "CONFERENCE";

        if (category != null) params.put("category", category);

        if (lower.contains("chennai")) params.put("city", "Chennai");
        else if (lower.contains("bengaluru") || lower.contains("bangalore")) params.put("city", "Bengaluru");
        else if (lower.contains("mumbai")) params.put("city", "Mumbai");

        Matcher priceMatcher = Pattern.compile("(?i)(?:under|below|less than|max(?:imum)?)\\s*(?:rs\\.?|inr|₹)?\\s*(\\d+)").matcher(lower);
        if (priceMatcher.find()) {
            params.put("maxPrice", priceMatcher.group(1));
        }

        if (!params.isEmpty() || lower.contains("event") || lower.contains("show") || lower.contains("find") || lower.contains("search")) {
            params.put("query", text);
            return new ParsedIntentDto(AssistantIntent.SEARCH_EVENTS, params, false, "Rule match: Event search");
        }

        return new ParsedIntentDto(AssistantIntent.UNKNOWN_OR_UNSUPPORTED, params, false, "Fallback: Unsupported command");
    }

    private List<String> extractSeats(String text) {
        List<String> seats = new ArrayList<>();
        // Look for expressions like "seat A12", "seats A12, A13", "seat B4"
        Matcher m = Pattern.compile("(?i)\\bseats?\\s+([a-z]?\\d{1,3}(?:(?:\\s*,\\s*|\\s+and\\s+|\\s+&\\s+|\\s+)[a-z]?\\d{1,3})*)|(?i)\\b([a-z]\\d{1,3})\\b").matcher(text);
        while (m.find()) {
            if (m.group(1) != null) {
                String group = m.group(1);
                String[] parts = group.split("(?i)\\s*(?:,|and|&|\\s)\\s*");
                for (String p : parts) {
                    String clean = p.trim().toUpperCase();
                    if (!clean.isEmpty() && clean.matches("^[A-Z]?\\d{1,3}$")) {
                        seats.add(clean);
                    }
                }
            } else if (m.group(2) != null) {
                String candidate = m.group(2).trim().toUpperCase();
                // Filter out common false positives like "IN", "IS", "ON", "AT"
                if (candidate.matches("^[A-Z]\\d{1,3}$") && !seats.contains(candidate)) {
                    seats.add(candidate);
                }
            }
        }
        return seats;
    }

    private Integer extractQuantity(String text) {
        Matcher m = QUANTITY_PATTERN.matcher(text);
        if (m.find()) {
            String word = m.group(1).toLowerCase();
            return switch (word) {
                case "one", "a", "single" -> 1;
                case "two", "pair" -> 2;
                case "three" -> 3;
                case "four" -> 4;
                case "five" -> 5;
                case "six" -> 6;
                case "seven" -> 7;
                case "eight" -> 8;
                case "nine" -> 9;
                case "ten" -> 10;
                default -> {
                    try {
                        yield Integer.parseInt(word);
                    } catch (NumberFormatException e) {
                        yield null;
                    }
                }
            };
        }
        // Direct number followed by tickets/passes
        Matcher directNum = Pattern.compile("(?i)\\b(\\d+)\\s*(?:tickets?|passes?|seats?)?\\b").matcher(text);
        if (directNum.find()) {
            try {
                int val = Integer.parseInt(directNum.group(1));
                if (val > 0 && val <= 20) return val;
            } catch (Exception ignored) {}
        }
        return null;
    }

    private String extractSection(String text) {
        Matcher m = Pattern.compile("(?i)\\b(?:in|at|section)\\s+(vip|balcony|floor|regular|general|gold|silver|platinum|upper|lower)\\b").matcher(text);
        if (m.find()) {
            return m.group(1).toUpperCase();
        }
        return null;
    }

    private String sanitizeTranscript(String raw) {
        if (raw == null) return "";
        return raw.replaceAll("[<>\"'{}\\\\]", "").trim();
    }
}
