// src/types/anchor.ts
import * as anchor from "@coral-xyz/anchor";

export interface CampaignAccount {
  author: anchor.web3.PublicKey;
  title: string;
  description: string;
  targetAmount: anchor.BN;
  currentAmount: anchor.BN;
  locked: boolean;
  likes: anchor.BN;
  dislikes: anchor.BN;
  bump: number;
}

export interface CampaignInitializedEvent {
  campaign: anchor.web3.PublicKey;
  author: anchor.web3.PublicKey;
  title: string;
  description: string;
  target_amount: anchor.BN; // u64 in Rust
  timestamp: anchor.BN; // i64 in Rust
}

export interface CampaignContributedEvent {
  campaign: anchor.web3.PublicKey;
  contributor: anchor.web3.PublicKey;
  amount: anchor.BN; // u64 in Rust
  new_total: anchor.BN; // u64 in Rust
  timestamp: anchor.BN; // i64 in Rust
}

export interface CampaignWithdrawnEvent {
  campaign: anchor.web3.PublicKey;
  author: anchor.web3.PublicKey;
  recipient: anchor.web3.PublicKey;
  amount_withdrawn: anchor.BN; // u64 in Rust
  timestamp: anchor.BN; // i64 in Rust
}

export interface CampaignClosedEvent {
  campaign: anchor.web3.PublicKey;
  author: anchor.web3.PublicKey;
  amount_withdrawn: anchor.BN; // u64 in Rust
  timestamp: anchor.BN; // i64 in Rust
}

// Union type for all possible events
export type CampaignEvent =
  | CampaignInitializedEvent
  | CampaignContributedEvent
  | CampaignWithdrawnEvent
  | CampaignClosedEvent;

// Event type discriminator
export enum CampaignEventType {
  CampaignInitialized = "CampaignInitialized",
  CampaignContributed = "CampaignContributed",
  CampaignWithdrawn = "CampaignWithdrawn",
  CampaignClosed = "CampaignClosed",
}