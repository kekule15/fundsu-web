// contexts/WalletGenerationContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  Keypair,
  Transaction,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import * as bip39 from "bip39";
import { walletDB } from "@/utils/IndexedDBStorage";

interface WalletGenerationContextType {
  seedPhrase: string[];
  setSeedPhrase: (phrase: string[]) => void;
  generatedKeypair: Keypair | null;
  setGeneratedKeypair: (keypair: Keypair | null) => void;
  isConfirmed: boolean;
  setIsConfirmed: (confirmed: boolean) => void;
  generateNewSeedPhrase: () => void;
  restoreFromSeedPhrase: (phrase: string[]) => Promise<Keypair>;
  restoreFromStorage: () => Promise<Keypair | null>;
  silentlyRestoreFromStorage: () => Promise<Keypair | null>;
  clearWalletData: () => Promise<void>;
  isInitializing: boolean;
  signTransaction: <T extends Transaction | VersionedTransaction>(
    transaction: T
  ) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ) => Promise<T[]>;
  getPublicKey: () => PublicKey | null;
  isRestoring: boolean;
}

const WalletGenerationContext = createContext<
  WalletGenerationContextType | undefined
>(undefined);

export const WalletGenerationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [generatedKeypair, setGeneratedKeypair] = useState<Keypair | null>(
    null
  );
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);

  // Initialize IndexedDB and restore wallet if exists
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        await walletDB.init();

        // Check if we have existing wallet data
        const storedSeedPhrase = await walletDB.getItem("seedPhrase");
        const storedPublicKey = await walletDB.getItem("publicKey");

        if (
          storedSeedPhrase &&
          Array.isArray(storedSeedPhrase) &&
          storedPublicKey
        ) {
          console.log("Found stored wallet data, restoring...");
          setIsRestoring(true);
          await restoreFromStorage();
        }
      } catch (error) {
        console.error("Error initializing wallet:", error);
      } finally {
        setIsInitializing(false);
        setIsRestoring(false);
      }
    };

    initializeWallet();
  }, []);

  const generateNewSeedPhrase = () => {
    const mnemonic = bip39.generateMnemonic();
    const phrase = mnemonic.split(" ");
    setSeedPhrase(phrase);
    setIsConfirmed(false);
    setGeneratedKeypair(null); // Reset keypair until confirmation
  };

  // Add this function to check if we already have the same keypair
  const isSameKeypair = (
    keypair1: Keypair | null,
    keypair2: Keypair | null
  ): boolean => {
    if (!keypair1 || !keypair2) return keypair1 === keypair2;
    return keypair1.publicKey.toBase58() === keypair2.publicKey.toBase58();
  };

  const restoreFromSeedPhrase = async (phrase: string[]): Promise<Keypair> => {
    try {
      const mnemonic = phrase.join(" ");

      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error("Invalid seed phrase");
      }

      const seed = await bip39.mnemonicToSeed(mnemonic);
      const keypair = Keypair.fromSeed(seed.slice(0, 32));

      // Only update state if the keypair is different
      if (!isSameKeypair(generatedKeypair, keypair)) {
        setSeedPhrase(phrase);
        setGeneratedKeypair(keypair);
        setIsConfirmed(true);
      }

      // Store in IndexedDB
      await walletDB.setItem("seedPhrase", phrase);
      await walletDB.setItem("publicKey", keypair.publicKey.toBase58());

      return keypair;
    } catch (error) {
      console.error("Error restoring from seed phrase:", error);
      throw error;
    }
  };

  const restoreFromStorage = async (): Promise<Keypair | null> => {
    try {
      setIsRestoring(true);

      // Check if we have seed phrase in storage
      const storedSeedPhrase = await walletDB.getItem("seedPhrase");

      if (!storedSeedPhrase || !Array.isArray(storedSeedPhrase)) {
        console.log("No seed phrase found in storage");
        return null;
      }

      // Restore from the stored seed phrase
      const keypair = await restoreFromSeedPhrase(storedSeedPhrase);
      console.log(
        "Restored wallet from storage:",
        keypair.publicKey.toBase58()
      );
      // Only update state if the keypair is different
      if (!isSameKeypair(generatedKeypair, keypair)) {
        setGeneratedKeypair(keypair);
      }

      return keypair;
    } catch (error) {
      console.error("Error restoring from storage:", error);
      return null;
    } finally {
      setIsRestoring(false);
    }
  };

  const silentlyRestoreFromStorage = async (): Promise<Keypair | null> => {
    try {
      // Check if we have seed phrase in storage without setting loading states
      const storedSeedPhrase = await walletDB.getItem("seedPhrase");

      if (!storedSeedPhrase || !Array.isArray(storedSeedPhrase)) {
        return null;
      }

      // Restore without triggering state updates that would cause re-renders
      const mnemonic = storedSeedPhrase.join(" ");

      if (!bip39.validateMnemonic(mnemonic)) {
        return null;
      }

      const seed = await bip39.mnemonicToSeed(mnemonic);
      const keypair = Keypair.fromSeed(seed.slice(0, 32));

      // Only update state if the keypair is different
      if (!isSameKeypair(generatedKeypair, keypair)) {
        setSeedPhrase(storedSeedPhrase);
        setGeneratedKeypair(keypair);
        setIsConfirmed(true);
      }

      return keypair;
    } catch (error) {
      console.error("Error silently restoring from storage:", error);
      return null;
    }
  };

  const clearWalletData = async (): Promise<void> => {
    console.log("Clearing wallet data...");
    try {
      setSeedPhrase([]);
      setGeneratedKeypair(null);
      setIsConfirmed(false);

      // Clear IndexedDB storage
      await walletDB.removeItem("seedPhrase");
      await walletDB.removeItem("publicKey");
    } catch (error) {
      console.error("Error clearing wallet data:", error);
      throw error;
    }
  };

  const signTransaction = async <T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> => {
    // If no keypair but we have seed phrase in storage, try to restore
    if (!generatedKeypair) {
      const restoredKeypair = await restoreFromStorage();
      if (!restoredKeypair) {
        throw new Error(
          "Wallet not connected. Please connect your wallet first."
        );
      }
    }

    try {
      if (transaction instanceof Transaction) {
        transaction.sign(generatedKeypair!);
        return transaction;
      } else if (transaction instanceof VersionedTransaction) {
        transaction.sign([generatedKeypair!]);
        return transaction;
      } else {
        throw new Error("Unsupported transaction type");
      }
    } catch (error) {
      console.error("Error signing transaction:", error);
      throw new Error("Failed to sign transaction");
    }
  };

  const signAllTransactions = async <
    T extends Transaction | VersionedTransaction
  >(
    transactions: T[]
  ): Promise<T[]> => {
    // If no keypair but we have seed phrase in storage, try to restore
    if (!generatedKeypair) {
      const restoredKeypair = await restoreFromStorage();
      if (!restoredKeypair) {
        throw new Error(
          "Wallet not connected. Please connect your wallet first."
        );
      }
    }

    try {
      const signedTransactions: T[] = [];

      for (const transaction of transactions) {
        if (transaction instanceof Transaction) {
          transaction.sign(generatedKeypair!);
          signedTransactions.push(transaction);
        } else if (transaction instanceof VersionedTransaction) {
          transaction.sign([generatedKeypair!]);
          signedTransactions.push(transaction);
        } else {
          throw new Error("Unsupported transaction type");
        }
      }

      return signedTransactions;
    } catch (error) {
      console.error("Error signing transactions:", error);
      throw new Error("Failed to sign transactions");
    }
  };

  const getPublicKey = (): PublicKey | null => {
    return generatedKeypair ? generatedKeypair.publicKey : null;
  };

  return (
    <WalletGenerationContext.Provider
      value={{
        seedPhrase,
        setSeedPhrase,
        generatedKeypair,
        setGeneratedKeypair,
        isConfirmed,
        setIsConfirmed,
        generateNewSeedPhrase,
        restoreFromSeedPhrase,
        restoreFromStorage,
        silentlyRestoreFromStorage,
        clearWalletData,
        isInitializing,
        signTransaction,
        signAllTransactions,
        getPublicKey,
        isRestoring,
      }}
    >
      {children}
    </WalletGenerationContext.Provider>
  );
};

export const useWalletGeneration = () => {
  const context = useContext(WalletGenerationContext);
  if (context === undefined) {
    throw new Error(
      "useWalletGeneration must be used within a WalletGenerationProvider"
    );
  }
  return context;
};
