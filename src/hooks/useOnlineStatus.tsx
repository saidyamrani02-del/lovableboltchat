import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useOnlineStatus = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Update last_active on mount and every 30 seconds
    const updateLastActive = async () => {
      await supabase
        .from("profiles")
        .update({
          last_active: new Date().toISOString(),
          is_online: true,
        })
        .eq("id", user.id);
    };

    updateLastActive();
    const interval = setInterval(updateLastActive, 30000); // 30 seconds

    // Set offline on unmount
    return () => {
      clearInterval(interval);
      supabase
        .from("profiles")
        .update({ is_online: false })
        .eq("id", user.id);
    };
  }, [user]);
};
