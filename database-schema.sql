-- Volunteer Event Check-in Database Schema for Supabase
-- This file contains the SQL commands to set up the database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table for authentication
CREATE TABLE public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('president', 'volunteer')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create volunteer applications table
CREATE TABLE public.volunteer_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT volunteer_applications_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT volunteer_applications_name_check CHECK (length(trim(name)) >= 2),
    CONSTRAINT volunteer_applications_phone_check CHECK (length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10)
);

-- Create events table (for future multi-event support)
CREATE TABLE public.events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    max_attendees INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create ticket pricing table
CREATE TABLE public.ticket_pricing (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    quantity_from INTEGER NOT NULL CHECK (quantity_from >= 1),
    quantity_to INTEGER NOT NULL CHECK (quantity_to >= 1),
    price_per_ticket DECIMAL(10,2) NOT NULL CHECK (price_per_ticket >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT ticket_pricing_quantity_range CHECK (quantity_from <= quantity_to),
    CONSTRAINT ticket_pricing_unique_range UNIQUE (event_id, quantity_from, quantity_to)
);

-- Create attendees table
CREATE TABLE public.attendees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    ticket_quantity INTEGER NOT NULL DEFAULT 1 CHECK (ticket_quantity >= 1 AND ticket_quantity <= 20),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    payment_mode VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash','zelle')),
    created_by UUID REFERENCES public.users(id),
    qr_code_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    qr_code_url TEXT,
    is_checked_in BOOLEAN DEFAULT FALSE NOT NULL,
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT attendees_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT attendees_name_check CHECK (length(trim(name)) >= 2),
    CONSTRAINT attendees_phone_check CHECK (length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_is_active ON public.users(is_active);

CREATE INDEX idx_volunteer_applications_email ON public.volunteer_applications(email);
CREATE INDEX idx_volunteer_applications_status ON public.volunteer_applications(status);
CREATE INDEX idx_volunteer_applications_created_at ON public.volunteer_applications(created_at);
CREATE INDEX idx_volunteer_applications_reviewed_by ON public.volunteer_applications(reviewed_by);

CREATE INDEX idx_attendees_email ON public.attendees(email);
CREATE INDEX idx_attendees_qr_code_id ON public.attendees(qr_code_id);
CREATE INDEX idx_attendees_is_checked_in ON public.attendees(is_checked_in);
CREATE INDEX idx_attendees_created_at ON public.attendees(created_at);
CREATE INDEX idx_attendees_checked_in_at ON public.attendees(checked_in_at);
CREATE INDEX idx_attendees_event_id ON public.attendees(event_id);
CREATE INDEX idx_attendees_ticket_quantity ON public.attendees(ticket_quantity);
CREATE INDEX idx_attendees_created_by ON public.attendees(created_by);

CREATE INDEX idx_ticket_pricing_event_id ON public.ticket_pricing(event_id);
CREATE INDEX idx_ticket_pricing_quantity_range ON public.ticket_pricing(quantity_from, quantity_to);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volunteer_applications_updated_at 
    BEFORE UPDATE ON public.volunteer_applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON public.events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendees_updated_at 
    BEFORE UPDATE ON public.attendees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_pricing_updated_at 
    BEFORE UPDATE ON public.ticket_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically set checked_in_at when is_checked_in becomes true
CREATE OR REPLACE FUNCTION set_checked_in_at()
RETURNS TRIGGER AS $$
BEGIN
    -- If is_checked_in is being set to true and was previously false
    IF NEW.is_checked_in = TRUE AND (OLD.is_checked_in = FALSE OR OLD.is_checked_in IS NULL) THEN
        NEW.checked_in_at = NOW();
    END IF;
    
    -- If is_checked_in is being set to false, clear checked_in_at
    IF NEW.is_checked_in = FALSE AND OLD.is_checked_in = TRUE THEN
        NEW.checked_in_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic checked_in_at setting
CREATE TRIGGER set_attendee_checked_in_at 
    BEFORE UPDATE ON public.attendees 
    FOR EACH ROW EXECUTE FUNCTION set_checked_in_at();

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_pricing ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can be created by service role" ON public.users
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Volunteer applications policies
CREATE POLICY "Volunteer applications can be created by everyone" ON public.volunteer_applications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Volunteer applications can be viewed by presidents only" ON public.volunteer_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'president' 
            AND users.is_active = true
        )
    );

CREATE POLICY "Volunteer applications can be updated by presidents only" ON public.volunteer_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'president' 
            AND users.is_active = true
        )
    );

-- Events policies (adjust based on your authentication requirements)
CREATE POLICY "Events are viewable by everyone" ON public.events
    FOR SELECT USING (true);

