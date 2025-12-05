import { useState, useEffect } from "react";
import SubscribeDialog from "@/components/SubscribeDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogIn, Upload, Loader2, Crown, Shield, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AuthDialog from "@/components/auth/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { checkPermissions, requestPermissions, PermissionStatus } from "@/utils/permissions";
import { savePermissions, getStoredPermissions } from "@/utils/permissionsStorage";

const SettingsPage = () => {
  const { user, profile, signOut, refreshProfile, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // KYC form state
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [description, setDescription] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  
  // Settings state
  const [newPassword, setNewPassword] = useState("");
  const [videoCallEnabled, setVideoCallEnabled] = useState(false);
  const [customPrice, setCustomPrice] = useState("1.5");
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  
  // Subscription state
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  
  // Admin state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");
  
  // API Settings state
  const [zenopayApiKey, setZenopayApiKey] = useState("");
  const [nextsmsSenderId, setNextsmsSenderId] = useState("");
  const [nextsmsUsername, setNextsmsUsername] = useState("");
  const [nextsmsPassword, setNextsmsPassword] = useState("");
  const [meteredAppName, setMeteredAppName] = useState("");
  const [meteredSecretKey, setMeteredSecretKey] = useState("");

  useEffect(() => {
    if (profile) {
      setVideoCallEnabled(profile.video_call_enabled);
      setCustomPrice(profile.custom_price_per_second?.toString() || "1.5");
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchCurrentSubscription();
    }
  }, [user]);

  const fetchCurrentSubscription = async () => {
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers();
      fetchApiSettings();
    }
  }, [isAdmin]);

  const fetchApiSettings = async () => {
    try {
      const { data } = await supabase
        .from('api_settings')
        .select('*')
        .single();
      
      if (data) {
        setZenopayApiKey(data.zenopay_api_key || '');
        setNextsmsSenderId(data.nextsms_sender_id || '');
        setNextsmsUsername(data.nextsms_username || '');
        setNextsmsPassword(data.nextsms_password || '');
        setMeteredAppName((data as any).metered_app_name || '');
        setMeteredSecretKey((data as any).metered_secret_key || '');
      }
    } catch (error) {
      console.error('Error fetching API settings:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, phone_number, region, created_at, is_kyc_completed, is_blocked, force_online")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: wallets, error: walletsError } = await supabase
        .from("wallets")
        .select("user_id, account_balance, active_earning, total_withdrawn");

      if (walletsError) throw walletsError;

      const usersWithWallets = profiles?.map(profile => {
        const wallet = wallets?.find(w => w.user_id === profile.id);
        return {
          ...profile,
          account_balance: wallet?.account_balance || 0,
          active_earning: wallet?.active_earning || 0,
          total_withdrawn: wallet?.total_withdrawn || 0,
        };
      }) || [];

      console.debug("[ADMIN] Users fetched:", { profilesCount: profiles?.length || 0, walletsCount: wallets?.length || 0 });
      setAllUsers(usersWithWallets);
    } catch (error: any) {
      console.error("Error fetching users:", error);
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_blocked: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: currentStatus ? "User Unblocked" : "User Blocked",
        description: currentStatus ? "User can now access the platform" : "User has been blocked from the platform",
      });
      await fetchAllUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleForceOnline = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ force_online: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Force Online Disabled" : "Force Online Enabled",
        description: currentStatus ? "User will show normal online status" : "User will always appear online",
      });
      await fetchAllUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${userName || "this user"}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "User Deleted",
        description: "User has been permanently removed from the platform",
      });
      await fetchAllUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const validateDescription = (text: string) => {
    // Check for phone numbers (4+ consecutive digits)
    if (/\d{4,}/.test(text)) {
      return "Description cannot contain phone numbers";
    }
    // Check for links
    if (/https?:\/\/|www\./i.test(text)) {
      return "Description cannot contain links";
    }
    return null;
  };

  const handleKYCSubmit = async () => {
    // Validate description
    const descError = validateDescription(description);
    if (descError) {
      toast({
        title: "Invalid Description",
        description: descError,
        variant: "destructive",
      });
      return;
    }

    if (!profilePicture || !dateOfBirth || !gender || !fullName || !username) {
      toast({
        title: "Incomplete Form",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    // Video calls must be enabled (with permissions)
    if (!videoCallEnabled) {
      toast({
        title: "Video Calls Required",
        description: "Please enable video calls to complete your profile. This requires camera, microphone, and notification permissions.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log('[KYC] Starting KYC submission...');
    
    try {
      // Upload profile picture
      console.log('[KYC] Uploading profile picture...');
      const fileExt = profilePicture.name.split('.').pop();
      const filePath = `${user?.id}/profile.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, profilePicture, { upsert: true });

      if (uploadError) {
        console.error('[KYC] Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('[KYC] Upload successful:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(filePath);

      console.log('[KYC] Public URL:', publicUrl);

      // Update profile
      console.log('[KYC] Updating profile in database...');
      const { error: updateError, data: updateData } = await supabase
        .from("profiles")
        .update({
          profile_picture_url: publicUrl,
          date_of_birth: dateOfBirth,
          gender: gender as "male" | "female",
          description: description || null,
          full_name: fullName,
          username,
          is_kyc_completed: true,
        })
        .eq("id", user?.id)
        .select()
        .single();

      if (updateError) {
        console.error('[KYC] Update error:', updateError);
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      console.log('[KYC] Profile updated successfully:', updateData);

      toast({
        title: "Profile Completed",
        description: "Your profile is now visible in the feed!",
      });

      // Wait for profile refresh to complete
      console.log('[KYC] Refreshing profile...');
      await refreshProfile();
      console.log('[KYC] Profile refresh complete');
      
    } catch (error: any) {
      console.error('[KYC] Error during KYC submission:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password Changed",
        description: "Your password has been updated",
      });
      setNewPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVideoCallToggle = async (enabled: boolean) => {
    if (enabled) {
      setCheckingPermissions(true);
      try {
        // Check if permissions were already granted
        const storedPermissions = getStoredPermissions();
        
        if (storedPermissions?.camera && storedPermissions?.microphone) {
          console.log('[PERMISSIONS] Using stored permissions');
        } else {
          // Request all permissions
          const permissions = await requestPermissions();
          
          if (!permissions.camera || !permissions.microphone) {
            toast({
              title: "Permissions Required",
              description: "Camera and microphone permissions are required to enable video calls",
              variant: "destructive",
            });
            setCheckingPermissions(false);
            return;
          }

          if (!permissions.notifications) {
            toast({
              title: "Notification Permission Recommended",
              description: "Enable notifications to be alerted of incoming calls",
            });
          }

          // Save permissions to storage
          savePermissions({
            camera: permissions.camera,
            microphone: permissions.microphone,
            notifications: permissions.notifications,
            grantedAt: Date.now(),
          });
          console.log('[PERMISSIONS] Permissions saved to storage');
        }

        // All permissions granted, enable video calls
        const { error } = await supabase
          .from("profiles")
          .update({ video_call_enabled: true })
          .eq("id", user?.id);

        if (error) throw error;

        setVideoCallEnabled(true);
        toast({
          title: "Video Calls Enabled",
          description: "You can now make and receive video calls",
        });
      } catch (error: any) {
        console.error('[SETTINGS] Video call enable error:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setCheckingPermissions(false);
      }
    } else {
      // Disable video calls
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ video_call_enabled: false })
          .eq("id", user?.id);

        if (error) throw error;

        setVideoCallEnabled(false);
        toast({
          title: "Video Calls Disabled",
          description: "You won't receive video call requests",
        });
      } catch (error: any) {
        console.error('[SETTINGS] Video call disable error:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      // Delete profile picture from storage
      if (profile?.profile_picture_url) {
        const filePath = `${user?.id}/profile.${profile.profile_picture_url.split('.').pop()}`;
        await supabase.storage
          .from("profile-pictures")
          .remove([filePath]);
      }

      // Delete profile (cascades to related data)
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user?.id);

      if (error) throw error;

      await signOut();
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedUserId || !balanceAmount) {
      toast({
        title: "Missing Information",
        description: "Please select a user and enter an amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(balanceAmount);
    if (isNaN(amount)) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.debug("[ADMIN] Updating balance:", { selectedUserId, amount });
    try {
      const { data: existingWallet, error: fetchErr } = await supabase
        .from("wallets")
        .select("user_id, account_balance, active_earning, total_withdrawn")
        .eq("user_id", selectedUserId)
        .maybeSingle();
      if (fetchErr) {
        console.error("[ADMIN] Fetch wallet error:", fetchErr);
      }

      if (!existingWallet) {
        console.debug("[ADMIN] No wallet found, creating one for user", selectedUserId);
        const { error: insertErr } = await supabase
          .from("wallets")
          .insert({
            user_id: selectedUserId,
            account_balance: amount,
            active_earning: 0,
            total_withdrawn: 0,
          });
        if (insertErr) {
          console.error("[ADMIN] Insert wallet error:", insertErr);
          throw insertErr;
        }
      } else {
        console.debug("[ADMIN] Wallet exists, updating balance", existingWallet);
        const { error: updateErr } = await supabase
          .from("wallets")
          .update({ account_balance: amount })
          .eq("user_id", selectedUserId);
        if (updateErr) {
          console.error("[ADMIN] Update wallet error:", updateErr);
          throw updateErr;
        }
      }

      console.debug("[ADMIN] Balance updated successfully, refetching users");
      toast({
        title: "Balance Updated",
        description: `User balance updated to Tsh ${amount.toFixed(2)}`,
      });

      setBalanceAmount("");
      setSelectedUserId("");
      await fetchAllUsers();
    } catch (error: any) {
      console.error("[ADMIN] Balance update failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiSettings = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('api_settings')
        .select('id')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('api_settings')
          .update({
            zenopay_api_key: zenopayApiKey,
            nextsms_sender_id: nextsmsSenderId,
            nextsms_username: nextsmsUsername,
            nextsms_password: nextsmsPassword,
            metered_app_name: meteredAppName,
            metered_secret_key: meteredSecretKey,
          } as any)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('api_settings')
          .insert({
            zenopay_api_key: zenopayApiKey,
            nextsms_sender_id: nextsmsSenderId,
            nextsms_username: nextsmsUsername,
            nextsms_password: nextsmsPassword,
            metered_app_name: meteredAppName,
            metered_secret_key: meteredSecretKey,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "API settings have been updated successfully",
      });
    } catch (error: any) {
      console.error('[API_SETTINGS] Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save API settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone_number?.includes(searchQuery)
  );

  if (!user) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Settings</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Sign in or create an account to access settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setShowAuthDialog(true)}>
              <LogIn className="h-4 w-4 mr-2" />
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

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Settings</h2>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your settings...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Settings</h2>

      {/* KYC Form - Only show if profile is loaded and KYC not completed */}
      {!authLoading && profile && !profile.is_kyc_completed && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Complete Your Profile (KYC)</CardTitle>
            <CardDescription>
              Complete your profile to unlock all features and appear in the feed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Profile Picture *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
              />
            </div>

            <div className="space-y-2">
              <Label>Date of Birth *</Label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Gender *</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell people about yourself (no phone numbers or links)"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Note: Cannot include phone numbers or links
              </p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label>Enable Video Calls</Label>
                <p className="text-xs text-muted-foreground">
                  Requires camera, microphone & notification permissions
                </p>
              </div>
              <Switch
                checked={videoCallEnabled}
                onCheckedChange={handleVideoCallToggle}
                disabled={checkingPermissions}
              />
            </div>

            <Button
              onClick={handleKYCSubmit}
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Complete Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Profile Info - Show if profile loaded and KYC completed */}
      {!authLoading && profile?.is_kyc_completed && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Full Name:</strong> {profile.full_name}</p>
              <p><strong>Username:</strong> @{profile.username}</p>
              <p><strong>Region:</strong> {profile.region}</p>
              <p><strong>Phone:</strong> {profile.phone_number}</p>
              <p><strong>Registration Date:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Video Call Settings</CardTitle>
              <CardDescription>
                Manage video call availability and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Video Calls</Label>
                  <p className="text-xs text-muted-foreground">
                    Requires camera, microphone & notification permissions
                  </p>
                </div>
                <Switch
                  checked={videoCallEnabled}
                  onCheckedChange={handleVideoCallToggle}
                  disabled={checkingPermissions}
                />
              </div>
              {checkingPermissions && (
                <p className="text-sm text-muted-foreground">
                  Checking permissions...
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button onClick={handlePasswordChange} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Premium Subscriptions
              </CardTitle>
              <CardDescription>
                Unlock exclusive features with premium packages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentSubscription ? (
                <>
                  <div className="bg-primary/10 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">{currentSubscription.package} Package</span>
                      <span className="text-sm text-muted-foreground">Active</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>Amount Paid:</strong> Tsh {currentSubscription.amount_paid?.toLocaleString()}</p>
                      <p><strong>Start Date:</strong> {new Date(currentSubscription.start_date).toLocaleDateString()}</p>
                      <p><strong>Expires:</strong> {new Date(currentSubscription.end_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Your subscription is valid for 30 days from purchase
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>SILVER (Tsh 9,000/month):</strong> Basic features, Standard support</p>
                    <p><strong>GOLD (Tsh 25,000/month):</strong> All Silver + Priority support + Analytics</p>
                    <p><strong>DIAMOND (Tsh 50,000/month):</strong> All Gold + Custom pricing + Premium badge</p>
                    <p><strong>PLATINUM (Tsh 100,000/month):</strong> All Diamond + Unlimited calls + VIP status</p>
                  </div>

                  <Button onClick={() => setShowSubscribeDialog(true)} className="w-full">
                    <Crown className="mr-2 h-4 w-4" />
                    Subscribe Now
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Account
              </Button>
            </CardContent>
          </Card>

          {/* Admin Section */}
          {isAdmin && (
            <>
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Admin Panel
                  </CardTitle>
                  <CardDescription>
                    Manage all users and their account balances
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Search Users</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, username, or phone"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="rounded-md border max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((u) => (
                            <TableRow key={u.id} className={u.is_blocked ? "bg-destructive/10" : ""}>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium">{u.full_name || "N/A"}</p>
                                  <p className="text-xs text-muted-foreground">@{u.username || "N/A"}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{u.phone_number}</TableCell>
                              <TableCell>
                                <div className="space-y-1 text-xs">
                                  <p className="text-primary font-semibold">Bal: Tsh {u.account_balance?.toFixed(0) || "0"}</p>
                                  <p className="text-accent">Earn: Tsh {u.active_earning?.toFixed(0) || "0"}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-1">
                                    {u.is_kyc_completed ? (
                                      <span className="text-green-500">KYC ✓</span>
                                    ) : (
                                      <span className="text-red-500">KYC ✗</span>
                                    )}
                                  </div>
                                  {u.is_blocked && (
                                    <span className="text-destructive font-semibold">BLOCKED</span>
                                  )}
                                  {u.force_online && (
                                    <span className="text-blue-500 font-semibold">FORCE ONLINE</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Button
                                    variant={u.is_blocked ? "outline" : "destructive"}
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => handleToggleBlock(u.id, u.is_blocked)}
                                  >
                                    {u.is_blocked ? "Unblock" : "Block"}
                                  </Button>
                                  <Button
                                    variant={u.force_online ? "secondary" : "outline"}
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => handleToggleForceOnline(u.id, u.force_online)}
                                  >
                                    {u.force_online ? "Normal Status" : "Force Online"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteUser(u.id, u.full_name)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold">Update User Balance</h3>
                    
                    <div className="space-y-2">
                      <Label>Select User</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {allUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.username || u.phone_number} - Current: Tsh {u.account_balance?.toFixed(2) || "0.00"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>New Balance (Tsh)</Label>
                      <Input
                        type="number"
                        placeholder="Enter new balance"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        step="0.01"
                      />
                    </div>

                    <Button 
                      onClick={handleUpdateBalance} 
                      disabled={loading || !selectedUserId || !balanceAmount}
                      className="w-full"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Balance
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>API Settings</CardTitle>
                  <CardDescription>Configure ZenoPay, NextSMS and Metered (Video Call) credentials</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>ZenoPay API Key</Label>
                    <Input
                      type="password"
                      value={zenopayApiKey}
                      onChange={(e) => setZenopayApiKey(e.target.value)}
                      placeholder="Enter ZenoPay API key"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>NextSMS Sender ID</Label>
                    <Input
                      value={nextsmsSenderId}
                      onChange={(e) => setNextsmsSenderId(e.target.value)}
                      placeholder="e.g., Baba Africa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NextSMS Username</Label>
                    <Input
                      value={nextsmsUsername}
                      onChange={(e) => setNextsmsUsername(e.target.value)}
                      placeholder="Enter NextSMS username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NextSMS Password</Label>
                    <Input
                      type="password"
                      value={nextsmsPassword}
                      onChange={(e) => setNextsmsPassword(e.target.value)}
                      placeholder="Enter NextSMS password"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Metered App Name</Label>
                    <Input
                      value={meteredAppName}
                      onChange={(e) => setMeteredAppName(e.target.value)}
                      placeholder="e.g., yourappname (from metered.ca)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your Metered app name from dashboard.metered.ca
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Metered Secret Key</Label>
                    <Input
                      type="password"
                      value={meteredSecretKey}
                      onChange={(e) => setMeteredSecretKey(e.target.value)}
                      placeholder="Enter Metered secret key"
                    />
                    <p className="text-xs text-muted-foreground">
                      Found in Developers section of your Metered dashboard
                    </p>
                  </div>
                  <Button onClick={handleSaveApiSettings} disabled={loading} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save API Settings
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          <Button variant="outline" onClick={signOut} className="w-full">
            Sign Out
          </Button>
        </>
      )}

      {/* Subscribe Dialog */}
      <SubscribeDialog
        open={showSubscribeDialog}
        onOpenChange={setShowSubscribeDialog}
        onSuccess={() => {
          fetchCurrentSubscription();
          toast({
            title: "Success",
            description: "Subscription activated successfully!",
          });
        }}
      />
    </div>
  );
};

export default SettingsPage;