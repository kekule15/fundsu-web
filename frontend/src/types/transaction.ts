// src/types/transaction.ts
import { FieldValue } from 'firebase/firestore';

export enum TransactionType {
  CONTRIBUTION = 'contribution',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  CAMPAIGN_CREATED = 'campaign_created',
  CAMPAIGN_CLOSED = 'campaign_closed',
  TRANSFER = 'transfer',
  REFUND = 'refund',
  REWARD = 'reward',
  FEE = 'fee'
}

// For write operations
export interface TransactionWrite {
  amount: number;
  type: TransactionType;
  campaign_id?: string | null;
  user_id: string; // Wallet address of user who initiated the transaction
  recipient_user_id?: string | null; // Wallet address of recipient (if applicable)
  date: FieldValue | number;
  // Additional metadata
  tx_hash: string; // Blockchain transaction hash
  status?: 'pending' | 'completed' | 'failed';
  description?: string;
}

// For read operations
export interface Transaction extends Omit<TransactionWrite, 'date'> {
  id: string; // Firestore document ID
  date: number; // Unix timestamp
}