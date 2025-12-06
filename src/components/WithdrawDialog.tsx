import { useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeEarning: number;
  onSuccess: () => void;
}

const WithdrawDialog = ({ open, onOpenChange, activeEarning, onSuccess }: WithdrawDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const FEE_PERCENTAGE = 0.30; // 30% fee
  const MIN_WITHDRAWAL = 5000;

  const calculateFee = (amt: number) => amt * FEE_PERCENTAGE;
  const calculateNetAmount = (amt: number) => amt - calculateFee(amt);

  const handleWithdraw = async () => {
    if (!phone || !amount) {
      toast({
        title: "Missing Information",
        description: "Please enter phone number and amount",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < MIN_WITHDRAWAL) {
      toast({
        title: "Invalid Amount",
        description: `Minimum withdrawal amount is Tsh ${MIN_WITHDRAWAL.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    if (amountNum > activeEarning) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough active earning to withdraw",
        variant: "destructive",
      });
      return;
    }

    const fee = calculateFee(amountNum);
    const netAmount = calculateNetAmount(amountNum);

    setLoading(true);
    try {
      // Get current wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('active_earning, total_withdrawn')
        .eq('user_id', user?.id)
        .single();

      if (!wallet) throw new Error('Wallet not found');

      // Update wallet
      await supabase
        .from('wallets')
        .update({
          active_earning: wallet.active_earning - amountNum,
          total_withdrawn: wallet.total_withdrawn + netAmount,
        })
        .eq('user_id', user?.id);

      // Record withdrawal
      await supabase
        .from('withdraw_history')
        .insert({
          user_id: user?.id,
          amount: amountNum,
          fee: fee,
          net_amount: netAmount,
          phone_number: phone,
          status: 'pending',
        });

      toast({
        title: "Withdrawal Requested",
        description: `Tsh ${netAmount.toLocaleString()} will be sent to ${phone} (after ${FEE_PERCENTAGE * 100}% fee)`,
      });

      onSuccess();
      onOpenChange(false);
      setPhone("");
      setAmount("");
    } catch (error: any) {
      console.error('[WITHDRAW] Error:', error);
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const fee = calculateFee(amountNum);
  const netAmount = calculateNetAmount(amountNum);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw Earnings</DialogTitle>
          <DialogDescription>
            Withdraw your active earnings to mobile money
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-2xl font-bold text-foreground">
              Tsh {activeEarning.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              placeholder="0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={10}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Enter your mobile money number (10 digits)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Withdrawal Amount (Tsh)</Label>
            <Input
              type="number"
              placeholder="5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={MIN_WITHDRAWAL}
              step="100"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Minimum: Tsh {MIN_WITHDRAWAL.toLocaleString()}
            </p>
          </div>

          {amountNum >= MIN_WITHDRAWAL && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Withdrawal Amount:</span>
                <span className="font-semibold">Tsh {amountNum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                <span>Fee (30%):</span>
                <span className="font-semibold">-Tsh {fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-blue-200 dark:border-blue-800 pt-1 mt-1">
                <span>You'll Receive:</span>
                <span className="text-green-600 dark:text-green-400">Tsh {netAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleWithdraw}
            disabled={loading || amountNum < MIN_WITHDRAWAL}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Request Withdrawal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawDialog;
