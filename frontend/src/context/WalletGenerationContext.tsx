// contexts/WalletGenerationContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';

interface WalletGenerationContextType {
  seedPhrase: string[];
  setSeedPhrase: (phrase: string[]) => void;
  generatedKeypair: Keypair | null;
  setGeneratedKeypair: (keypair: Keypair | null) => void;
  isConfirmed: boolean;
  setIsConfirmed: (confirmed: boolean) => void;
  generateNewSeedPhrase: () => void;
  restoreFromSeedPhrase: (phrase: string[]) => Promise<Keypair>;
  clearWalletData: () => void;
  isMobile: boolean;
}

const WalletGenerationContext = createContext<WalletGenerationContextType | undefined>(undefined);

export const WalletGenerationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [generatedKeypair, setGeneratedKeypair] = useState<Keypair | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
      
      // Store in localStorage or IndexedDB
      localStorage.setItem('walletData', JSON.stringify({
        seedPhrase: phrase,
        publicKey: keypair.publicKey.toBase58()
      }));
      
      return keypair;
    } catch (error) {
      console.error('Error restoring from seed phrase:', error);
      throw error;
    }
  };

  const clearWalletData = () => {
    setSeedPhrase([]);
    setGeneratedKeypair(null);
    setIsConfirmed(false);
    localStorage.removeItem('walletData');
  };

  useEffect(() => {
  const checkIsMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  
  checkIsMobile();
  window.addEventListener('resize', checkIsMobile);
  
  return () => {
    window.removeEventListener('resize', checkIsMobile);
  };
}, []);

  // Check for existing wallet data on mount
  useEffect(() => {
    const storedData = localStorage.getItem('walletData');
    if (storedData) {
      try {
        const { seedPhrase: storedSeedPhrase } = JSON.parse(storedData);
        if (storedSeedPhrase && Array.isArray(storedSeedPhrase)) {
          setSeedPhrase(storedSeedPhrase);
          restoreFromSeedPhrase(storedSeedPhrase);
        }
      } catch (error) {
        console.error('Error parsing stored wallet data:', error);
      }
    }
  }, []);

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
      clearWalletData,
      isMobile
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