import { useState, useEffect } from "react";
import ProfileCard from "@/components/ProfileCard";
import VideoCallDialog from "@/components/VideoCallDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface FeedProps {
  filters?: {
    gender: string;
    onlineOnly: boolean;
    ageSort: string;
    region: string;
  };
}

const Feed = ({ filters }: FeedProps) => {
  const [page, setPage] = useState(1);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const profilesPerPage = 20;

  useEffect(() => {
    fetchProfiles();
  }, [filters]);

  useEffect(() => {
    // Subscribe to realtime updates for online status
    const channel = supabase
      .channel("profiles-online")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          setProfiles((prev) =>
            prev.map((p) =>
              p.id === payload.new.id
                ? { ...p, is_online: payload.new.is_online, last_active: payload.new.last_active }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      // Fetch ALL KYC-completed profiles that are not blocked
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_kyc_completed", true)
        .eq("is_blocked", false);

      if (error) throw error;
      
      let sortedData = data || [];

      // Check online status based on last_active (20 minutes) OR force_online flag
      const now = Date.now();
      sortedData = sortedData.map(profile => ({
        ...profile,
        is_online: profile.force_online || (profile.last_active && 
          (now - new Date(profile.last_active).getTime()) < 20 * 60000)
      }));

      // Sort by filter matches first, then by other criteria
      sortedData = sortedData.sort((a, b) => {
        // Count how many active filters each profile matches
        let aMatches = 0;
        let bMatches = 0;

        // Gender filter match
        if (filters?.gender && filters.gender !== "all") {
          if (a.gender === filters.gender) aMatches++;
          if (b.gender === filters.gender) bMatches++;
        }

        // Online filter match
        if (filters?.onlineOnly) {
          if (a.is_online) aMatches++;
          if (b.is_online) bMatches++;
        }

        // Region filter match
        if (filters?.region && filters.region !== "all-regions") {
          const regionName = filters.region.split("-").map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(" ");
          if (a.region?.toLowerCase() === regionName.toLowerCase()) aMatches++;
          if (b.region?.toLowerCase() === regionName.toLowerCase()) bMatches++;
        }

        // Profiles with more matches appear first
        if (bMatches !== aMatches) {
          return bMatches - aMatches;
        }

        // Apply age sorting if specified
        if (filters?.ageSort) {
          const ageA = calculateAge(a.date_of_birth);
          const ageB = calculateAge(b.date_of_birth);
          const ageDiff = filters.ageSort === "low-to-high" ? ageA - ageB : ageB - ageA;
          if (ageDiff !== 0) return ageDiff;
        }

        // Then by online status
        if (b.is_online !== a.is_online) {
          return b.is_online ? 1 : -1;
        }

        // Finally by view count
        return (b.view_count || 0) - (a.view_count || 0);
      });

      setProfiles(sortedData);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleUsernameClick = async (profile: any) => {
    setSelectedProfile(profile);
    setShowProfileDialog(true);

    // Increment view count
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ view_count: profile.view_count + 1 })
        .eq("id", profile.id);

      if (error) throw error;

      // Update local state
      setProfiles(profiles.map(p =>
        p.id === profile.id ? { ...p, view_count: p.view_count + 1 } : p
      ));
    } catch (error) {
      console.error("Error updating view count:", error);
    }
  };

  const handleVideoCall = (profile: any) => {
    // Prevent calling yourself
    if (user && profile.id === user.id) {
      toast({
        title: "Cannot Call Yourself",
        description: "You cannot make a video call to your own profile",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedProfile(profile);
    setShowVideoCall(true);
  };

  const handleShareProfile = () => {
    if (selectedProfile) {
      const shareUrl = `${window.location.origin}/profile/${selectedProfile.id}`;
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Profile link copied to clipboard",
      });
    }
  };

  const startIndex = (page - 1) * profilesPerPage;
  const endIndex = startIndex + profilesPerPage;
  const currentProfiles = profiles.slice(startIndex, endIndex);
  const totalPages = Math.ceil(profiles.length / profilesPerPage);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Discover Profiles</h2>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading amazing profiles...</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-foreground">Discover Profiles</h2>
      
      {currentProfiles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No profiles available yet</p>
        </div>
      ) : (
        <>
          {/* Profile Grid */}
          <div className="grid grid-cols-2 gap-3">
            {currentProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={{
                  id: profile.id,
                  username: profile.username || "user",
                  age: calculateAge(profile.date_of_birth),
                  profilePicture: profile.profile_picture_url || "",
                  isOnline: profile.is_online,
                  pricePerSecond: Number(profile.custom_price_per_second),
                  viewCount: profile.view_count,
                  region: profile.region,
                }}
                onUsernameClick={() => handleUsernameClick(profile)}
                onVideoCallClick={() => handleVideoCall(profile)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Video Call Dialog */}
      {selectedProfile && (
        <VideoCallDialog
          open={showVideoCall}
          onOpenChange={setShowVideoCall}
          recipientProfile={selectedProfile}
          isCaller={true}
        />
      )}

      {/* Profile Details Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>@{selectedProfile?.username}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShareProfile}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-4">
              <div className="flex justify-center mb-4">
                {selectedProfile?.profile_picture_url ? (
                  <img
                    src={selectedProfile.profile_picture_url}
                    alt={selectedProfile.username}
                    className="h-32 w-32 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center text-4xl font-bold">
                    {selectedProfile?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="space-y-1 text-left">
                <p><strong>Full Name:</strong> {selectedProfile?.full_name || "Not provided"}</p>
                <p><strong>Age:</strong> {calculateAge(selectedProfile?.date_of_birth)} years</p>
                <p><strong>Region:</strong> {selectedProfile?.region}</p>
                <p><strong>Views:</strong> {selectedProfile?.view_count}</p>
                <p className="pt-2"><strong>About:</strong></p>
                <p className="text-sm">{selectedProfile?.description || "No description"}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Feed;