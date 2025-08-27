// src/utils/converters.ts
import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// export const LAMPORTS_PER_SOL = 1000000000;

// Convert SOL to BN (lamports)
export const solToBN = (solAmount: number): BN => {
  const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);
  return new BN(lamports);
};

export const lamportsToSol = (lamports: number | bigint): number => {
  return Number(lamports) / LAMPORTS_PER_SOL;
};
 
// Convert BN (lamports) back to SOL
export const bnToSol = (bnAmount: BN): number => {
  return bnAmount.toNumber() / LAMPORTS_PER_SOL;
};

// Convert number to BN (for whole numbers)
export const numberToBN = (value: number): BN => {
  return new BN(value);
};



// Convert BN to number
export const bnToNumber = (bnValue: BN): number => {
  return bnValue.toNumber();
};

// Safe conversion with error handling
export const safeNumberToBN = (value: number | string): BN => {
  try {
    if (typeof value === 'string') {
      // Handle string input
      const numValue = parseFloat(value);
      if (isNaN(numValue)) throw new Error('Invalid number');
      return new BN(Math.round(numValue));
    }
    return new BN(Math.round(value));
  } catch (error) {
    console.error('Error converting to BN:', error);
    return new BN(0);
  }
};