import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  isAdmin: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[AUTH] Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error('[AUTH] Profile fetch error:', error);
        throw error;
      }
      
      console.log('[AUTH] Profile fetched:', data);
      setProfile(data);
      return data;
    } catch (error) {
      console.error("[AUTH] Error fetching profile:", error);
      return null;
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) throw error;
      setRoles(data?.map((r) => r.role) || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('[AUTH] Refreshing profile...');
      await fetchProfile(user.id);
      await fetchRoles(user.id);
      console.log('[AUTH] Profile refresh complete');
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setTimeout(() => {
            fetchProfile(currentSession.user.id);
            fetchRoles(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        Promise.all([
          fetchProfile(currentSession.user.id),
          fetchRoles(currentSession.user.id)
        ]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes('admin');

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, signOut, refreshProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};