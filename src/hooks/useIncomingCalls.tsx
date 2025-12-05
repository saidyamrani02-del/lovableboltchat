import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { showCallNotification } from "@/utils/permissions";

interface IncomingCall {
  id: string;
  caller_id: string;
  caller_name: string;
  caller_image?: string;
  price_per_second: number;
}

// Global audio reference to ensure proper cleanup
let globalRingtoneAudio: HTMLAudioElement | null = null;

const stopGlobalRingtone = () => {
  if (globalRingtoneAudio) {
    globalRingtoneAudio.pause();
    globalRingtoneAudio.currentTime = 0;
    globalRingtoneAudio = null;
    console.log('[RINGTONE] Global ringtone stopped');
  }
};

const playGlobalRingtone = async () => {
  stopGlobalRingtone(); // Stop any existing ringtone first
  try {
    globalRingtoneAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    globalRingtoneAudio.loop = true;
    globalRingtoneAudio.volume = 0.5;
    await globalRingtoneAudio.play();
    console.log('[RINGTONE] Playing');
  } catch (e) {
    console.log('[RINGTONE] Could not play:', e);
  }
};

export const useIncomingCalls = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    console.log('[INCOMING CALLS] Setting up listener for user:', user.id);

    // Listen for incoming calls
    const channel = supabase
      .channel(`incoming-calls-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_calls',
        },
        async (payload) => {
          const call = payload.new as any;
          console.log('[INCOMING CALL] New call received:', call);
          
          // Filter: must be for this user
          if (call.recipient_id !== user.id) {
            console.log('[INCOMING CALL] Not for this user, ignoring');
            return;
          }
          
          // Filter: must not be from self
          if (call.caller_id === user.id) {
            console.log('[INCOMING CALL] Call from self, ignoring');
            return;
          }
          
          // Only show pending calls (status starts with 'pending')
          if (!call.status?.startsWith('pending')) {
            console.log('[INCOMING CALL] Not pending, ignoring');
            return;
          }
          
          // Fetch caller profile - must exist and have a name
          const { data: callerProfile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url, is_online, last_active')
            .eq('id', call.caller_id)
            .single();

          if (profileError || !callerProfile || !callerProfile.full_name) {
            console.log('[INCOMING CALL] Invalid caller profile, ignoring');
            // Auto-reject invalid calls
            await supabase
              .from('video_calls')
              .update({ status: 'cancelled' })
              .eq('id', call.id);
            return;
          }

          const incomingCallData: IncomingCall = {
            id: call.id,
            caller_id: call.caller_id,
            caller_name: callerProfile.full_name,
            caller_image: callerProfile.profile_picture_url,
            price_per_second: call.price_per_second,
          };

          setIncomingCall(incomingCallData);
          console.log('[INCOMING CALL] Set incoming call state');

          // Show browser notification
          showCallNotification(incomingCallData.caller_name, () => {
            // Notification click handled
          });

          // Play ringtone
          await playGlobalRingtone();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_calls',
        },
        async (payload) => {
          const call = payload.new as any;
          
          // Filter client-side for recipient
          if (call.recipient_id !== user.id) return;
          
          console.log('[INCOMING CALL] Call status updated:', call.status);
          
          // Stop ringtone if call is cancelled, rejected, ended, or accepted
          if (call.status === 'cancelled' || call.status === 'rejected' || call.status === 'ended' || call.status === 'accepted') {
            stopGlobalRingtone();
            
            // Clear incoming call if cancelled, rejected, or ended
            if (call.status === 'cancelled' || call.status === 'rejected' || call.status === 'ended') {
              setIncomingCall(null);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[INCOMING CALLS] Subscription status:', status);
      });

    channelRef.current = channel;

    // Check for any existing pending calls on mount
    const checkPendingCalls = async () => {
      console.log('[INCOMING CALLS] Checking for pending calls...');
      const { data, error } = await supabase
        .from('video_calls')
        .select('*')
        .eq('recipient_id', user.id)
        .like('status', 'pending%') // Match 'pending' or 'pending:...'
        .neq('caller_id', user.id) // Exclude self-calls
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.log('[INCOMING CALLS] Error checking pending calls:', error);
        return;
      }

      if (data && data.length > 0) {
        const call = data[0];
        
        // Check if call is recent (within last 60 seconds) to avoid stale calls
        const callTime = new Date(call.created_at).getTime();
        const now = Date.now();
        const callAge = now - callTime;
        
        if (callAge > 60000) {
          console.log('[INCOMING CALLS] Call too old, marking as cancelled');
          // Mark stale call as cancelled
          await supabase
            .from('video_calls')
            .update({ status: 'cancelled' })
            .eq('id', call.id);
          return;
        }
        
        console.log('[INCOMING CALLS] Found pending call:', call.id);
        
        // Fetch caller profile
        const { data: callerProfile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, profile_picture_url')
          .eq('id', call.caller_id)
          .single();

        if (profileError || !callerProfile || !callerProfile.full_name) {
          console.log('[INCOMING CALLS] Invalid caller for pending call');
          return;
        }

        setIncomingCall({
          id: call.id,
          caller_id: call.caller_id,
          caller_name: callerProfile.full_name,
          caller_image: callerProfile.profile_picture_url,
          price_per_second: call.price_per_second,
        });
        
        // Play ringtone for existing pending call
        await playGlobalRingtone();
      }
    };

    checkPendingCalls();

    return () => {
      console.log('[INCOMING CALLS] Cleaning up');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      stopGlobalRingtone();
    };
  }, [user]);

  const clearIncomingCall = () => {
    setIncomingCall(null);
    stopGlobalRingtone();
  };

  return { incomingCall, clearIncomingCall };
};

// Export for use in other components
export { stopGlobalRingtone };
