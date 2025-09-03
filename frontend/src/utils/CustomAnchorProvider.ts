// utils/CustomAnchorProvider.ts
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';
import { useWalletGeneration } from '@/context/WalletGenerationContext';

export const createCustomAnchorProvider = (
  connection: Connection,
  walletGeneration: ReturnType<typeof useWalletGeneration>
): AnchorProvider => {
  const wallet = {
    publicKey: walletGeneration.getPublicKey(),
    
    signTransaction: async <T extends Transaction | VersionedTransaction>(
      transaction: T
    ): Promise<T> => {
      return walletGeneration.signTransaction(transaction);
    },
    
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      transactions: T[]
    ): Promise<T[]> => {
      return walletGeneration.signAllTransactions(transactions);
    },
  };

  return new AnchorProvider(connection, wallet as any, {
    preflightCommitment: 'processed',
    commitment: 'confirmed',
  });
};
