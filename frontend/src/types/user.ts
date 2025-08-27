// src/types/user.ts
import { FieldValue } from 'firebase/firestore';
export interface UserProfileWrite {
  id: string; // Firebase document ID 
  wallet_address: string;
  name: string;
  date_created: FieldValue | number; 
  profile_url: string;
  wallet_balance: number;
  // Additional suggested fields
  bio?: string;
  website?: string;
  social_links?: {
    twitter?: string;
    github?: string;
    discord?: string;
  };
  campaigns_created?: string[]; // Array of campaign IDs
  campaigns_contributed?: string[]; // Array of campaign IDs
  total_contributions?: number;
  reputation_score?: number;
  notifications_enabled?: boolean;
  email?: string; // Optional, if you want to collect emails
  verified?: boolean; // Whether the user's identity is verified
}

export interface UserProfile extends Omit<UserProfileWrite, 'date_created'> {
  date_created: number; // Always a number when reading
}