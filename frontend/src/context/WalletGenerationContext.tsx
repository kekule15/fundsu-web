// contexts/WalletGenerationContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Keypair, Transaction, VersionedTransaction, Connection, PublicKey } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { walletDB } from '@/utils/IndexedDBStorage';

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
  clearWalletData: () => Promise<void>;
  isInitializing: boolean;
   signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
  getPublicKey: () => PublicKey | null;
}

const WalletGenerationContext = createContext<WalletGenerationContextType | undefined>(undefined);

export const WalletGenerationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [generatedKeypair, setGeneratedKeypair] = useState<Keypair | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize IndexedDB
  useEffect(() => {
    const initializeDB = async () => {
      try {
        await walletDB.init();
        
        // Check if we have existing wallet data
        const storedSeedPhrase = await walletDB.getItem('seedPhrase');
        if (storedSeedPhrase && Array.isArray(storedSeedPhrase)) {
          setSeedPhrase(storedSeedPhrase);
          // Don't automatically restore here - let the component decide when to call restoreFromStorage
        }
      } catch (error) {
        console.error('Error initializing IndexedDB:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDB();
  }, []);

  const generateNewSeedPhrase = () => {
    const mnemonic = bip39.generateMnemonic();
    const phrase = mnemonic.split(' ');
    setSeedPhrase(phrase);
    setIsConfirmed(false);
  };

  const restoreFromSeedPhrase = async (phrase: string[]): Promise<Keypair> => {
    try {
      const mnemonic = phrase.join(' ');
      
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid seed phrase');
      }
      
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const keypair = Keypair.fromSeed(seed.slice(0, 32));
      
      setSeedPhrase(phrase);
      setGeneratedKeypair(keypair);
      setIsConfirmed(true);
      
      // Store in IndexedDB
      await walletDB.setItem('seedPhrase', phrase);
      await walletDB.setItem('publicKey', keypair.publicKey.toBase58());
      
      return keypair;
    } catch (error) {
      console.error('Error restoring from seed phrase:', error);
      throw error;
    }
  };

  const restoreFromStorage = async (): Promise<Keypair | null> => {
    try {
      // Check if we have seed phrase in storage
      const storedSeedPhrase = await walletDB.getItem('seedPhrase');
      
      if (!storedSeedPhrase || !Array.isArray(storedSeedPhrase)) {
        // No wallet data found in storage
        return null;
      }
      
      // Restore from the stored seed phrase
      const keypair = await restoreFromSeedPhrase(storedSeedPhrase);
      return keypair;
    } catch (error) {
      console.error('Error restoring from storage:', error);
      
      // If there's an error, clear the corrupted data
      await clearWalletData();
      return null;
    }
  };

  const clearWalletData = async (): Promise<void> => {
    try {
      setSeedPhrase([]);
      setGeneratedKeypair(null);
      setIsConfirmed(false);
      
      // Clear IndexedDB storage
      await walletDB.removeItem('seedPhrase');
      await walletDB.removeItem('publicKey');
    } catch (error) {
      console.error('Error clearing wallet data:', error);
    }
  };

   const signTransaction = async <T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> => {
    if (!generatedKeypair) {
      throw new Error('Wallet not connected');
    }

    try {
      if (transaction instanceof Transaction) {
        // Sign legacy transaction
        transaction.sign(generatedKeypair);
        return transaction;
      } else if (transaction instanceof VersionedTransaction) {
        // Sign versioned transaction
        transaction.sign([generatedKeypair]);
        return transaction;
      } else {
        throw new Error('Unsupported transaction type');
      }
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw new Error('Failed to sign transaction');
    }
  };

  const signAllTransactions = async <T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]> => {
    if (!generatedKeypair) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTransactions: T[] = [];
      
      for (const transaction of transactions) {
        if (transaction instanceof Transaction) {
          // Sign legacy transaction
          transaction.sign(generatedKeypair);
          signedTransactions.push(transaction);
        } else if (transaction instanceof VersionedTransaction) {
          // Sign versioned transaction
          transaction.sign([generatedKeypair]);
          signedTransactions.push(transaction);
        } else {
          throw new Error('Unsupported transaction type');
        }
      }
      
      return signedTransactions;
    } catch (error) {
      console.error('Error signing transactions:', error);
      throw new Error('Failed to sign transactions');
    }
  };

  const getPublicKey = (): PublicKey | null => {
    return generatedKeypair ? generatedKeypair.publicKey : null;
  };

  return (
    <WalletGenerationContext.Provider value={{
      seedPhrase,
      setSeedPhrase,
      generatedKeypair,
      setGeneratedKeypair,
      isConfirmed,
      setIsConfirmed,
      generateNewSeedPhrase,
      restoreFromSeedPhrase,
      restoreFromStorage,
      clearWalletData,
      isInitializing,
      signTransaction,
      signAllTransactions,
      getPublicKey
    }}>
      {children}
    </WalletGenerationContext.Provider>
  );
};

export const useWalletGeneration = () => {
  const context = useContext(WalletGenerationContext);
  if (context === undefined) {
    throw new Error('useWalletGeneration must be used within a WalletGenerationProvider');
  }
  return context;
};