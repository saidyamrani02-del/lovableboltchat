-- Allow all authenticated users to READ api_settings (needed for video calls)
-- But only admins can INSERT/UPDATE/DELETE

DROP POLICY IF EXISTS "Only admins can manage API settings" ON public.api_settings;
DROP POLICY IF EXISTS "Service role can read API settings" ON public.api_settings;

-- Everyone can read api settings (needed for video calls to work)
CREATE POLICY "Anyone can read api settings"
ON public.api_settings
FOR SELECT
USING (true);

-- Only admins can update api settings  
CREATE POLICY "Admins can update api settings"
ON public.api_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert api settings
CREATE POLICY "Admins can insert api settings"
ON public.api_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete api settings
CREATE POLICY "Admins can delete api settings"
ON public.api_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));