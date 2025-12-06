import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SubscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const PACKAGES = {
  SILVER: { price: 9000, features: ['Basic features', 'Standard support'] },
  GOLD: { price: 25000, features: ['All Silver features', 'Priority support', 'Advanced analytics'] },
  DIAMOND: { price: 50000, features: ['All Gold features', 'Custom pricing', 'Premium badge'] },
  PLATINUM: { price: 100000, features: ['All Diamond features', 'Unlimited calls', 'VIP status'] },
};

const SubscribeDialog = ({ open, onOpenChange, onSuccess }: SubscribeDialogProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [phone, setPhone] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<keyof typeof PACKAGES>("SILVER");
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Hardcode user's phone number from profile
  useEffect(() => {
    if (profile?.phone_number && open) {
      setPhone(profile.phone_number);
    }
  }, [profile, open]);

  const handleSubscribe = async () => {
    if (!phone || !selectedPackage) {
      toast({
        title: "Missing Information",
        description: "Please select package and enter phone number",
        variant: "destructive",
      });
      return;
    }

    // Prevent duplicate submissions
    if (loading || polling) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zenopay-subscribe', {
        body: { phone, package: selectedPackage },
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
      console.error('[SUBSCRIBE] Error:', error);
      toast({
        title: "Subscription Failed",
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
    const delays = [2000, 5000, 5000, 10000, 10000, 30000, 30000, 30000];

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setLoading(false);
        setPolling(false);
        toast({
          title: "Payment Pending",
          description: "Payment is still processing. Please check your subscription status.",
        });
        onOpenChange(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('zenopay-check-subscription', {
          body: { order_id },
        });

        if (error) throw error;

        console.log('[SUBSCRIBE] Status:', data);

        if (data.payment_status === 'COMPLETED') {
          setLoading(false);
          setPolling(false);
          toast({
            title: "Subscription Successful",
            description: `You are now subscribed to ${data.package} package!`,
          });
          onSuccess();
          onOpenChange(false);
          setPhone("");
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
        console.error('[SUBSCRIBE] Status check error:', error);
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subscribe to a Package</DialogTitle>
          <DialogDescription>
            Choose a subscription package to unlock premium features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Package Selection */}
          <div className="space-y-2">
            <Label>Select Package</Label>
            <RadioGroup value={selectedPackage} onValueChange={(value) => setSelectedPackage(value as keyof typeof PACKAGES)}>
              {Object.entries(PACKAGES).map(([key, pkg]) => (
                <div key={key} className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={key} id={key} />
                  <div className="flex-1">
                    <label htmlFor={key} className="font-medium cursor-pointer flex items-center gap-2">
                      {key}
                      <span className="text-primary text-sm">Tsh {pkg.price.toLocaleString()}/month</span>
                    </label>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      {pkg.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Phone Number */}
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

          {/* Total */}
          <div className="bg-primary/10 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Amount:</span>
              <span className="text-xl font-bold text-primary">
                Tsh {PACKAGES[selectedPackage].price.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valid for 30 days</p>
          </div>

          <Button
            onClick={handleSubscribe}
            disabled={loading || polling}
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

export default SubscribeDialog;
