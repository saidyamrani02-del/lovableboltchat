import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/SettingsPage";
import TransactionHistory from "./pages/TransactionHistory";
import NotFound from "./pages/NotFound";
import IncomingCallDialog from "./components/IncomingCallDialog";
import VideoCallDialog from "./components/VideoCallDialog";

const queryClient = new QueryClient();

const OnlineStatusWrapper = ({ children }: { children: React.ReactNode }) => {
  useOnlineStatus();
  return <>{children}</>;
};

const IncomingCallHandler = () => {
  const { incomingCall, clearIncomingCall } = useIncomingCalls();
  const { toast } = useToast();
  const [acceptedCall, setAcceptedCall] = useState<{
    id: string;
    caller_id: string;
    caller_name: string;
    caller_image?: string;
    price_per_second: number;
  } | null>(null);
  const [showVideoDialog, setShowVideoDialog] = useState(false);

  const handleAccept = async () => {
    if (!incomingCall) return;

    try {
      console.log('[ACCEPT] Accepting call:', incomingCall.id);
      
      // Store the call data before clearing
      setAcceptedCall({
        id: incomingCall.id,
        caller_id: incomingCall.caller_id,
        caller_name: incomingCall.caller_name,
        caller_image: incomingCall.caller_image,
        price_per_second: incomingCall.price_per_second,
      });
      
      // Show the video dialog
      setShowVideoDialog(true);
      
      // Clear the incoming call dialog
      clearIncomingCall();
      
      console.log('[ACCEPT] Video dialog should now show');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!incomingCall) return;

    try {
      await supabase
        .from('video_calls')
        .update({ status: 'rejected' })
        .eq('id', incomingCall.id);

      toast({
        title: "Call Declined",
        description: "You declined the call",
      });
    } catch (error: any) {
      console.error("Error rejecting call:", error);
    }
    clearIncomingCall();
  };

  const handleVideoDialogClose = (open: boolean) => {
    if (!open) {
      setShowVideoDialog(false);
      setAcceptedCall(null);
    }
  };

  return (
    <>
      <IncomingCallDialog
        open={!!incomingCall}
        callerName={incomingCall?.caller_name || ''}
        callerImage={incomingCall?.caller_image}
        callId={incomingCall?.id}
        onAccept={handleAccept}
        onReject={handleReject}
      />
      {acceptedCall && showVideoDialog && (
        <VideoCallDialog
          open={showVideoDialog}
          onOpenChange={handleVideoDialogClose}
          recipientProfile={{
            id: acceptedCall.caller_id,
            username: acceptedCall.caller_name,
            full_name: acceptedCall.caller_name,
            profile_picture_url: acceptedCall.caller_image,
            custom_price_per_second: acceptedCall.price_per_second,
          }}
          isCaller={false}
          callId={acceptedCall.id}
        />
      )}
    </>
  );
};

const App = () => {
  useEffect(() => {
    // Close slide menu when clicking on overlay (outside menu)
    const handleClickOutside = (e: MouseEvent) => {
      const overlay = document.getElementById('menu-overlay');
      
      // Only close if clicking directly on the overlay
      if (e.target === overlay) {
        const slideMenu = document.getElementById('slide-menu');
        slideMenu?.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0', 'pointer-events-none');
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnlineStatusWrapper>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <IncomingCallHandler />
            <BrowserRouter>
              <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/transactions" element={<TransactionHistory />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
              </Layout>
            </BrowserRouter>
          </TooltipProvider>
        </OnlineStatusWrapper>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
