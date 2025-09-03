// components/CreateWallet.tsx
"use client";

import React, { useState } from 'react';
import "../styles/CreateWallet.css";
import { useWalletGeneration } from '@/context/WalletGenerationContext';

interface CreateWalletProps {
  onConfirm: () => void;
}

export default function CreateWallet({ onConfirm }: CreateWalletProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const { seedPhrase, generateNewSeedPhrase } = useWalletGeneration();

  React.useEffect(() => {
    if (seedPhrase.length === 0) {
      generateNewSeedPhrase();
    }
  }, [generateNewSeedPhrase, seedPhrase.length]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(seedPhrase.join(' '));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadSeedPhrase = () => {
    const data = {
      source: 'solana-wallet-app',
      seedPhrase,
      date: new Date().toISOString(),
      warning: 'Never share this file with anyone. Anyone with your seed phrase can access your funds.'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solana-wallet-backup-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setHasSaved(true);
  };

  return (
    <div className="create-wallet">
      <div className="warning-banner">
        <h3>Important Security Warning</h3>
        <p>
          Your seed phrase is the key to your wallet. Anyone with these words can access your funds.
          Never share it with anyone, and store it securely.
        </p>
      </div>

      <div className="seed-phrase-display">
        <h3>Your Seed Phrase</h3>
        <p>Write down these words in order and keep them somewhere safe:</p>
        
        <div className="seed-phrase-grid">
          {seedPhrase.map((word, index) => (
            <div key={index} className="seed-word">
              <span className="word-number">{index + 1}.</span>
              <span className="word-text">{word}</span>
            </div>
          ))}
        </div>

        <div className="seed-actions">
          <button className="copy-button" onClick={copyToClipboard}>
            {isCopied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button className="download-button" onClick={downloadSeedPhrase}>
            Download Backup File
          </button>
        </div>
      </div>

      <div className="confirmation-check">
        <label>
          <input 
            type="checkbox" 
            checked={hasSaved} 
            onChange={(e) => setHasSaved(e.target.checked)} 
          />
           I have saved my seed phrase in a secure location
        </label>
      </div>

      <button 
        className="continue-button" 
        onClick={onConfirm}
        disabled={!hasSaved}
      >
        Continue to Verification
      </button>
    </div>
  );
}