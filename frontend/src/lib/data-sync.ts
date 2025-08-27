import { Connection, PublicKey } from "@solana/web3.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase"; // Your Firebase config
import { getProgramAccounts } from "./anchorHelpers";
import { Campaign, CampaignWrite } from "@/types/campaign";
import { Transaction, TransactionType, TransactionWrite } from "@/types/transaction";
import { CampaignAccountWithTransactions } from "@/types/accountSchema";
import { convertToCampaign, getAllCampaigns, getAllTransactions } from "./firebaseHelpers";
import { CAMPAIGN_COLLECTION, TRANSACTION_COLLECTION, USER_COLLECTION } from "@/utils/db_constants";



// Sync all campaigns and transactions
export const syncCampaignsWithFirebase = async () => {
  try {
    console.log("Starting Firebase sync...");

    // Get all campaigns from Solana program
    const solanaCampaigns = await getProgramAccounts();

    if (!solanaCampaigns || solanaCampaigns.length === 0) {
      console.log("No campaigns found on Solana");
      return;
    }

    console.log(`Found ${solanaCampaigns.length} campaigns on Solana`);

    // Get existing campaigns from Firebase for comparison
    const firebaseCampaigns = await getAllCampaigns();
    const firebaseCampaignsMap = new Map(
      firebaseCampaigns.map(camp => [camp.campaign_wallet_key, camp])
    );

    // Get existing transactions from Firebase for comparison
    const firebaseTransactions = await getAllTransactions();
    const firebaseTransactionsMap = new Map(
      firebaseTransactions.map(tx => [tx.tx_hash, tx])
    );

    // Sync campaigns
    const campaignSyncResults = await syncCampaigns(
      solanaCampaigns,
      firebaseCampaignsMap
    );

    // Sync transactions
    const transactionSyncResults = await syncTransactions(
      solanaCampaigns,
      firebaseTransactionsMap
    );

    console.log("Sync completed:", {
      campaigns: {
        total: solanaCampaigns.length,
        created: campaignSyncResults.created,
        updated: campaignSyncResults.updated,
        skipped: campaignSyncResults.skipped
      },
      transactions: {
        total: transactionSyncResults.total,
        created: transactionSyncResults.created,
        skipped: transactionSyncResults.skipped
      }
    });

    return {
      campaigns: campaignSyncResults,
      transactions: transactionSyncResults
    };

  } catch (error) {
    console.error("Error syncing with Firebase:", error);
    throw error;
  }
};



// Sync campaigns between Solana and Firebase
const syncCampaigns = async (
  solanaCampaigns: CampaignAccountWithTransactions[],
  firebaseCampaignsMap: Map<string, Campaign>
) => {
  const batch = writeBatch(db);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const solanaCampaign of solanaCampaigns) {
    const campaignKey = solanaCampaign.campaign.campaign_wallet_key;
    const firebaseCampaign = firebaseCampaignsMap.get(campaignKey);

    // Convert Solana campaign to Firebase format
    const campaignData: Omit<CampaignWrite, "timestamp"> = {
      campaign_wallet_key: campaignKey,
      author: solanaCampaign.campaign.author,
      title: solanaCampaign.campaign.title,
      description: solanaCampaign.campaign.description,
      target_amount: solanaCampaign.campaign.target_amount,
      current_amount: solanaCampaign.campaign.current_amount,
      locked: solanaCampaign.campaign.locked,
      likes: solanaCampaign.campaign.likes,
      dislikes: solanaCampaign.campaign.dislikes,
      closed: solanaCampaign.campaign.closed,
      category: solanaCampaign.campaign.category,
      image_url: solanaCampaign.campaign.image_url,
      contributors_count: solanaCampaign.campaign.contributors_count,
      deadline: solanaCampaign.campaign.deadline,
      tags: solanaCampaign.campaign.tags,
      updates: solanaCampaign.campaign.updates,
      tx_hash: solanaCampaign.campaign.tx_hash
    };

    const campaignRef = doc(collection(db, CAMPAIGN_COLLECTION), campaignKey);

    if (!firebaseCampaign) {
      console.log(`Creating new campaign in Firebase: ${campaignKey}`);
      // Campaign doesn't exist in Firebase - create it
      batch.set(campaignRef, {
        ...campaignData,
        timestamp: serverTimestamp()
      });
      created++;

      // Also create a campaign creation transaction
      const txRef = doc(collection(db, TRANSACTION_COLLECTION), solanaCampaign.campaign.tx_hash);
      batch.set(txRef, {
        amount: 0,
        type: TransactionType.CAMPAIGN_CREATED,
        campaign_id: campaignKey,
        user_id: solanaCampaign.campaign.author,
        description: `Created campaign: ${solanaCampaign.campaign.title}`,
        tx_hash: solanaCampaign.campaign.tx_hash,
        status: 'completed',
        date: serverTimestamp()
      });

    } else {
      console.log(`Checking for updates to campaign: ${campaignKey}`);
      // Campaign exists - check if it needs updating
      const needsUpdate = checkCampaignNeedsUpdate(campaignData, firebaseCampaign);

      if (needsUpdate) {
        try {
          // batch.update(campaignRef, {
          //   ...campaignData,
          //   // Don't update timestamp on updates, only on creation
          // });
          // updated++;
        } catch (error) {
          console.log(`Error updating campaign: ${campaignKey}`, error);
        }
      } else {
        skipped++;
      }
    }
  }

  // Commit all campaign changes
  if (created > 0 || updated > 0) {
    await batch.commit();
  }

  return { created, updated, skipped };
};

