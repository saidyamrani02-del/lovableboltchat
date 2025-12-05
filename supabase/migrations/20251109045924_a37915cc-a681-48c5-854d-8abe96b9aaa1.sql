-- Fix admin wallet update RLS policy
-- Drop the existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can update any wallet" ON public.wallets;

-- Create a proper admin update policy
CREATE POLICY "Admins can update any wallet"
ON public.wallets
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Also add policy for admins to view all wallets
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;

CREATE POLICY "Admins can view all wallets"
ON public.wallets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));