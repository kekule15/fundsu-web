// src/types/campaign.ts
import { FieldValue } from 'firebase/firestore';

export interface CampaignUpdate {
  timestamp: number;
  title: string;
  content: string;
  author: string;
}

// For write operations (when creating/updating documents)
export interface CampaignWrite {
  campaign_wallet_key: string;
  author: string; // Wallet address of the creator
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  locked: boolean;
  likes: number;
  dislikes: number;
  // from here, all fields are optional, and are stored offchain
  // in a separate Firestore collection
  // to avoid bloating the on-chain data
  // and incurring high transaction costs
  // These fields can be updated without on-chain transactions
  // and are not critical to the core functionality
  // but enhance the user experience
  // and provide additional context about the campaign
  closed: boolean;
  timestamp: FieldValue | number; // Accepts FieldValue for serverTimestamp()
  // Additional fields that might be useful:
  category?: string;
  image_url?: string;
  contributors_count?: number;
  deadline?: number; // Optional deadline timestamp
  tags?: string[];
  updates?: CampaignUpdate[];
  tx_hash: string;
}

// For read operations (when retrieving documents)
export interface Campaign extends Omit<CampaignWrite, 'timestamp'> {
  id: string; //  document public key
  timestamp: number; // Always a number when reading (converted from Firestore Timestamp)
}