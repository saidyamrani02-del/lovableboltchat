-- Allow admins to update any wallet
CREATE POLICY "Admins can update any wallet"
ON public.wallets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for video_calls table so recipients get notified
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_calls;