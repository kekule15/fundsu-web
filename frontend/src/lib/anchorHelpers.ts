// src/lib/anchorHelpers.ts (add these functions)
import * as anchor from "@coral-xyz/anchor";
import {
  CampaignInitializedEvent,
  CampaignContributedEvent,
  CampaignWithdrawnEvent,
  CampaignClosedEvent,
  CampaignEventType
} from "@/types/anchor_events";
import { BN } from "@coral-xyz/anchor";
import { serverTimestamp } from "firebase/firestore";
import { CampaignWrite } from "@/types/campaign";
import idl from "../types/idl/fundsu_campaigns.json";

import {
  Connection,
  PublicKey,
  SystemProgram,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction
} from "@solana/web3.js";
import { CampaignAccountWithTransactions, ContributionTx } from "@/types/accountSchema";
// Helper to parse event data based on event type
export const parseCampaignEvent = (event: any, eventName: string): any => {
  switch (eventName) {
    case CampaignEventType.CampaignInitialized:
      return {
        campaign: new anchor.web3.PublicKey(event.campaign),
        author: new anchor.web3.PublicKey(event.author),
        title: event.title,
        description: event.description,
        target_amount: new anchor.BN(event.target_amount),
        timestamp: new anchor.BN(event.timestamp)
      } as CampaignInitializedEvent;

    case CampaignEventType.CampaignContributed:
      return {
        campaign: new anchor.web3.PublicKey(event.campaign),
        contributor: new anchor.web3.PublicKey(event.contributor),
        amount: new anchor.BN(event.amount),
        new_total: new anchor.BN(event.new_total),
        timestamp: new anchor.BN(event.timestamp)
      } as CampaignContributedEvent;

    case CampaignEventType.CampaignWithdrawn:
      return {
        campaign: new anchor.web3.PublicKey(event.campaign),
        author: new anchor.web3.PublicKey(event.author),
        recipient: new anchor.web3.PublicKey(event.recipient),
        amount_withdrawn: new anchor.BN(event.amount_withdrawn),
        timestamp: new anchor.BN(event.timestamp)
      } as CampaignWithdrawnEvent;

    case CampaignEventType.CampaignClosed:
      return {
        campaign: new anchor.web3.PublicKey(event.campaign),
        author: new anchor.web3.PublicKey(event.author),
        amount_withdrawn: new anchor.BN(event.amount_withdrawn),
        timestamp: new anchor.BN(event.timestamp)
      } as CampaignClosedEvent;

    default:
      return event;
  }
};

// Subscribe to all campaign events
export const subscribeToAllCampaignEvents = (
  program: anchor.Program,
  eventHandlers: {
    onInitialized?: (event: CampaignInitializedEvent) => void;
    onContributed?: (event: CampaignContributedEvent) => void;
    onWithdrawn?: (event: CampaignWithdrawnEvent) => void;
    onClosed?: (event: CampaignClosedEvent) => void;
  }
): number[] => {
  const listeners: number[] = [];

  if (eventHandlers.onInitialized) {
    const listener = program.addEventListener(
      CampaignEventType.CampaignInitialized,
      (event: any) => {
        const parsedEvent = parseCampaignEvent(event, CampaignEventType.CampaignInitialized);
        eventHandlers.onInitialized!(parsedEvent);
      }
    );
    listeners.push(listener);
  }

  if (eventHandlers.onContributed) {
    const listener = program.addEventListener(
      CampaignEventType.CampaignContributed,
      (event: any) => {
        const parsedEvent = parseCampaignEvent(event, CampaignEventType.CampaignContributed);
        eventHandlers.onContributed!(parsedEvent);
      }
    );
    listeners.push(listener);
  }

  if (eventHandlers.onWithdrawn) {
    const listener = program.addEventListener(
      CampaignEventType.CampaignWithdrawn,
      (event: any) => {
        const parsedEvent = parseCampaignEvent(event, CampaignEventType.CampaignWithdrawn);
        eventHandlers.onWithdrawn!(parsedEvent);
      }
    );
    listeners.push(listener);
  }

  if (eventHandlers.onClosed) {
    const listener = program.addEventListener(
      CampaignEventType.CampaignClosed,
      (event: any) => {
        const parsedEvent = parseCampaignEvent(event, CampaignEventType.CampaignClosed);
        eventHandlers.onClosed!(parsedEvent);
      }
    );
    listeners.push(listener);
  }

  return listeners;
};


