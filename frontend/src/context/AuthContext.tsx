// contexts/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
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
import { USER_COLLECTION } from "@/utils/db_constants";
import { PublicKey } from "@solana/web3.js";
import {
  browserLocalPersistence,
  setPersistence,
  signInWithCustomToken,
} from "firebase/auth";
import { convertToUserProfile } from "@/lib/firebaseHelpers";
import { useWalletGeneration } from "./WalletGenerationContext";
import { getUWalletBalance } from "@/lib/balance";
import { useSidebar } from "./SidebarContext";

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
  logout: () => Promise<void>;
  isRestoringSession: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateUserState, setUpdateUserState] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Use a ref to track if auth has been initialized
  const authInitializedRef = useRef(false);
  const previousGeneratedKeypairRef = useRef<string | null>(null);
  const initialAuthDoneRef = useRef(false);

  const {
    generatedKeypair,
    clearWalletData,
    isInitializing,
    isRestoring,
    silentlyRestoreFromStorage,
  } = useWalletGeneration();
  const { activeItem } = useSidebar();
  const [balance, setBalance] = useState(0);

  // Fetch wallet balance
  const fetchWalletBalance = useCallback(async () => {
    if (!user?.wallet_address) {
      console.log("No user wallet address, skipping balance fetch");
      return;
    }

    try {
      console.log("Fetching wallet balance for", user.wallet_address);
      const key = new PublicKey(user.wallet_address);
      const amount = await getUWalletBalance(key.toBase58());
      console.log("Wallet balance:", amount);
      setBalance(amount);
    } catch (err) {
      console.error("Error fetching wallet balance:", err);
    }
  }, [user]);

  useEffect(() => {
    fetchWalletBalance();
  }, [fetchWalletBalance, activeItem]);

  // Effect for initial authentication (runs once)
  useEffect(() => {
    const performInitialAuth = async () => {
      if (isInitializing || initialAuthDoneRef.current) {
        return;
      }

      initialAuthDoneRef.current = true;
      setIsRestoringSession(true);

      try {
        // First priority: Use existing generated keypair
        if (generatedKeypair) {
          const walletAddress = generatedKeypair.publicKey.toString();
          await checkUserProfile(walletAddress);
        }
        // Second priority: Restore from storage if Firebase user exists
        else if (auth.currentUser) {
          console.log("Firebase user exists, restoring wallet from storage");
          const restoredKeypair = await silentlyRestoreFromStorage();
          if (restoredKeypair) {
            const walletAddress = restoredKeypair.publicKey.toString();
            await checkUserProfile(walletAddress);
          } else {
            await auth.signOut();
            setUser(null);
          }
        }
        // No authentication possible
        else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error during initial authentication:", error);
        setUser(null);
      } finally {
        setLoading(false);
        setIsRestoringSession(false);
      }
    };

    performInitialAuth();
  }, [isInitializing]); // Only depends on isInitializing

  // Separate effect for handling keypair changes after initial auth
  useEffect(() => {
    // Only run if initial auth is done and we have a new keypair
    if (!initialAuthDoneRef.current || !generatedKeypair) {
      return;
    }

    const handleKeypairChange = async () => {
      setIsRestoringSession(true);
      try {
        const walletAddress = generatedKeypair.publicKey.toString();
        await checkUserProfile(walletAddress);
      } catch (error) {
        console.error("Error handling keypair change:", error);
      } finally {
        setIsRestoringSession(false);
      }
    };

    handleKeypairChange();
  }, [generatedKeypair]);

  const checkUserProfile = async (walletAddress: string): Promise<void> => {
    console.log("Checking user profile for wallet:", walletAddress);

    try {
      setLoading(true);

      // Ensure signed in with wallet UID
      if (!auth.currentUser || auth.currentUser.uid !== walletAddress) {
        console.log("User needs to sign in with wallet UID");

        // Fetch custom token from backend
        const res = await fetch("/api/get-firebase-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        });

        if (!res.ok) {
          throw new Error(`Failed to get Firebase token: ${res.status}`);
        }

        const { token } = await res.json();
        await setPersistence(auth, browserLocalPersistence);
        await signInWithCustomToken(auth, token);
        console.log("Signed in with wallet UID:", auth.currentUser?.uid);
      }

      console.log("Proceeding to check/create user profile");
      const userDoc = doc(db, USER_COLLECTION, walletAddress);

      // Check if user document exists (no realtime listener)
      const docSnap = await getDoc(userDoc);

      if (docSnap.exists()) {
        const userData = convertToUserProfile(docSnap.id, docSnap.data());
        setUser(userData);

        // Update balance
        await fetchWalletBalance();
      } else {
        // User does not exist, create new profile
        await createUserProfile(walletAddress);
      }
    } catch (error) {
      console.error("Error checking user profile:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (walletAddress: string) => {
    try {
      const userDoc = doc(db, USER_COLLECTION, walletAddress);
      const balance = await getUWalletBalance(walletAddress);

      const newUser: UserProfileWrite = {
        id: walletAddress,
        wallet_address: walletAddress,
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
      const tempUser: UserProfile = {
        ...newUser,
        date_created: Math.floor(Date.now() / 1000),
      } as UserProfile;

      setUser(tempUser);
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfileWrite>) => {
    if (!user) return;

    setUpdateUserState(true);
    try {
      const userDoc = doc(db, USER_COLLECTION, user.id);
      await updateDoc(userDoc, updates);
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    } finally {
      setUpdateUserState(false);
    }
  };

  const getUserProfile = async (
    walletAddress: string
  ): Promise<UserProfile | null> => {
    try {
      const userDoc = doc(db, USER_COLLECTION, walletAddress);
      const docSnap = await getDoc(userDoc);

      if (docSnap.exists()) {
        return convertToUserProfile(docSnap.id, docSnap.data());
      }

      return null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
  };

  const refreshInternalUser = async (): Promise<UserProfile | null> => {
    if (!user) return null;

    try {
      setLoading(true);
      const userData = await getUserProfile(user.wallet_address);

      if (userData) {
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
      // Clear wallet data first
      await clearWalletData();

      // Firebase logout
      if (auth.currentUser) {
        await auth.signOut();
        console.log("Firebase user signed out");
      }

      // Clear local state
      setUser(null);
      setBalance(0);

      console.log("User logged out successfully");
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading: loading || isInitializing || isRestoring || isRestoringSession,
    updateUserState,
    isAuthenticated: !!user,
    balance,
    checkUserProfile,
    createUserProfile,
    updateUserProfile,
    getUserProfile,
    refreshInternalUser,
    logout,
    isRestoringSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth should be used within AuthProvider");
  }
  return context;
}
