"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

export default function WalletListener() {
  const { connected, publicKey } = useWallet();
  const { loading: authLoading, user, checkUserProfile } = useAuth();

  useEffect(() => {
    if (connected && publicKey) {
      const walletAddress = publicKey.toBase58();
      console.log(" Wallet connected:", walletAddress);

      // Example: create/update Firestore user profile
      if (user == null) {
        checkUserProfile(walletAddress);
      }

    }
  }, [connected, publicKey]);

  return null; // nothing UI here, just listener
}
