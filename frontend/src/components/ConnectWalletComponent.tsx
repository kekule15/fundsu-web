// components/ConnectWalletComponent.tsx
"use client";

import React, { useState } from 'react';

import '../styles/ConnectWalletComponent.css';
import { useWalletGeneration } from '@/context/WalletGenerationContext';
import ConfirmSeedPhrase from './ConfirmSeedPhrase';
import ImportWallet from './ImportWallet';
import CreateWallet from './CreateWallet';

export default function ConnectWalletComponent() {
  const [activeTab, setActiveTab] = useState<'import' | 'create'>('import');
  const [isConfirming, setIsConfirming] = useState(false);
  const { isConfirmed } = useWalletGeneration();

  if (isConfirmed) {
    return (
      <div className="connect-wallet-container">
        <div className="wallet-connected">
          <h2>Wallet Connected Successfully!</h2>
          <p>You can now use all features of the platform.</p>
        </div>
      </div>
    );
  }

  if (isConfirming) {
    return <ConfirmSeedPhrase onBack={() => setIsConfirming(false)} />;
  }

  return (
    <div className="connect-wallet-container">
      <div className="connect-wallet-header">
        <h1>Connect Your Solana Wallet</h1>
        <p>To fully enjoy the features of this platform, please connect your wallet.</p>
      </div>

      <div className="wallet-options-tabs">
        <button 
          className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import Wallet
        </button>
        <button 
          className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create New Wallet
        </button>
      </div>

      <div className="wallet-options-content">
        {activeTab === 'import' ? (
          <ImportWallet onConfirm={() => setIsConfirming(true)} />
        ) : (
          <CreateWallet onConfirm={() => setIsConfirming(true)} />
        )}
      </div>
    </div>
  );
}