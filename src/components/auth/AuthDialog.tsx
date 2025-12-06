import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const tanzanianRegions = [
  "Dar es Salaam", "Mwanza", "Arusha", "Dodoma", "Mbeya",
  "Morogoro", "Tanga", "Kilimanjaro", "Tabora", "Kigoma",
  "Mara", "Shinyanga", "Kagera", "Mtwara", "Rukwa",
  "Iringa", "Pwani", "Singida", "Geita", "Katavi",
  "Njombe", "Simiyu", "Lindi", "Ruvuma", "Songwe"
];

const AuthDialog = ({ open, onOpenChange, onSuccess }: AuthDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  
  // Login state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup state
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRegion, setSignupRegion] = useState("");
  
  // Reset password state
  const [resetPhone, setResetPhone] = useState("");

  const validatePhone = (phone: string) => {
    return /^0\d{9}$/.test(phone);
  };

  const handleLogin = async () => {
    if (!validatePhone(loginPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Phone number must be 10 digits starting with 0",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create email from phone number for Supabase auth
      const email = `${loginPhone}@callearn.app`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validatePhone(signupPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Phone number must be 10 digits starting with 0",
        variant: "destructive",
      });
      return;
    }

    if (!signupRegion) {
      toast({
        title: "Region Required",
        description: "Please select your region",
        variant: "destructive",
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create email from phone number
      const email = `${signupPhone}@callearn.app`;
      
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: signupPassword,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          phone_number: signupPhone,
          region: signupRegion,
        });

      if (profileError) throw profileError;

      toast({
        title: "Account Created",
        description: "Please complete your profile in Settings",
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!validatePhone(resetPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Phone number must be 10 digits starting with 0",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-sms', {
        body: { phone: resetPhone },
      });

      if (error) throw error;

      toast({
        title: "Password Reset Sent",
        description: "A temporary password has been sent to your phone via SMS",
      });

      setActiveTab("login");
    } catch (error: any) {
      console.error('[PASSWORD_RESET] Error:', error);
      toast({
        title: "Reset Failed",
        description: error.message || 'Failed to send temporary password',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Welcome to CallEarn</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                placeholder="0712345678"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            <Button
              onClick={handleLogin}
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>

            <Button
              variant="link"
              className="w-full"
              onClick={() => setActiveTab("reset")}
            >
              Forgot Password?
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                placeholder="0712345678"
                value={signupPhone}
                onChange={(e) => setSignupPhone(e.target.value)}
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={signupRegion} onValueChange={setSignupRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {tanzanianRegions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSignup}
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </TabsContent>

          <TabsContent value="reset" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your phone number to receive a temporary password via SMS
            </p>
            
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                placeholder="0712345678"
                value={resetPhone}
                onChange={(e) => setResetPhone(e.target.value)}
                maxLength={10}
              />
            </div>

            <Button
              onClick={handlePasswordReset}
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Temporary Password
            </Button>

            <Button
              variant="link"
              className="w-full"
              onClick={() => setActiveTab("login")}
            >
              Back to Login
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;