export function mapDecodedCampaign(pubkey: PublicKey, data: any, txHash: string, transactions: ContributionTx[]): CampaignAccountWithTransactions {
  return {
    campaign: {
      campaign_wallet_key: pubkey.toBase58(),
      author: data.author.toBase58(),
      title: data.title ?? "",
      description: data.description ?? "",
      target_amount: (data.targetAmount as BN).toNumber(),
      current_amount: (data.currentAmount as BN).toNumber(),
      locked: data.locked ?? false,
      likes: (data.likes as BN).toNumber(),
      dislikes: (data.dislikes as BN).toNumber(),

      // Off-chain defaults
      closed: false,
      timestamp: serverTimestamp(),
      category: "",
      image_url: "",
      contributors_count: transactions.length,
      deadline: 0,
      tags: [],
      updates: [],
      tx_hash: txHash,
    },
    transactions: transactions
  };
}


/**
 * Fetch contribution (lamport transfer -> campaignPda) transactions.
 *
 * - connection: Connection instance
 * - campaignPubkey: PublicKey of campaign PDA
 * - opts.limit: number of signatures to fetch (use pagination if you need older history)
 */


export enum ProgramTransactionType {
  CONTRIBUTION = 'contribution',
  WITHDRAWAL = 'withdrawal',
  OTHER = 'other'
}




