"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("[AuthProvider] Init Auth Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== "/login" && pathname !== "/register") {
        router.push("/login");
      } else if (user && (pathname === "/login" || pathname === "/register" || pathname === "/")) {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, pathname, router]);


  // Inactivity Timeout Security Feature
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes in milliseconds

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.warn("Session expired due to inactivity.");
        signOut();
      }, INACTIVITY_LIMIT);
    };

    // Listen for basic user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

    // Initialize timer
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
