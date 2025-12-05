import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  callerImage?: string;
  callId?: string;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallDialog = ({
  open,
  callerName,
  callerImage,
  callId,
  onAccept,
  onReject,
}: IncomingCallDialogProps) => {
  
  const handleReject = async () => {
    if (callId) {
      await supabase
        .from("video_calls")
        .update({ status: "rejected" })
        .eq("id", callId);
    }
    onReject();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <div className="flex flex-col items-center gap-6 py-6">
          {/* Pulsing Avatar */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <Avatar className="h-24 w-24 border-4 border-primary relative z-10">
              <AvatarImage src={callerImage} alt={callerName} />
              <AvatarFallback className="text-2xl bg-primary/10">
                {callerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Caller Info */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{callerName}</h2>
            <p className="text-muted-foreground animate-pulse">Incoming video call...</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 w-full max-w-xs">
            <Button
              variant="destructive"
              size="lg"
              className="flex-1 gap-2"
              onClick={handleReject}
            >
              <PhoneOff className="h-5 w-5" />
              Decline
            </Button>
            <Button
              size="lg"
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              onClick={onAccept}
            >
              <Phone className="h-5 w-5" />
              Accept
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallDialog;