// Check if a campaign needs to be updated in Firebase
const checkCampaignNeedsUpdate = (
  solanaCampaign: Omit<CampaignWrite, "timestamp">,
  firebaseCampaign: Campaign
): boolean => {
  // Compare critical fields that might change
  const fieldsToCheck: (keyof Omit<CampaignWrite, "timestamp">)[] = [
    'current_amount', 'locked',
    'contributors_count'
  ];

  return fieldsToCheck.some(field =>
    solanaCampaign[field] !== firebaseCampaign[field]
  );
};

// Sync transactions between Solana and Firebase
const syncTransactions = async (
  solanaCampaigns: CampaignAccountWithTransactions[],
  firebaseTransactionsMap: Map<string, Transaction>
) => {
  const batch = writeBatch(db);
  let created = 0;
  let skipped = 0;
  let totalTransactions = 0;

  for (const solanaCampaign of solanaCampaigns) {
    const campaignKey = solanaCampaign.campaign.campaign_wallet_key;

    for (const solanaTx of solanaCampaign.transactions) {
      totalTransactions++;

      // Create a unique key for this transaction
      const txKey = solanaTx.signature;
      const firebaseTx = firebaseTransactionsMap.get(txKey);

      // updateUserTotalContributions
      await updateUserTotalContributions(solanaTx.from);

      if (!firebaseTx) {
        // Transaction doesn't exist in Firebase - create it
        const txData: Omit<TransactionWrite, "date"> = {
          amount: solanaTx.lamports,
          type: TransactionType.CONTRIBUTION,
          campaign_id: campaignKey,
          user_id: solanaTx.from,
          recipient_user_id: solanaTx.to,
          description: `Contribution to campaign: ${solanaCampaign.campaign.title}`,
          tx_hash: txKey,
          status: 'completed'
        };

        const txRef = doc(collection(db, TRANSACTION_COLLECTION), txKey);
        batch.set(txRef, {
          ...txData,
          date: serverTimestamp()
        });

        created++;
      } else {
        skipped++;
      }
    }
  }

  // Commit all transaction changes
  if (created > 0) {
    await batch.commit();
  }

  return { total: totalTransactions, created, skipped };
};

// Update the contributors user account total contributions
export const updateUserTotalContributions = async (userId: string) => {
  try {
    // Query all transactions where user is the contributor
    const txQuery = query(
      collection(db, TRANSACTION_COLLECTION),
      where("user_id", "==", userId),
      where("type", "==", TransactionType.CONTRIBUTION)
    );

    const txSnapshot = await getDocs(txQuery);
    let totalContributed = 0;

    txSnapshot.forEach(doc => {
      const txData = doc.data() as Transaction;
      totalContributed += txData.amount || 0;
    });

    // Update user's total contributions in their profile
    const userRef = doc(db, USER_COLLECTION, userId);
    await setDoc(userRef, { total_contributed: totalContributed }, { merge: true });

    console.log(`Updated total contributions for user ${userId}: ${totalContributed}`);
    return totalContributed;

  } catch (error) {
    console.error("Error updating user total contributions:", error);
    throw error;
  }
};

