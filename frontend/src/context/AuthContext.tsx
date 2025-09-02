// src/context/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { UserProfile, UserProfileWrite } from "@/types/user";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { USER_COLLECTION } from "@/utils/db_constants";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  browserLocalPersistence,
  setPersistence,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth";
import { unsubscribe } from "diagnostics_channel";
import { convertToUserProfile } from "@/lib/firebaseHelpers";
import { useWalletGeneration } from "./WalletGenerationContext";
import { getUWalletBalance } from "@/lib/balance";

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  updateUserState: boolean;
  balance: number;
  isAuthenticated: boolean;
  createUserProfile: (walletAddress: string) => Promise<void>;
  checkUserProfile: (walletAddress: string) => Promise<void | Unsubscribe>;
  updateUserProfile: (updates: Partial<UserProfileWrite>) => Promise<void>;
  getUserProfile: (walletAddress: string) => Promise<UserProfile | null>;
  refreshInternalUser: () => Promise<UserProfile | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateUserState, setUpdateUserState] = useState(false);
  // const wallet = useAnchorWallet();
  // const { connection } = useConnection();
  // const { disconnect } = useWallet();
  const { generatedKeypair, clearWalletData } = useWalletGeneration();

  // for balance
  const [balance, setBalance] = useState(0);
  useEffect(() => {
    if (!user?.wallet_address || !generatedKeypair) {
      console.log("No user or wallet address, skipping balance fetch");
      return;
    }
    let interval: NodeJS.Timeout;
    // Get the wallet balance
    const getWalletBalance = async () => {
      try {
        console.log("Fetching wallet balance for", user.wallet_address);
        const key = new PublicKey(user.wallet_address);

        const amount = await getUserWalletBalance(key.toBase58());
        console.log("Wallet balance:", amount);
        setBalance(amount);
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
      }
    };

    // fetch immediately
    getWalletBalance();

    // refresh every 30s
    interval = setInterval(getWalletBalance, 30_000);

    return () => clearInterval(interval);
  }, [user, generatedKeypair]);

  useEffect(() => {
    // Subscribe to Firebase auth state
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User already signed in (persisted session survives refresh)
        const walletAddress = firebaseUser.uid; // since UID == walletAddress
        await checkUserProfile(walletAddress);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (generatedKeypair && !auth.currentUser) {
      const walletAddress = generatedKeypair.publicKey.toString();
      checkUserProfile(walletAddress);
    } else {
      setLoading(false);
      setUser(null);
    }
  }, [generatedKeypair]);

  const checkUserProfile = async (
    walletAddress: string
  ): Promise<void | Unsubscribe> => {
    console.log("Checking user profile for wallet:", walletAddress);
    try {
      setLoading(true);
      // Step 1: Ensure signed in with wallet UID
      if (!auth.currentUser || auth.currentUser.uid !== walletAddress) {
        console.log("User needs to sign in with wallet UID");
        // fetch custom token from backend
        const res = await fetch("/api/get-firebase-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        });
        const { token } = await res.json();

        await setPersistence(auth, browserLocalPersistence);
        await signInWithCustomToken(auth, token);
        console.log("Signed in with wallet UID:", auth.currentUser?.uid);
      }
      console.log("Proceeding to check/create user profile");
      const userDoc = doc(db, USER_COLLECTION, walletAddress); // Use wallet address as document ID
      const docSnap = await getDoc(userDoc);

      if (docSnap.exists()) {
        // User exists, set user data
        const userData = convertToUserProfile(docSnap.id, docSnap.data());
        setUser(userData);

        // Set up real-time listener
        const unsubscribe = onSnapshot(userDoc, (doc) => {
          if (doc.exists()) {
            const updatedUser = convertToUserProfile(doc.id, doc.data());
            setUser(updatedUser);
          }
        });

        return () => unsubscribe();
      } else {
        // User does not exist, create new profile
        await createUserProfile(walletAddress);
      }
    } catch (error) {
      console.error("Error checking user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (walletAddress: string) => {
    try {
      const userDoc = doc(db, USER_COLLECTION, walletAddress); // Use wallet address as document ID
      const balance = await getUserWalletBalance(walletAddress);
      const newUser: UserProfileWrite = {
        id: walletAddress, // Set id to wallet address
        wallet_address: walletAddress, // Also store wallet address as a field
        name: `User_${walletAddress.slice(0, 8)}`,
        date_created: serverTimestamp(),
        profile_url: "",
        wallet_balance: balance,
        bio: "",
        website: "",
        social_links: {},
        campaigns_created: [],
        campaigns_contributed: [],
        total_contributions: 0,
        reputation_score: 0,
        notifications_enabled: true,
      };

      await setDoc(userDoc, newUser);

      // Set temporary user data for immediate UI update
      const dNewUser: UserProfile = {
        ...newUser,
        date_created: Math.floor(Date.now() / 1000),
      };
      setUser(dNewUser);
    } catch (error) {
      console.error("Error creating user profile:", error);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfileWrite>) => {
    if (!user) return;
    setUpdateUserState(true);
    try {
      const userDoc = doc(db, USER_COLLECTION, user.id); // Use user.id (which is the wallet address)
      await updateDoc(userDoc, updates).then(() => {
        setUpdateUserState(false);
      });
    } catch (error) {
      setUpdateUserState(false);
      console.error("Error updating user profile:", error);
    } finally {
      setUpdateUserState(false);
    }
  };

  const getUserWalletBalance = async (
    walletAddress: string
  ): Promise<number> => {
    try {
      const key = new PublicKey(walletAddress);
      const balance = await getUWalletBalance(key.toBase58());
      return balance;
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      throw error;
    }
  };

  // Get user profile by wallet address
  const getUserProfile = async (
    walletAddress: string
  ): Promise<UserProfile | null> => {
    try {
      const userDoc = doc(db, USER_COLLECTION, walletAddress);
      const docSnap = await getDoc(userDoc);

      if (docSnap.exists()) {
        const userData = convertToUserProfile(docSnap.id, docSnap.data());
        console.log("Fetched external user profile:", userData);

        return userData;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error getting user profile:", error);

      return null;
    }
  };

  const refreshInternalUser = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    try {
      setLoading(true);
      const userDoc = doc(db, USER_COLLECTION, user.wallet_address);
      const docSnap = await getDoc(userDoc);

      if (docSnap.exists()) {
        const userData = convertToUserProfile(docSnap.id, docSnap.data());
        setUser(userData);
        return userData;
      }
      return null;
    } catch (error) {
      console.error("Error refreshing internal user profile:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear local state
      setUser(null);

      // Firebase logout
      if (auth.currentUser) {
        await auth.signOut();
        console.log("Firebase user signed out");
      }

      // Disconnect wallet if connected
      // await disconnect();
      clearWalletData();
      console.log("Wallet disconnected");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    updateUserState,
    isAuthenticated: !!user,
    balance,
    checkUserProfile,
    createUserProfile,
    updateUserProfile,
    getUserProfile,
    refreshInternalUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
