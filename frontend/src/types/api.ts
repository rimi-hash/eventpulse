export interface ApiResponse<T> {
  success: boolean;
  correlationId?: string;
  timestamp: string;
  message: string;
  data: T;
  metadata?: PageMetadata;
  errors?: string[];
}

export interface PageMetadata {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProblemDetailResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errorCode: string;
  correlationId: string;
  timestamp: string;
  errors?: Array<{
    field: string;
    rejectedValue: unknown;
    message: string;
  }>;
}

export interface HealthStatusResponse {
  status: string;
  version: string;
  javaVersion: string;
  uptimeSeconds: number;
  components: {
    database: string;
    redis: string;
  };
}

export type Role = 'CUSTOMER' | 'ORGANIZER' | 'GATE_STAFF' | 'PLATFORM_ADMIN';

export interface User {
  id: string;
  email: string;
  username?: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: Role;
  isVerified?: boolean;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: string;
  email: string;
  username?: string;
  fullName: string;
  role: Role;
}

export type EventCategory = 'CONCERT' | 'CONFERENCE' | 'THEATRE' | 'SPORTS' | 'COMEDY';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'SALES_OPEN' | 'SOLD_OUT' | 'CANCELLED' | 'COMPLETED';

export interface EventSummary {
  id: string;
  title: string;
  slug: string;
  shortSummary: string;
  category: EventCategory;
  bannerUrl?: string;
  thumbnailUrl?: string;
  status: EventStatus;
  isFeatured: boolean;
  requiresVirtualQueue: boolean;
  venueName: string;
  city: string;
  venueCity?: string;
  startingPrice: number;
  currency: string;
  nextSessionStartsAt?: string;
  startDate?: string;
  ticketSaleStatus?: 'EVENTPULSE_MANAGED' | 'EXTERNAL_TICKETS' | 'INFO_ONLY' | 'UNVERIFIED_PENDING' | string;
  officialInfoUrl?: string;
  officialBookingUrl?: string;
  imageSourceUrl?: string;
  imageAttribution?: string;
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED' | 'VENUE_UNCONFIRMED' | 'PENDING_VERIFICATION' | string;
  lastVerifiedAt?: string;
}

export interface SessionDto {
  id: string;
  sessionTitle: string;
  doorsOpenAt: string;
  startsAt: string;
  endsAt: string;
}

export interface TicketTypeDto {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  serviceFee: number;
  taxAmount: number;
  totalPrice: number;
  currency: string;
  quota: number;
  soldCount: number;
  availableQuantity: number;
  salesStartAt: string;
  salesEndAt: string;
  isActive: boolean;
  sectionId?: string;
  sectionName?: string;
}

export interface EventDetail {
  id: string;
  title: string;
  slug: string;
  shortSummary: string;
  description: string;
  category: EventCategory;
  bannerUrl?: string;
  thumbnailUrl?: string;
  status: EventStatus;
  ageRestriction: string;
  isFeatured: boolean;
  requiresVirtualQueue: boolean;
  maxTicketsPerUser: number;
  organizationId?: string;
  organizationName?: string;
  venueId?: string;
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  venueState?: string;
  venuePostalCode?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  venueDirectionsUrl?: string;
  sessions: SessionDto[];
  ticketTypes: TicketTypeDto[];
  ticketSaleStatus?: 'EVENTPULSE_MANAGED' | 'EXTERNAL_TICKETS' | 'INFO_ONLY' | 'UNVERIFIED_PENDING' | string;
  officialInfoUrl?: string;
  officialBookingUrl?: string;
  imageSourceUrl?: string;
  imageAttribution?: string;
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED' | 'VENUE_UNCONFIRMED' | 'PENDING_VERIFICATION' | string;
  lastVerifiedAt?: string;
}

export type InventoryStatus = 'AVAILABLE' | 'HELD' | 'PAYMENT_PENDING' | 'SOLD' | 'BLOCKED' | 'CANCELLED';

export interface SeatAvailability {
  inventoryId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  seatId?: string;
  rowLabel?: string;
  seatNumber?: string;
  sectionName?: string;
  isGeneralAdmission: boolean;
  status: InventoryStatus;
  gridX?: number;
  gridY?: number;
}

export interface HeldSeat {
  inventoryId: string;
  seatId?: string;
  label: string;
  price: number;
}

export interface HoldResponse {
  holdSessionToken: string;
  expiresAt: string;
  remainingSeconds: number;
  heldSeats: HeldSeat[];
  subtotal: number;
  estimatedFees: number;
  estimatedTaxes: number;
  estimatedTotal: number;
  currency: string;
}

export type OrderStatus = 'CREATED' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';

export interface OrderItemDto {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  unitPrice: number;
  seatLabel?: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  userId: string;
  userName: string;
  eventId: string;
  eventTitle: string;
  eventBannerUrl?: string;
  sessionId: string;
  sessionTitle: string;
  sessionStartsAt: string;
  venueName: string;
  venueCity: string;
  status: OrderStatus;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  serviceFeeAmount: number;
  taxAmount: number;
  totalAmount: number;
  contactEmail: string;
  contactPhone: string;
  items: OrderItemDto[];
  createdAt: string;
}

export interface PaymentIntentResponse {
  paymentId: string;
  orderId: string;
  provider: string;
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  orderNumber: string;
  gatewayProvider: string;
  gatewayTransactionId?: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMED_OUT';
  paymentMethod?: string;
  confirmedAt?: string;
  failureReason?: string;
}

export type TicketStatus = 'ISSUED' | 'TRANSFERRED' | 'USED' | 'REVOKED';

