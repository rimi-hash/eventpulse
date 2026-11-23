export type AssistantIntent =
  | 'SEARCH_EVENTS'
  | 'FILTER_EVENTS'
  | 'VIEW_EVENT_DETAILS'
  | 'VIEW_MY_TICKETS'
  | 'VIEW_MY_ORDERS'
  | 'CHECK_ORDER_STATUS'
  | 'NAVIGATE_TO_PAGE'
  | 'VIEW_ORGANIZER_ANALYTICS'
  | 'VIEW_ORGANIZER_EVENTS'
  | 'SEARCH_RESALE_LISTINGS'
  | 'SELECT_SEATS'
  | 'UPDATE_SELECTION'
  | 'START_TICKET_PURCHASE'
  | 'HOLD_SEATS'
  | 'CONFIRM_PAYMENT'
  | 'START_RESALE_PURCHASE'
  | 'CREATE_OR_EDIT_EVENT'
  | 'CREATE_EVENT_COUPON'
  | 'ADMIN_REPORTS'
  | 'UNKNOWN_OR_UNSUPPORTED';

export type ExecutionStatus =
  | 'UNDERSTANDING'
  | 'NEEDS_CLARIFICATION'
  | 'REQUIRES_AUTHENTICATION'
  | 'REQUIRES_CONFIRMATION'
  | 'RETRIEVING_DATA'
  | 'EXECUTING'
  | 'AWAITING_PAYMENT'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'NOT_FOUND'
  | 'SOLD_OUT'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'FAILED'
  | 'REQUIRES_AUTH' // legacy alias
  | 'NO_RESULTS'   // legacy alias
  | 'ERROR'        // legacy alias
  | 'UNKNOWN';

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'understanding'
  | 'resolving'
  | 'checking_availability'
  | 'preparing_selection'
  | 'thinking'
  | 'processing'
  | 'executing'
  | 'confirming'
  | 'awaiting_payment'
  | 'verifying'
  | 'success'
  | 'error';

export interface ResponseSource {
  type: string;
  verified: boolean;
  sourceDetails?: string;
}

export interface ActionResult {
  performed: boolean;
  requiresConfirmation: boolean;
  verified: boolean;
  actionType: string;
}

export interface BookingQuote {
  eventId: string;
  eventTitle: string;
  venueName: string;
  sessionId: string;
  ticketTypeId: string;
  ticketTierName: string;
  seatIds?: string[];
  seatLabels?: string[];
  sectionName?: string;
  quantity: number;
  unitBasePrice: number;
  subtotal: number;
  serviceFee: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}

export interface ApplicationContext {
  currentPath?: string;
  pageType?: string; // EXPLORE, EVENT_DETAIL, CHECKOUT, ORDER_CONFIRMATION, MY_TICKETS, MY_ORDERS, ORGANIZER, RESALE, etc.
  eventId?: string;
  eventSlug?: string;
  eventTitle?: string;
  sessionId?: string;
  venueId?: string;
  venueName?: string;
  activeSection?: string;
  selectedTicketTypeId?: string;
  selectedTicketTierName?: string;
  selectedSeatIds?: string[];
  selectedSeatLabels?: string[];
  quantity?: number;
  orderId?: string;
  checkoutStage?: string;
  isAuthenticated?: boolean;
  userRole?: string;
}

export interface AssistantChatResponse {
  requestId?: string;
  originalTranscript: string;
  intent: AssistantIntent;
  status: ExecutionStatus;
  spokenText: string;
  displayText: string;
  actionRoute?: string;
  data?: any;
  requiresConfirmation: boolean;
  pendingAction?: {
    intent?: string;
    actionName: string;
    actionToken?: string;
    parameters?: Record<string, any>;
    eventTitle?: string;
    totalAmount?: number;
    quantity?: number;
    initiatedBy?: string;
    timestamp?: number;
  };
  bookingQuote?: BookingQuote;
  sources?: ResponseSource[];
  missingInformation?: string[];
  suggestedFollowUps?: string[];
  action?: ActionResult;
}

export interface AssistantChatRequest {
  transcript: string;
  currentPath?: string;
  confirmed?: boolean;
  actionToken?: string;
  context?: ApplicationContext;
  parameters?: Record<string, any>;
}

export interface ToolDefinition {
  name: string;
  intentName: string;
  description: string;
  permissionLevel: string;
  requiresAuth: boolean;
  allowedRoles: string[];
  requiresConfirmation: boolean;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}
