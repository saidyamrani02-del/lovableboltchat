import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, ArrowDownToLine } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/auth/AuthDialog";
import { useNavigate } from "react-router-dom";
import TopupDialog from "@/components/TopupDialog";
import WithdrawDialog from "@/components/WithdrawDialog";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchWallet();
      
      // Subscribe to real-time wallet updates
      const channel = supabase
        .channel(`wallet-updates-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'wallets',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[DASHBOARD] Wallet updated:', payload.new);
            setWallet(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchWallet = async () => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setWallet(data);
    } catch (error) {
      console.error("Error fetching wallet:", error);
    }
  };

  if (!user) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Dashboard</h2>
        
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">
              Please sign in to access your dashboard
            </p>
            <Button onClick={() => setShowAuthDialog(true)}>
              Sign In / Register
            </Button>
          </CardContent>
        </Card>

        <AuthDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          onSuccess={() => setShowAuthDialog(false)}
        />
      </div>
    );
  }

  if (!profile?.is_kyc_completed) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Dashboard</h2>
        
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-sm">
              Complete your profile in Settings to unlock all dashboard features
            </p>
            <Button onClick={() => navigate("/settings")}>
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Dashboard</h2>
      
      {/* Balance Cards */}
      <div className="grid gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Account Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Tsh {Number(wallet?.account_balance || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Active Earning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Tsh {Number(wallet?.active_earning || 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Min. withdrawal: Tsh 5,000
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-blue-500" />
              Total Withdrawn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Tsh {Number(wallet?.total_withdrawn || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => setShowTopupDialog(true)}>Topup</Button>
        <Button 
          variant="outline" 
          onClick={() => setShowWithdrawDialog(true)}
          disabled={!wallet || wallet.active_earning < 5000}
        >
          Withdraw
        </Button>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            variant="link" 
            onClick={() => navigate('/transactions')}
            className="w-full"
          >
            View Transaction History
          </Button>
        </CardContent>
      </Card>

      <TopupDialog 
        open={showTopupDialog}
        onOpenChange={setShowTopupDialog}
        onSuccess={fetchWallet}
      />

      <WithdrawDialog
        open={showWithdrawDialog}
        onOpenChange={setShowWithdrawDialog}
        activeEarning={wallet?.active_earning || 0}
        onSuccess={fetchWallet}
      />
    </div>
  );
};

export default Dashboard;
