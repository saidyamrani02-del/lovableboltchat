import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TopupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TopupDialog = ({ open, onOpenChange, onSuccess }: TopupDialogProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Hardcode user's phone number from profile
  useEffect(() => {
    if (profile?.phone_number && open) {
      setPhone(profile.phone_number);
    }
  }, [profile, open]);

  const handleTopup = async () => {
    if (!phone || !amount) {
      toast({
        title: "Missing Information",
        description: "Please enter phone number and amount",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1000) {
      toast({
        title: "Invalid Amount",
        description: "Minimum topup amount is Tsh 1,000",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zenopay-topup', {
        body: { phone, amount: amountNum },
      });

      if (error) throw error;

      if (data.success) {
        setOrderId(data.order_id);
        toast({
          title: "Payment Request Sent",
          description: data.message,
        });
        
        // Start polling for status
        startPolling(data.order_id);
      } else {
        throw new Error(data.error || 'Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('[TOPUP] Error:', error);
      toast({
        title: "Topup Failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const startPolling = async (order_id: string) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 8;
    const delays = [2000, 5000, 5000, 10000, 10000, 30000, 30000, 30000]; // Exponential backoff

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setLoading(false);
        setPolling(false);
        toast({
          title: "Payment Pending",
          description: "Payment is still processing. Please check your transaction history.",
        });
        onOpenChange(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('zenopay-check-status', {
          body: { order_id },
        });

        if (error) throw error;

        console.log('[TOPUP] Status:', data);

        if (data.payment_status === 'COMPLETED') {
          setLoading(false);
          setPolling(false);
          toast({
            title: "Topup Successful",
            description: `Your account has been credited with Tsh ${data.amount}`,
          });
          onSuccess();
          onOpenChange(false);
          setPhone("");
          setAmount("");
          setOrderId(null);
        } else if (data.payment_status === 'FAILED') {
          setLoading(false);
          setPolling(false);
          toast({
            title: "Payment Failed",
            description: "The payment was not successful. Please try again.",
            variant: "destructive",
          });
          setOrderId(null);
        } else {
          // Still pending, continue polling
          attempts++;
          setTimeout(poll, delays[attempts - 1] || 30000);
        }
      } catch (error: any) {
        console.error('[TOPUP] Status check error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, delays[attempts - 1] || 30000);
        } else {
          setLoading(false);
          setPolling(false);
        }
      }
    };

    setTimeout(poll, delays[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Topup Account</DialogTitle>
          <DialogDescription>
            Add money to your account via mobile money
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              placeholder="0712360077"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={10}
              disabled={loading}
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              Enter your mobile money number (10 digits)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Amount (Tsh)</Label>
            <Input
              type="number"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1000"
              step="100"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Minimum: Tsh 1,000
            </p>
          </div>

          {polling && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Waiting for payment confirmation...
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                Please complete the payment on your phone
              </p>
            </div>
          )}

          <Button
            onClick={handleTopup}
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {polling ? 'Processing Payment...' : 'Send Payment Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopupDialog;
