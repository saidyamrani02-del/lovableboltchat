-- Fix RLS on api_settings to allow service role access for edge functions
-- This allows edge functions to read API settings regardless of the caller
DROP POLICY IF EXISTS "Only admins can manage API settings" ON public.api_settings;

CREATE POLICY "Only admins can manage API settings"
ON public.api_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role to read API settings (for edge functions)
CREATE POLICY "Service role can read API settings"
ON public.api_settings
FOR SELECT
TO service_role
USING (true);

-- Add order_id to topup_history to track unique transactions
ALTER TABLE public.topup_history ADD COLUMN IF NOT EXISTS order_id TEXT UNIQUE;

-- Create subscriptions payment table
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package subscription_package NOT NULL,
  amount NUMERIC NOT NULL,
  phone_number TEXT NOT NULL,
  order_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on subscription_payments
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_payments
CREATE POLICY "Users can insert own subscription payments"
ON public.subscription_payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription payments"
ON public.subscription_payments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update subscriptions to track payment info
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC,
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.subscription_payments(id);