export async function fetchCampaignContributions(
  connection: Connection,
  campaignPubkey: PublicKey,
  opts?: { limit?: number; before?: string; until?: string }
): Promise<ContributionTx[]> {
  const limit = opts?.limit ?? 200;
  const campaignAddress = campaignPubkey.toBase58();

  try {
    // 1) Fetch signatures that touched the campaign PDA
    const sigInfos = await connection.getSignaturesForAddress(campaignPubkey, {
      limit,
      before: opts?.before,
      until: opts?.until
    });

    if (!sigInfos || sigInfos.length === 0) {
      console.log(`No signatures found for campaign: ${campaignAddress}`);
      return [];
    }

    // 2) Fetch parsed transactions in batches to avoid rate limiting
    const BATCH_SIZE = 10;
    const parsedTxs: (ParsedTransactionWithMeta | null)[] = [];

    for (let i = 0; i < sigInfos.length; i += BATCH_SIZE) {
      const batch = sigInfos.slice(i, i + BATCH_SIZE);
      const batchTxs = await Promise.all(
        batch.map(sig =>
          connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
          }).catch(err => {
            console.warn(`Failed to fetch transaction ${sig.signature}:`, err.message);
            return null;
          })
        )
      );
      parsedTxs.push(...batchTxs);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const transactions: ContributionTx[] = [];

    // Helper to inspect a parsed instruction object
    function inspectParsedInstruction(
      instr: any,
      sig: string,
      slot: number | undefined,
      blockTime: number | null,
      isInner: boolean,
      instructionIndex?: number,
      parentProgram?: string
    ) {
      try {
        const parsed = instr?.parsed;
        const program = instr?.program;

        // Check for system program transfers (contributions AND withdrawals)
        if (parsed && parsed.type === "transfer" && program === "system") {
          const info = parsed.info;

          // CONTRIBUTION: Funds going TO the campaign
          if (info.destination === campaignAddress) {
            transactions.push({
              signature: sig,
              slot: slot ?? 0,
              blockTime,
              from: info.source,
              to: info.destination,
              lamports: Number(info.lamports),
              isInner,
              instructionIndex,
              parentProgram: isInner ? parentProgram : program,
              type: ProgramTransactionType.CONTRIBUTION
            });
          }

          // WITHDRAWAL: Funds coming FROM the campaign
          if (info.source === campaignAddress) {
            transactions.push({
              signature: sig,
              slot: slot ?? 0,
              blockTime,
              from: info.source,
              to: info.destination,
              lamports: Number(info.lamports),
              isInner,
              instructionIndex,
              parentProgram: isInner ? parentProgram : program,
              type: ProgramTransactionType.WITHDRAWAL
            });
          }
        }

        // Check for memo instructions that might indicate transaction purpose
        if (program === "spl-memo" && parsed && typeof parsed === "string") {
          const memo = parsed;
          // Associate memo with the most recent transaction if found
          const lastTransaction = transactions[transactions.length - 1];
          if (lastTransaction && lastTransaction.signature === sig) {
            lastTransaction.memo = memo;
          }
        }
      } catch (error) {
        console.warn("Error inspecting instruction:", error);
      }
    }

    // Process each transaction
    for (let i = 0; i < parsedTxs.length; i++) {
      const tx = parsedTxs[i];
      const sigInfo = sigInfos[i];

      if (!tx || !sigInfo) continue;

      const sig = sigInfo.signature;
      const slot = tx.slot ?? sigInfo.slot;
      const blockTime = tx.blockTime ?? null;

      // Skip failed transactions
      if (tx.meta?.err) {
        continue;
      }

      // Get all instructions (including inner instructions)
      const instructions = tx.transaction?.message?.instructions ?? [];

      // Process top-level instructions
      instructions.forEach((instr, idx) => {
        inspectParsedInstruction(instr, sig, slot, blockTime, false, idx);
      });

      // Process inner instructions (CPI calls)
      const innerInstructions = tx.meta?.innerInstructions ?? [];
      for (const innerBlock of innerInstructions) {
        const parentIndex = innerBlock.index;
        const parentInstr = instructions[parentIndex];
        const parentProgram = parentInstr?.programId;

        innerBlock.instructions.forEach((instr, innerIdx) => {
          inspectParsedInstruction(instr, sig, slot, blockTime, true, parentIndex, parentProgram.toBase58());
        });
      }

      // Fallback: Use balance changes if no parsed instructions found
      if (transactions.filter(t => t.signature === sig).length === 0) {
        await processBalanceChanges(tx, sig, slot, blockTime, campaignAddress, transactions);
      }
    }

    // Filter out potential false positives
    const filteredTransactions = transactions.filter(transaction => {
      // Filter out very small amounts that might be rent or other system operations
      if (transaction.lamports < 1000) {
        return false;
      }

      // For withdrawals, we need additional checks to ensure they're legitimate
      if (transaction.type === ProgramTransactionType.WITHDRAWAL) {
        // Add additional validation for withdrawals if needed
        // For example, check if the withdrawal matches expected patterns
        return isValidWithdrawal(transaction, campaignAddress);
      }

      return true;
    });

    // Deduplicate and sort
    const uniqueTransactions = deduplicateContributions(filteredTransactions);
    uniqueTransactions.sort((a, b) => (a.blockTime ?? 0) - (b.blockTime ?? 0));

    return uniqueTransactions;
  } catch (error) {
    console.error("Error fetching campaign transactions:", error);
    throw error;
  }
}

// Helper function to validate withdrawals
function isValidWithdrawal(transaction: ContributionTx, campaignAddress: string): boolean {
  // Withdrawals should be FROM the campaign
  if (transaction.from !== campaignAddress) {
    return false;
  }

  // Additional validation logic can be added here
  // For example, check if the recipient is the expected author
  // or if the amount matches expected patterns

  return true;
}

