// components/ImportWallet.tsx
"use client";

import React, { useState, useRef, ChangeEvent } from 'react';
import "../styles/ImportWallet.css";
import { useWalletGeneration } from '@/context/WalletGenerationContext';

interface ImportWalletProps {
  onConfirm: () => void;
}

export default function ImportWallet({ onConfirm }: ImportWalletProps) {
  const [seedPhrase, setSeedPhrase] = useState<string[]>(Array(12).fill(''));
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { restoreFromSeedPhrase } = useWalletGeneration();

  const handleInputChange = (index: number, value: string) => {
    const newSeedPhrase = [...seedPhrase];
    newSeedPhrase[index] = value;
    setSeedPhrase(newSeedPhrase);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        
        // Check if it's our generated file
        if (parsedData && parsedData.source === 'solana-wallet-app' && Array.isArray(parsedData.seedPhrase)) {
          setSeedPhrase(parsedData.seedPhrase);
          setIsUploading(false);
        } else {
          setError('Invalid wallet file format');
          setIsUploading(false);
        }
      } catch (err) {
        setError('Failed to read wallet file');
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setError('');
    try {
      if (seedPhrase.some(word => !word.trim())) {
        setError('Please fill in all seed phrase words');
        return;
      }

      await restoreFromSeedPhrase(seedPhrase);
      onConfirm();
    } catch (err) {
      setError('Invalid seed phrase. Please check your words and try again.');
    }
  };

  return (
    <div className="import-wallet">
      <div className="upload-section">
        <h3>Upload Wallet File</h3>
        <p>Select a wallet file previously exported from this platform</p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".txt,.json"
          style={{ display: 'none' }}
        />
        <button 
          className="upload-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Processing...' : 'Choose Wallet File'}
        </button>
      </div>

      <div className="divider">
        <span>OR</span>
      </div>

      <div className="manual-import">
        <h3>Enter Seed Phrase Manually</h3>
        <p>Enter your 12-word seed phrase in order</p>
        
        <div className="seed-phrase-grid">
          {seedPhrase.map((word, index) => (
            <div key={index} className="seed-word-input">
              <label>{index + 1}.</label>
              <input
                type="text"
                value={word}
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder={`Word ${index + 1}`}
              />
            </div>
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}

        <button className="import-button" onClick={handleImport}>
          Import Wallet
        </button>
      </div>
    </div>
  );
}