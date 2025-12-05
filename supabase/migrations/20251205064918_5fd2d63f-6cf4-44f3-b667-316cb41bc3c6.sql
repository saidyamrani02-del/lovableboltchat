-- Add Metered API settings columns to api_settings table
ALTER TABLE public.api_settings 
ADD COLUMN IF NOT EXISTS metered_app_name TEXT,
ADD COLUMN IF NOT EXISTS metered_secret_key TEXT;