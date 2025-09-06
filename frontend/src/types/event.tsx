/**
 * Event types for the frontend.
 */

export interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  location: string;
  created_at: string;
  updated_at?: string;
}

export interface EventCreate {
  name: string;
  description: string;
  event_date: string;
  location: string;
}

export interface EventUpdate {
  name?: string;
  description?: string;
  event_date?: string;
  location?: string;
}

export interface EventResponse extends Event {}