export interface TicketDto {
  id: string;
  ticketNumber: string;
  orderId: string;
  orderNumber: string;
  eventId: string;
  eventTitle: string;
  eventBannerUrl?: string;
  sessionId: string;
  sessionTitle: string;
  sessionStartsAt: string;
  venueName: string;
  venueCity: string;
  ticketTypeName: string;
  seatLabel?: string;
  status: TicketStatus;
  attendeeName: string;
  attendeeEmail: string;
  qrCryptographicPayload: string;
  originalPrice?: number;
  createdAt: string;
}

export type CheckinScanResult = 'VALID' | 'ALREADY_USED' | 'INVALID_TICKET' | 'REVOKED';

export interface CheckinResult {
  scanResult: CheckinScanResult;
  ticketId?: string;
  ticketNumber?: string;
  eventTitle?: string;
  sessionTitle?: string;
  attendeeName?: string;
  seatLabel?: string;
  gateName: string;
  scannedAt: string;
  message: string;
  firstScanDetails?: {
    scannedAt: string;
    gateName: string;
    staffName: string;
  };
}

export interface EventScanStats {
  eventId: string;
  eventTitle: string;
  totalIssued: number;
  totalCheckedIn: number;
  checkinPercentage: number;
  alreadyUsedAttempts: number;
}

export interface QueueResponse {
  eventId: string;
  userId: string;
  sessionToken: string;
  position: number;
  estimatedWaitSeconds: number;
  status: 'WAITING' | 'ADMITTED' | 'EXPIRED';
  admissionToken?: string;
  expiresAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  isRead: boolean;
  createdAt: string;
}

export interface OrganizerStats {
  totalEvents: number;
  activeEvents: number;
  totalTicketsSold: number;
  grossRevenue: number;
  checkinRate: number;
  topEvents: Array<{
    title: string;
    category: string;
    ticketsSold: number;
    totalCapacity: number;
    revenue: number;
  }>;
}

export interface AdminStats {
  totalUsers: number;
  totalOrganizers: number;
  totalEvents: number;
  totalOrders: number;
  platformGrossVolume: number;
  totalTicketsIssued: number;
  totalCheckins: number;
  recentOrders: Array<{
    orderNumber: string;
    customerEmail: string;
    eventTitle: string;
    totalAmount: number;
    status: string;
  }>;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface RazorpayOrderResponse {
  paymentId: string;
  orderId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountInPaise: number;
  currency: string;
  orderNumber: string;
  customerEmail: string;
  customerPhone: string;
  eventTitle: string;
}

export interface RazorpayVerifyRequest {
  orderId: string;
  paymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  billingEmail: string;
  contactEmail?: string;
  contactPhone?: string;
  organizationType?: string;
  description?: string;
  website?: string;
  websiteUrl?: string;
  logoUrl?: string;
  socialLinks?: string;
  businessAddress?: string;
  taxIdentifier?: string;
  operatingProfile?: string;
  payoutStatus?: string;
  payoutProvider?: string;
  verificationStatus: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  reviewedAt?: string;
  reviewedByEmail?: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface CouponDto {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscountCap?: number;
  maxRedemptions?: number;
  redemptionCount: number;
  maxPerCustomer: number;
  startsAt?: string;
  expiresAt?: string;
  isActive: boolean;
  eventId?: string;
  eventTitle?: string;
  statusLabel: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DEPLETED' | 'DISABLED';
  createdAt: string;
}

export interface CouponValidationResultDto {
  valid: boolean;
  message: string;
  couponCode?: string;
  discountAmount: number;
  adjustedSubtotal: number;
}

export interface ResaleListingDto {
  id: string;
  ticketId: string;
  ticketNumber?: string;
  eventId: string;
  eventTitle?: string;
  bannerUrl?: string;
  sessionTitle?: string;
  sessionStartsAt?: string;
  venueName?: string;
  city?: string;
  ticketTypeName?: string;
  seatLabel?: string;
  seatInfo?: string;
  originalPrice: number;
  resalePrice: number;
  totalBuyerAmount?: number;
  feeAmount?: number;
  savingsAmount?: number;
  savingsPercentage?: number;
  status: 'ACTIVE' | 'PAYMENT_PENDING' | 'SOLD' | 'CANCELLED';
  holdExpiresAt?: string;
  sellerId?: string;
  sellerName?: string;
  createdAt?: string;
}

export interface SeatDto {
  id: string;
  sectionId?: string;
  rowLabel: string;
  seatNumber: string;
  isAccessible: boolean;
  isCompanion?: boolean;
  gridX?: number;
  gridY?: number;
  coordX?: number;
  coordY?: number;
  rotation?: number;
  tier?: string;
  overridePrice?: number;
  isBlocked?: boolean;
  isRestrictedView?: boolean;
}

export interface VenueSectionDto {
  id: string;
  name: string;
  sectionCode: string;
  capacity: number;
  isGeneralAdmission: boolean;
  displayOrder: number;
  shapeType?: 'RECTANGLE' | 'CIRCLE' | 'ARC' | 'STADIUM' | 'BANQUET_TABLES' | 'GA_FLOOR' | 'POLYGON';
  transformJson?: string;
  pricingTier?: string;
  basePrice?: number;
  seats?: SeatDto[];
}

export interface VenueDto {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  totalCapacity: number;
  layoutType: string;
  layoutJson?: string;
  layoutVersion?: number;
  status?: string;
  latitude?: number;
  longitude?: number;
  directionsUrl?: string;
  mapProvider?: string;
  sections?: VenueSectionDto[];
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill' | 'circle';
              width?: string | number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: string, callback: (response: unknown) => void) => void;
    };
  }
}