CREATE POLICY "Events can be created by authenticated users" ON public.events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Events can be updated by authenticated users" ON public.events
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Attendees policies
CREATE POLICY "Attendees are viewable by everyone" ON public.attendees
    FOR SELECT USING (true);

CREATE POLICY "Attendees can be created by everyone" ON public.attendees
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Attendees can be updated by everyone" ON public.attendees
    FOR UPDATE USING (true);

-- Ticket pricing policies
CREATE POLICY "Ticket pricing is viewable by everyone" ON public.ticket_pricing
    FOR SELECT USING (true);

CREATE POLICY "Ticket pricing can be managed by presidents only" ON public.ticket_pricing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'president' 
            AND users.is_active = true
        )
    );

-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr-codes', 'qr-codes', true);

-- Storage policies for QR codes
CREATE POLICY "QR codes are publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'qr-codes');

CREATE POLICY "QR codes can be uploaded by everyone" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'qr-codes');

-- Insert a default event (optional)
INSERT INTO public.events (name, description, event_date, location) 
VALUES (
    'Volunteer Event 2024',
    'Annual volunteer event for community service',
    '2024-12-31 18:00:00+00',
    'Community Center'
);

-- Insert default ticket pricing tiers
INSERT INTO public.ticket_pricing (event_id, quantity_from, quantity_to, price_per_ticket) 
SELECT 
    e.id,
    t.quantity_from,
    t.quantity_to,
    t.price_per_ticket
FROM public.events e
CROSS JOIN (
    VALUES 
        (1, 1, 25.00),
        (2, 5, 22.00),
        (6, 10, 20.00),
        (11, 20, 18.00)
) AS t(quantity_from, quantity_to, price_per_ticket)
WHERE e.name = 'Volunteer Event 2024';

-- Create a view for event statistics
CREATE OR REPLACE VIEW public.event_stats AS
SELECT 
    e.id as event_id,
    e.name as event_name,
    COUNT(a.id) as total_registered,
    COUNT(CASE WHEN a.is_checked_in = true THEN 1 END) as total_checked_in,
    ROUND(
        (COUNT(CASE WHEN a.is_checked_in = true THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0)), 
        2
    ) as checked_in_percentage,
    COUNT(CASE WHEN a.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as registrations_last_24h,
    COUNT(CASE WHEN a.checked_in_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as checkins_last_24h,
    SUM(a.ticket_quantity) as total_tickets_sold,
    SUM(a.total_price) as total_revenue,
    COALESCE(SUM(CASE WHEN a.payment_mode = 'cash' THEN a.total_price ELSE 0 END), 0) as revenue_cash,
    COALESCE(SUM(CASE WHEN a.payment_mode = 'zelle' THEN a.total_price ELSE 0 END), 0) as revenue_zelle
FROM public.events e
LEFT JOIN public.attendees a ON e.id = a.event_id
GROUP BY e.id, e.name;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.volunteer_applications TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.events TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.attendees TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.ticket_pricing TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.event_stats TO postgres, anon, authenticated, service_role;

-- Comments for documentation
COMMENT ON TABLE public.users IS 'Users table for authentication (presidents and volunteers)';
COMMENT ON TABLE public.volunteer_applications IS 'Volunteer applications table for signup and approval workflow';
COMMENT ON TABLE public.events IS 'Events table for storing event information';
COMMENT ON TABLE public.attendees IS 'Attendees table for storing registration and check-in data';
COMMENT ON TABLE public.ticket_pricing IS 'Ticket pricing table for different quantity tiers';
COMMENT ON COLUMN public.attendees.qr_code_id IS 'Unique identifier used in QR codes for check-in';
COMMENT ON COLUMN public.attendees.qr_code_url IS 'URL to the QR code image stored in Supabase Storage';
COMMENT ON COLUMN public.attendees.is_checked_in IS 'Boolean flag indicating if attendee has checked in';
COMMENT ON COLUMN public.attendees.checked_in_at IS 'Timestamp when attendee checked in (auto-set by trigger)';
COMMENT ON COLUMN public.attendees.ticket_quantity IS 'Number of tickets purchased by this attendee (1-20)';
COMMENT ON COLUMN public.attendees.total_price IS 'Total price paid for all tickets';
COMMENT ON COLUMN public.ticket_pricing.quantity_from IS 'Starting quantity for this pricing tier (inclusive)';
COMMENT ON COLUMN public.ticket_pricing.quantity_to IS 'Ending quantity for this pricing tier (inclusive)';
COMMENT ON COLUMN public.ticket_pricing.price_per_ticket IS 'Price per ticket for this quantity range';
COMMENT ON VIEW public.event_stats IS 'Aggregated statistics for events and attendees';