// Enhanced balance change processor
async function processBalanceChanges(
  tx: ParsedTransactionWithMeta,
  signature: string,
  slot: number | undefined,
  blockTime: number | null,
  campaignAddress: string,
  transactions: ContributionTx[]
): Promise<void> {
  try {
    const preBalances = tx.meta?.preBalances;
    const postBalances = tx.meta?.postBalances;
    const accountKeys = tx.transaction?.message?.accountKeys ?? [];

    if (!preBalances || !postBalances || accountKeys.length === 0) return;

    // Find the campaign account index
    const campaignIndex = accountKeys.findIndex(acc =>
      (typeof acc === 'string' ? acc : acc.pubkey.toBase58()) === campaignAddress
    );

    if (campaignIndex < 0) return;

    const campaignDelta = postBalances[campaignIndex] - preBalances[campaignIndex];

    // CONTRIBUTION: Positive balance change to campaign
    if (campaignDelta > 0) {
      // Find accounts with matching negative balance changes
      const possibleSenders = findMatchingSenders(preBalances, postBalances, campaignDelta);

      if (possibleSenders.length > 0) {
        const senderIndex = possibleSenders[0].index;
        const senderAddress = getAccountAddress(accountKeys[senderIndex]);

        transactions.push({
          signature,
          slot: slot ?? 0,
          blockTime,
          from: senderAddress,
          to: campaignAddress,
          lamports: campaignDelta,
          isInner: false,
          instructionIndex: undefined,
          type: ProgramTransactionType.CONTRIBUTION
        });
      }
    }
    // WITHDRAWAL: Negative balance change from campaign
    else if (campaignDelta < 0) {
      const withdrawalAmount = Math.abs(campaignDelta);

      // Find accounts with matching positive balance changes
      const possibleRecipients = findMatchingRecipients(preBalances, postBalances, withdrawalAmount);

      if (possibleRecipients.length > 0) {
        const recipientIndex = possibleRecipients[0].index;
        const recipientAddress = getAccountAddress(accountKeys[recipientIndex]);

        transactions.push({
          signature,
          slot: slot ?? 0,
          blockTime,
          from: campaignAddress,
          to: recipientAddress,
          lamports: withdrawalAmount,
          isInner: false,
          instructionIndex: undefined,
          type: ProgramTransactionType.WITHDRAWAL
        });
      }
    }
  } catch (error) {
    console.warn("Error processing balance changes:", error);
  }
}

// Helper to find matching senders for contributions
function findMatchingSenders(
  preBalances: number[],
  postBalances: number[],
  campaignDelta: number
): { index: number, amount: number }[] {
  const possibleSenders: { index: number, amount: number }[] = [];

  for (let i = 0; i < preBalances.length; i++) {
    const delta = postBalances[i] - preBalances[i];
    // Look for accounts that decreased by approximately the campaign increase amount
    if (delta < 0 && Math.abs(delta + campaignDelta) < 10000) {
      possibleSenders.push({ index: i, amount: Math.abs(delta) });
    }
  }

  return possibleSenders.sort((a, b) => b.amount - a.amount);
}

// Helper to find matching recipients for withdrawals
function findMatchingRecipients(
  preBalances: number[],
  postBalances: number[],
  withdrawalAmount: number
): { index: number, amount: number }[] {
  const possibleRecipients: { index: number, amount: number }[] = [];

  for (let i = 0; i < preBalances.length; i++) {
    const delta = postBalances[i] - preBalances[i];
    // Look for accounts that increased by approximately the campaign decrease amount
    if (delta > 0 && Math.abs(delta - withdrawalAmount) < 10000) {
      possibleRecipients.push({ index: i, amount: delta });
    }
  }

  return possibleRecipients.sort((a, b) => b.amount - a.amount);
}

// Helper to get account address
function getAccountAddress(account: any): string {
  return typeof account === 'string' ? account : account.toBase58();
}

// Helper function to process balance changes as fallback
// async function processBalanceChanges(
//   tx: ParsedTransactionWithMeta,
//   signature: string,
//   slot: number | undefined,
//   blockTime: number | null,
//   campaignAddress: string,
//   contributions: ContributionTx[]
// ): Promise<void> {
//   try {
//     const preBalances = tx.meta?.preBalances;
//     const postBalances = tx.meta?.postBalances;
//     const accountKeys = tx.transaction?.message?.accountKeys ?? [];

//     if (!preBalances || !postBalances || accountKeys.length === 0) return;

//     // Find the campaign account index
//     const campaignIndex = accountKeys.findIndex(acc =>
//       (typeof acc === 'string' ? acc : acc.pubkey.toBase58()) === campaignAddress
//     );

//     if (campaignIndex < 0) return;

//     const campaignDelta = postBalances[campaignIndex] - preBalances[campaignIndex];

//     // Only process positive balance changes to campaign
//     if (campaignDelta <= 0) return;

//     // Find accounts with matching negative balance changes
//     const possibleSenders: { index: number, amount: number }[] = [];

//     for (let i = 0; i < preBalances.length; i++) {
//       if (i === campaignIndex) continue;

