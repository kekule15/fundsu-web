// components/ConfirmSeedPhrase.tsx
"use client";

import React, { useState } from 'react';
import "../styles/ConfirmSeedPhrase.css";
import { useWalletGeneration } from '@/context/WalletGenerationContext';

interface ConfirmSeedPhraseProps {
  onBack: () => void;
}

export default function ConfirmSeedPhrase({ onBack }: ConfirmSeedPhraseProps) {
  const [confirmationWords, setConfirmationWords] = useState<{index: number, word: string}[]>([]);
  const [error, setError] = useState('');
  const { seedPhrase, restoreFromSeedPhrase } = useWalletGeneration();

  // Select 3 random words to verify
  const verificationIndexes = React.useMemo(() => {
    const indexes: number[] = [];
    while (indexes.length < 3) {
      const randomIndex = Math.floor(Math.random() * 12);
      if (!indexes.includes(randomIndex)) {
        indexes.push(randomIndex);
      }
    }
    return indexes.sort((a, b) => a - b);
  }, [seedPhrase]);

  const handleWordChange = (index: number, word: string) => {
    const newConfirmationWords = confirmationWords.filter(cw => cw.index !== index);
    newConfirmationWords.push({ index, word });
    setConfirmationWords(newConfirmationWords);
  };

  const handleVerification = async () => {
    setError('');
    
    // Check if all verification words are entered
    if (confirmationWords.length !== 3) {
      setError('Please enter all verification words');
      return;
    }

    // Verify each word
    for (const { index, word } of confirmationWords) {
      if (seedPhrase[index] !== word.trim().toLowerCase()) {
        setError(`Word at position ${index + 1} is incorrect`);
        return;
      }
    }

    // If all words are correct, restore the wallet
    try {
      await restoreFromSeedPhrase(seedPhrase);
    } catch (err) {
      setError('Failed to restore wallet. Please try again.');
    }
  };

  return (
    <div className="confirm-seed-phrase">
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>

      <h2>Verify Your Seed Phrase</h2>
      <p>Please enter the following words from your seed phrase to confirm you've saved it correctly:</p>

      <div className="verification-words">
        {verificationIndexes.map(index => (
          <div key={index} className="verification-word-input">
            <label>Word #{index + 1}</label>
            <input
              type="text"
              value={confirmationWords.find(cw => cw.index === index)?.word || ''}
              onChange={(e) => handleWordChange(index, e.target.value)}
              placeholder={`Enter word #${index + 1}`}
            />
          </div>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}

      <button className="verify-button" onClick={handleVerification}>
        Verify and Connect Wallet
      </button>
    </div>
  );
}