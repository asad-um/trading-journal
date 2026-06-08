"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

interface PrivacyContextType {
  isPrivate: boolean;
  togglePrivacy: () => void;
  blurMoney: (amount: number | string | undefined | null, prefix?: string) => string;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("privacy_mode");
    if (saved === "true") setIsPrivate(true);
  }, []);

  const togglePrivacy = () => {
    setIsPrivate(prev => {
      const next = !prev;
      localStorage.setItem("privacy_mode", String(next));
      return next;
    });
  };

  const blurMoney = (amount: number | string | undefined | null, prefix: string = "$") => {
    if (amount === undefined || amount === null) return `${prefix}0.00`;
    if (isPrivate) return "****";
    
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${prefix}${Math.abs(num).toFixed(2)}`;
  };

  return (
    <PrivacyContext.Provider value={{ isPrivate, togglePrivacy, blurMoney }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) throw new Error("usePrivacy must be used within PrivacyProvider");
  return context;
}