//       const delta = postBalances[i] - preBalances[i];
//       // Look for accounts that decreased by approximately the campaign increase amount
//       // (accounting for possible transaction fees)
//       if (delta < 0 && Math.abs(delta + campaignDelta) < 10000) { // Allow for small differences
//         possibleSenders.push({ index: i, amount: Math.abs(delta) });
//       }
//     }

//     // Use the most likely sender (largest amount matching)
//     if (possibleSenders.length > 0) {
//       possibleSenders.sort((a, b) => b.amount - a.amount);
//       const senderIndex = possibleSenders[0].index;
//       const senderAddress = typeof accountKeys[senderIndex] === 'string'
//         ? accountKeys[senderIndex] as string
//         : (accountKeys[senderIndex].pubkey as PublicKey).toBase58();

//       contributions.push({
//         signature,
//         slot: slot ?? 0,
//         blockTime,
//         from: senderAddress,
//         to: campaignAddress,
//         lamports: campaignDelta,
//         isInner: false,
//         instructionIndex: undefined
//       });
//     }
//   } catch (error) {
//     console.warn("Error processing balance changes:", error);
//   }
// }

// Helper function to deduplicate contributions
function deduplicateContributions(contributions: ContributionTx[]): ContributionTx[] {
  const seen = new Set();

  return contributions.filter(contribution => {
    // Create a unique key for each contribution
    const key = `${contribution.signature}-${contribution.from}-${contribution.lamports}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

// Additional utility function to get contribution statistics
export async function getContributionStats(
  connection: Connection,
  campaignPubkey: PublicKey,
  opts?: { limit?: number }
): Promise<{
  totalContributions: number;
  totalAmount: number;
  uniqueContributors: number;
  averageContribution: number;
  largestContribution: number;
}> {
  const contributions = await fetchCampaignContributions(connection, campaignPubkey, opts);

  const contributors = new Set<string>();
  let totalAmount = 0;
  let largestContribution = 0;

  contributions.forEach(contribution => {
    contributors.add(contribution.from);
    totalAmount += contribution.lamports;

    if (contribution.lamports > largestContribution) {
      largestContribution = contribution.lamports;
    }
  });

  return {
    totalContributions: contributions.length,
    totalAmount,
    uniqueContributors: contributors.size,
    averageContribution: contributions.length > 0 ? totalAmount / contributions.length : 0,
    largestContribution
  };
}


// Enhanced version of your getProgramAccounts function
export const getProgramAccounts = async (): Promise<CampaignAccountWithTransactions[]> => {
  const connection = new Connection("https://api.devnet.solana.com");
  const PROGRAM_ID = new PublicKey("9ZtgtUtzDRraorcWZM7vSE7ydGhCJfhpMcV9hbTgLsRr");
  const provider = new anchor.AnchorProvider(connection, {} as any, {});
  anchor.setProvider(provider);

  const program = new anchor.Program(idl as anchor.Idl, provider);
  const accounts = await connection.getProgramAccounts(PROGRAM_ID);

  const grouped: Record<string, any[]> = {};
  const accountTypes = Object.keys(program.account);

  for (const acc of accounts) {
    let matched = false;

    for (const type of accountTypes) {
      try {
        const decoded = program.coder.accounts.decode(type, acc.account.data);
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push({ pubkey: acc.pubkey, data: decoded });
        matched = true;
        break;
      } catch { }
    }

    if (!matched) {
      if (!grouped["unknown"]) grouped["unknown"] = [];
      grouped["unknown"].push(acc);
    }
  }

  // Process only campaign accounts
  const campaignAccounts: CampaignAccountWithTransactions[] = await Promise.all(
    (grouped["campaign"] || []).map(async (acc) => {
      const signatures = await connection.getSignaturesForAddress(acc.pubkey, {
        limit: 100,
      });

      let txHash = "";
      if (signatures.length > 0) {
        txHash = signatures[signatures.length - 1].signature;
      }

      const transactions = await fetchCampaignContributions(
        connection,
        acc.pubkey,
        { limit: 100 }
      );

      return mapDecodedCampaign(acc.pubkey, acc.data, txHash, transactions);
    })
  );

  return campaignAccounts;
};