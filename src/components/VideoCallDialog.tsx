import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, CheckCircle2, Video, Mic, MicOff, VideoOff, Maximize, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Declare Metered SDK type
declare global {
  interface Window {
    Metered: any;
  }
}

// Global caller ringtone reference
let callerRingtone: HTMLAudioElement | null = null;

const stopCallerRingtone = () => {
  if (callerRingtone) {
    callerRingtone.pause();
    callerRingtone.currentTime = 0;
    callerRingtone = null;
    console.log('[CALLER] Ringtone stopped');
  }
};

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientProfile: any;
  isCaller: boolean;
  callId?: string;
}

const VideoCallDialog = ({
  open,
  onOpenChange,
  recipientProfile,
  isCaller,
  callId: existingCallId,
}: VideoCallDialogProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [callStatus, setCallStatus] = useState<
    "initiating" | "ringing" | "connecting" | "connected" | "confirmed" | "ended"
  >("initiating");
  const [duration, setDuration] = useState(0);
  const [callId, setCallId] = useState<string | null>(existingCallId || null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [totalCharged, setTotalCharged] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const meetingRef = useRef<any>(null);
  const chargeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const signalingChannelRef = useRef<any>(null);
  const roomInfoRef = useRef<{ roomName: string; appName: string } | null>(null);

  useEffect(() => {
    if (open) {
      console.log('[VIDEO CALL] Dialog opened, isCaller:', isCaller, 'existingCallId:', existingCallId);
      if (isCaller) {
        initiateCall();
      } else if (existingCallId) {
        setCallId(existingCallId);
        acceptCall();
      }
    }
    return () => {
      cleanup();
      stopCallerRingtone();
    };
  }, [open]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getMeteredSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('api_settings')
        .select('metered_app_name, metered_secret_key')
        .single();
      
      if (error) {
        console.error('[METERED] Error fetching settings:', error);
        return null;
      }
      
      console.log('[METERED] Settings fetched:', data?.metered_app_name ? 'configured' : 'not configured');
      return data;
    } catch (error) {
      console.error('[METERED] Error fetching settings:', error);
      return null;
    }
  };

  const extractAppName = (appNameOrUrl: string): string => {
    // Handle cases like "tuonane.metered.live" or just "tuonane"
    if (appNameOrUrl.includes('.metered.live')) {
      return appNameOrUrl.replace('.metered.live', '');
    }
    return appNameOrUrl;
  };

  const createMeteredRoom = async (appName: string, secretKey: string, roomName: string) => {
    try {
      const cleanAppName = extractAppName(appName);
      console.log('[METERED] Creating room with app:', cleanAppName, 'room:', roomName);
      
      const response = await fetch(`https://${cleanAppName}.metered.live/api/v1/room?secretKey=${secretKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[METERED] Room creation failed:', response.status, errorText);
        throw new Error(`Failed to create room: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[METERED] Room created successfully:', data);
      return data;
    } catch (error) {
      console.error('[METERED] Error creating room:', error);
      throw error;
    }
  };

  const joinMeteredRoom = async (appName: string, roomName: string, userName: string) => {
    try {
      if (!window.Metered) {
        console.error('[METERED] SDK not loaded');
        throw new Error('Metered SDK not loaded. Please refresh the page and try again.');
      }

      const cleanAppName = extractAppName(appName);
      const meeting = new window.Metered.Meeting();
      meetingRef.current = meeting;

      console.log('[METERED] Joining room:', `${cleanAppName}.metered.live/${roomName}`);

      // Handle local track started (own video)
      meeting.on("localTrackStarted", (item: any) => {
        console.log('[METERED] localTrackStarted:', item.type);
        if (item.type === "video" && localVideoRef.current) {
          const track = item.track;
          const mediaStream = new MediaStream([track]);
          localVideoRef.current.srcObject = mediaStream;
          localVideoRef.current.play().catch(console.error);
        }
      });

      // Handle remote track started (other person's video)
      meeting.on("remoteTrackStarted", (item: any) => {
        console.log('[METERED] remoteTrackStarted:', item.type, 'from participant:', item.participantSessionId);
        if (item.type === "video" && remoteVideoRef.current) {
          const track = item.track;
          const mediaStream = new MediaStream([track]);
          remoteVideoRef.current.srcObject = mediaStream;
          remoteVideoRef.current.play().catch(console.error);
        }
        if (item.type === "audio") {
          const track = item.track;
          const audioEl = document.createElement("audio");
          audioEl.srcObject = new MediaStream([track]);
          audioEl.autoplay = true;
          audioEl.id = `audio-${item.streamId}`;
          document.body.appendChild(audioEl);
          console.log('[METERED] Audio element created for stream:', item.streamId);
        }
      });

      // Handle remote track stopped
      meeting.on("remoteTrackStopped", (item: any) => {
        console.log('[METERED] remoteTrackStopped:', item.streamId);
        const audioEl = document.getElementById(`audio-${item.streamId}`);
        if (audioEl) audioEl.remove();
      });

      // Handle participant joined
      meeting.on("participantJoined", (participant: any) => {
        console.log('[METERED] Participant joined:', participant.name);
      });

      // Handle participant left
      meeting.on("participantLeft", (participant: any) => {
        console.log('[METERED] participantLeft:', participant);
        // End call when other participant leaves
        endCall();
      });

      // Join the room - roomURL format: appname.metered.live/roomname
      const roomURL = `${cleanAppName}.metered.live/${roomName}`;
      
      const meetingInfo = await meeting.join({
        roomURL,
        name: userName,
      });
      console.log('[METERED] Joined meeting successfully:', meetingInfo);

      // Start video with 360p quality
      try {
        await meeting.startVideo({
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 24 },
        });
        console.log('[METERED] Video started');
      } catch (videoErr) {
        console.error('[METERED] Error starting video:', videoErr);
      }

      // Start audio
      try {
        await meeting.startAudio();
        console.log('[METERED] Audio started');
      } catch (audioErr) {
        console.error('[METERED] Error starting audio:', audioErr);
      }

      return meeting;
    } catch (error) {
      console.error('[METERED] Error joining room:', error);
      throw error;
    }
  };

  const initiateCall = async () => {
    try {
      if (!user) {
        toast({
          title: "Sign In Required",
          description: "Please sign in to make video calls",
          variant: "destructive",
        });
        onOpenChange(false);
        return;
      }

      // Check caller balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("account_balance")
        .eq("user_id", user.id)
        .single();

      if (!wallet || wallet.account_balance < 10) {
        toast({
          title: "Insufficient Balance",
          description: "Please top up your account to make calls",
          variant: "destructive",
        });
        onOpenChange(false);
        return;
      }

      // Get Metered settings
      const meteredSettings = await getMeteredSettings();
      if (!meteredSettings?.metered_app_name || !meteredSettings?.metered_secret_key) {
        toast({
          title: "Service Unavailable",
          description: "Video call service is currently unavailable. Please try again later.",
          variant: "destructive",
        });
        onOpenChange(false);
        return;
      }

      const cleanAppName = extractAppName(meteredSettings.metered_app_name);
      
      // Create call record first
      const roomName = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { data: call, error } = await supabase
        .from("video_calls")
        .insert({
          caller_id: user.id,
          recipient_id: recipientProfile.id,
          price_per_second: recipientProfile.custom_price_per_second || 1.5,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      setCallId(call.id);
      setCallStatus("ringing");
      console.log('[CALLER] Call record created:', call.id);

      // Create Metered room
      try {
        await createMeteredRoom(cleanAppName, meteredSettings.metered_secret_key, roomName);
      } catch (roomError) {
        console.error('[CALLER] Failed to create room:', roomError);
        // Update call status to cancelled
        await supabase
          .from("video_calls")
          .update({ status: "cancelled" })
          .eq("id", call.id);
        throw roomError;
      }

      // Store room info for later use
      roomInfoRef.current = { roomName, appName: cleanAppName };

      // Update call record with room info for recipient to join
      // Format: pending:roomName:appName
      await supabase
        .from("video_calls")
        .update({ status: `pending:${roomName}:${cleanAppName}` })
        .eq("id", call.id);

      console.log('[CALLER] Room info stored in call record');

      // Play caller ringtone
      try {
        stopCallerRingtone();
        callerRingtone = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        callerRingtone.loop = true;
        callerRingtone.volume = 0.3;
        await callerRingtone.play();
        console.log('[CALLER] Ringtone playing');
      } catch (e) {
        console.log('[CALLER] Could not play ringtone:', e);
      }

      // Set up signaling channel to listen for acceptance
      const channel = supabase
        .channel(`call-${call.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "video_calls",
            filter: `id=eq.${call.id}`,
          },
          async (payload) => {
            console.log("[CALLER] Status update:", payload.new.status);
            const newStatus = payload.new.status;
            
            if (newStatus === "accepted") {
              stopCallerRingtone();
              setCallStatus("connecting");
              
              // Join the Metered room
              try {
                if (roomInfoRef.current) {
                  await joinMeteredRoom(
                    roomInfoRef.current.appName,
                    roomInfoRef.current.roomName,
                    profile?.full_name || "Caller"
                  );
                  setCallStatus("connected");
                }
              } catch (err) {
                console.error('[CALLER] Failed to join room:', err);
                toast({
                  title: "Connection Error",
                  description: "Failed to connect to video call. Please try again.",
                  variant: "destructive",
                });
                endCall();
              }
            } else if (newStatus === "rejected" || newStatus === "ended" || newStatus === "cancelled") {
              stopCallerRingtone();
              if (newStatus === "rejected") {
                toast({
                  title: "Call Declined",
                  description: `${recipientProfile.full_name || recipientProfile.username} declined your call`,
                });
              }
              endCall();
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[CALLER] Channel subscribed');
            signalingChannelRef.current = channel;
          }
        });

    } catch (error) {
      console.error("[CALL] Error initiating:", error);
      stopCallerRingtone();
      toast({
        title: "Call Failed",
        description: "Could not start the call. Please try again.",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  };

  const acceptCall = async () => {
    try {
      console.log("[RECIPIENT] Accepting call, callId:", existingCallId);
      setCallStatus("connecting");

      // Get the call details with room info
      const { data: callData, error: callError } = await supabase
        .from("video_calls")
        .select("status, caller_id")
        .eq("id", existingCallId)
        .single();

      if (callError || !callData) {
        console.error('[RECIPIENT] Call not found:', callError);
        throw new Error("Call not found");
      }

      console.log('[RECIPIENT] Call data:', callData);

      // Parse room info from status (format: "pending:roomName:appName")
      const statusParts = callData.status?.split(':') || [];
      if (statusParts.length < 3 || statusParts[0] !== 'pending') {
        console.error('[RECIPIENT] Invalid status format:', callData.status);
        throw new Error("Call is no longer available");
      }

      const roomName = statusParts[1];
      const appName = statusParts[2];

      console.log('[RECIPIENT] Room info parsed:', { roomName, appName });

      // Update call status to accepted FIRST
      const { error: updateError } = await supabase
        .from("video_calls")
        .update({
          status: "accepted",
          start_time: new Date().toISOString(),
        })
        .eq("id", existingCallId);

      if (updateError) {
        console.error('[RECIPIENT] Failed to update call status:', updateError);
        throw updateError;
      }

      console.log('[RECIPIENT] Call status updated to accepted');

      // Subscribe to call updates
      const channel = supabase
        .channel(`call-${existingCallId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "video_calls",
            filter: `id=eq.${existingCallId}`,
          },
          (payload) => {
            console.log("[RECIPIENT] Call status update:", payload.new.status);
            if (payload.new.status === "cancelled" || payload.new.status === "ended") {
              endCall();
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log("[RECIPIENT] Channel subscribed");
            signalingChannelRef.current = channel;
          }
        });

      // Join the Metered room
      await joinMeteredRoom(
        appName,
        roomName,
        profile?.full_name || "Recipient"
      );
      setCallStatus("connected");
      console.log('[RECIPIENT] Successfully joined call');

    } catch (error) {
      console.error("[CALL] Error accepting:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not join the call",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  };

  const confirmCall = () => {
    setIsConfirmed(true);
    setCallStatus("confirmed");
    setTotalCharged(0);
    startCharging();
  };

  const startCharging = () => {
    // Start duration counter from 0
    setDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // Start charging every second
    chargeIntervalRef.current = setInterval(async () => {
      try {
        const pricePerSecond = recipientProfile.custom_price_per_second || 1.5;

        // Deduct from caller's wallet
        const { data: callerWallet } = await supabase
          .from("wallets")
          .select("account_balance")
          .eq("user_id", user?.id)
          .single();

        if (!callerWallet || callerWallet.account_balance < pricePerSecond) {
          toast({
            title: "Insufficient Balance",
            description: "Call ending due to low balance",
          });
          endCall();
          return;
        }

        await supabase
          .from("wallets")
          .update({
            account_balance: callerWallet.account_balance - pricePerSecond,
          })
          .eq("user_id", user?.id);

        // Add to recipient's earning
        const { data: recipientWallet } = await supabase
          .from("wallets")
          .select("active_earning")
          .eq("user_id", recipientProfile.id)
          .single();

        if (recipientWallet) {
          await supabase
            .from("wallets")
            .update({
              active_earning: (recipientWallet.active_earning || 0) + pricePerSecond,
            })
            .eq("user_id", recipientProfile.id);
        }

        // Update total charged state
        setTotalCharged((prev) => prev + pricePerSecond);

        // Update call with charges
        const currentCallId = callId || existingCallId;
        if (currentCallId) {
          await supabase
            .from("video_calls")
            .update({
              duration_seconds: duration + 1,
              total_charged: totalCharged + pricePerSecond,
            })
            .eq("id", currentCallId);
        }
      } catch (error) {
        console.error("Error charging:", error);
      }
    }, 1000);
  };

  const endCall = async () => {
    console.log('[CALL] Ending call, status:', callStatus, 'isConfirmed:', isConfirmed);
    
    stopCallerRingtone();
    
    const currentCallId = callId || existingCallId;

    if (currentCallId) {
      const pricePerSecond = recipientProfile.custom_price_per_second || 1.5;
      const finalTotalCharged = duration * pricePerSecond;

      if (isConfirmed && duration > 0) {
        await supabase
          .from("video_calls")
          .update({
            status: "ended",
            end_time: new Date().toISOString(),
            duration_seconds: duration,
            total_charged: finalTotalCharged,
          })
          .eq("id", currentCallId);

        // Add to earning history
        if (isCaller) {
          await supabase.from("earning_history").insert({
            user_id: recipientProfile.id,
            call_id: currentCallId,
            amount: finalTotalCharged,
            duration_minutes: Math.ceil(duration / 60),
            caller_name: profile?.full_name || "Unknown",
          });
        }
      } else {
        const newStatus = callStatus === "ringing" ? "cancelled" : "ended";
        await supabase
          .from("video_calls")
          .update({
            status: newStatus,
            end_time: new Date().toISOString(),
          })
          .eq("id", currentCallId);
      }
    }

    cleanup();
    setCallStatus("ended");
    onOpenChange(false);
  };

  const cleanup = () => {
    console.log('[CLEANUP] Starting cleanup');
    
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // Leave Metered meeting
    if (meetingRef.current) {
      try {
        meetingRef.current.leaveMeeting();
        console.log('[METERED] Left meeting');
      } catch (e) {
        console.error('[METERED] Error leaving meeting:', e);
      }
      meetingRef.current = null;
    }

    // Remove any audio elements
    document.querySelectorAll('audio[id^="audio-"]').forEach(el => el.remove());
    
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }

    roomInfoRef.current = null;
  };

  const toggleMute = () => {
    if (meetingRef.current) {
      if (isMuted) {
        meetingRef.current.startAudio();
      } else {
        meetingRef.current.stopAudio();
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (meetingRef.current) {
      if (isVideoOff) {
        meetingRef.current.startVideo({
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 24 },
        });
      } else {
        meetingRef.current.stopVideo();
      }
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    const videoContainer = document.getElementById('video-call-container');
    if (!videoContainer) return;

    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch(err => {
        console.error('[VIDEO CALL] Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const pricePerSecond = recipientProfile?.custom_price_per_second || 1.5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`p-0 ${isFullscreen ? 'max-w-full w-full h-full' : 'max-w-3xl'}`}>
        <div id="video-call-container" className={`relative ${isFullscreen ? 'h-screen w-screen bg-black' : ''}`}>
          <DialogHeader className="p-4 pb-0 absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/70 to-transparent">
            <DialogTitle className="flex items-center justify-between text-white">
              <span>
                {isCaller ? "Calling" : "Call with"} @{recipientProfile?.username}
              </span>
              {isConfirmed && (
                <span className="text-primary font-mono">
                  {formatDuration(duration)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className={`${isFullscreen ? 'h-full' : 'space-y-4 p-6 pt-14'}`}>
            {/* Video Streams */}
            <div className={`relative bg-muted overflow-hidden ${isFullscreen ? 'h-full w-full' : 'aspect-video rounded-lg'}`}>
              {/* Remote video - full screen */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Local video preview - bottom LEFT corner */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`absolute bottom-20 left-4 rounded-lg border-2 border-primary object-cover z-10 ${isFullscreen ? 'w-40 h-32' : 'w-32 h-24'}`}
              />

              {/* Fullscreen Button */}
              <Button
                onClick={toggleFullscreen}
                size="icon"
                variant="secondary"
                className="absolute top-16 left-4 bg-black/50 hover:bg-black/70 z-20"
              >
                <Maximize className="h-5 w-5 text-white" />
              </Button>

              {/* Green Tick Confirmation Button */}
              {isCaller && callStatus === "connected" && !isConfirmed && (
                <div className="absolute top-16 right-4 z-20">
                  <Button
                    onClick={confirmCall}
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 rounded-full h-16 w-16"
                  >
                    <CheckCircle2 className="h-8 w-8" />
                  </Button>
                  <p className="text-xs text-white mt-2 text-center bg-black/50 px-2 py-1 rounded">
                    Confirm Real User
                  </p>
                </div>
              )}

              {/* Status Overlay */}
              {(callStatus === "ringing" || callStatus === "connecting" || callStatus === "initiating") && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-center">
                    {callStatus === "connecting" ? (
                      <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
                    ) : (
                      <Video className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
                    )}
                    <p className="text-white text-lg">
                      {callStatus === "connecting" ? "Connecting..." : 
                       callStatus === "initiating" ? "Starting..." :
                       (isCaller ? "Ringing..." : "Incoming call...")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Call Controls */}
            <div className={`flex justify-center gap-4 ${isFullscreen ? 'absolute bottom-4 left-0 right-0' : ''}`}>
              {callStatus === "connected" || callStatus === "confirmed" ? (
                <>
                  <Button
                    onClick={toggleMute}
                    size="icon"
                    variant={isMuted ? "destructive" : "secondary"}
                    className="h-12 w-12"
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  <Button
                    onClick={toggleVideo}
                    size="icon"
                    variant={isVideoOff ? "destructive" : "secondary"}
                    className="h-12 w-12"
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </Button>
                </>
              ) : null}
              <Button
                onClick={endCall}
                size="lg"
                variant="destructive"
                className="h-12"
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                End Call
              </Button>
            </div>

            {/* Charging Info */}
            {isConfirmed && (
              <div className={`text-center text-sm ${isFullscreen ? 'absolute bottom-20 left-0 right-0 text-white' : 'text-muted-foreground'}`}>
                Charging: Tsh {pricePerSecond}/sec | Total: Tsh {(duration * pricePerSecond).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallDialog;
