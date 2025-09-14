/**
 * Attendee-related type definitions.
 */

export interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  ticket_quantity: number;
  total_price: number;
  payment_mode: 'cash' | 'zelle';
  food_option: 'with_food' | 'without_food';
  qr_code_id: string;
  created_at: string;
  checked_in_at: string | null;
  is_checked_in: boolean;
  qr_code_url?: string;
}

export interface AttendeeResponse extends Attendee {}

export interface AttendeeCreate {
  name: string;
  email: string;
  phone: string;
  ticket_quantity: number;
  payment_mode: 'cash' | 'zelle';
  food_option: 'with_food' | 'without_food';
}

export interface CheckInRequest {
  qr_code_id: string;
}

export interface CheckInResponse {
  success: boolean;
  attendee: Attendee;
  message: string;
}

export interface AttendeeFilter {
  checked_in?: boolean;
  search?: string;
  food_option?: string;
  limit?: number;
  offset?: number;
}

export type AttendeeFilterParams = Record<string, string | number | boolean>;

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  total_pages: number;
  current_page: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface EventStats {
  total_registered: number;
  total_checked_in: number;
  checked_in_percentage: number;
  total_tickets_sold: number;
  total_revenue: number;
  revenue_cash: number;
  revenue_zelle: number;
  recent_checkins: Attendee[];
}

export enum AttendeeStatus {
  REGISTERED = 'registered',
  CHECKED_IN = 'checked_in',
}

export interface QRCodeData {
  qr_code_id: string;
  attendee_name?: string;
  event_name?: string;
}

// Ticket pricing types
export interface TicketPricingTier {
  quantity_from: number;
  quantity_to: number;
  price_per_ticket: number;
  total_price: number;
}

export interface TicketPricingInfo {
  tiers: TicketPricingTier[];
  max_tickets: number;
}

export interface TicketCalculationRequest {
  quantity: number;
}

export interface TicketCalculationResponse {
  quantity: number;
  price_per_ticket: number;
  total_price: number;
  pricing_tier: TicketPricingTier;
}

export interface TicketPricingResponse {
  id: string;
  event_id: string;
  quantity_from: number;
  quantity_to: number;
  price_per_ticket: number;
  created_at: string;
  updated_at: string;
}

export interface TicketPricingCreate {
  event_id: string;
  quantity_from: number;
  quantity_to: number;
  price_per_ticket: number;
}

export interface TicketPricingUpdate {
  quantity_from: number;
  quantity_to: number;
  price_per_ticket: number;
}
