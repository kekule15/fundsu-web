// src/lib/firebaseHelpers.ts
import {
    doc,
    setDoc,
    updateDoc,
    arrayUnion,
    increment,
    serverTimestamp,
    collection,
    getDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs
} from "firebase/firestore";
import { db } from "./firebase";
import { TransactionWrite, TransactionType, Transaction } from "@/types/transaction";
import { Campaign, CampaignWrite } from "@/types/campaign";
import { CAMPAIGN_COLLECTION, TRANSACTION_COLLECTION, USER_COLLECTION } from "@/utils/db_constants";
import { UserProfile } from "@/types/user";



// Helper function to convert Firestore data to UserProfile
export const convertToUserProfile = (id: string, data: any): UserProfile => {
    return {
        ...data,
        id, // Ensure the id is set to the document ID
        date_created: data.date_created?.toMillis
            ? Math.floor(data.date_created.toMillis() / 1000)
            : data.date_created || Math.floor(Date.now() / 1000),
    };
};


// Get all campaigns
export const getAllCampaigns = async (): Promise<Campaign[]> => {
    try {
        const campaignsRef = collection(db, CAMPAIGN_COLLECTION);
        const q = query(campaignsRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const campaigns: Campaign[] = [];

        querySnapshot.forEach((doc) => {
            campaigns.push(convertToCampaign(doc.id, doc.data()));
        });

        return campaigns;
    } catch (error) {
        console.error("Error getting all campaigns:", error);
        throw error;
    }
};

// Get campaign by ID
export const getCampaign = async (campaignId: string) : Promise<Campaign | null> =>{
    try {
        const campaignRef = doc(db, CAMPAIGN_COLLECTION, campaignId);
        const docSnap = await getDoc(campaignRef);

        if (docSnap.exists()) {
            return convertToCampaign(docSnap.id, docSnap.data());
        }
        return null;
    } catch (error) {
        console.error("Error getting campaign:", error);
        throw error;
    }
};

// Helper function to convert Firestore data to Campaign
export const convertToCampaign = (id: string, data: any): Campaign => {
    return {
        ...data,
        id,
        timestamp: data.timestamp?.toMillis
            ? Math.floor(data.timestamp.toMillis() / 1000)
            : data.timestamp || Math.floor(Date.now() / 1000)
    };
};

// Convert Firestore data to Transaction
export const convertToTransaction = (id: string, data: any): Transaction & { id: string } => {
    return {
        id,
        ...data,
        date: data.date?.toMillis
            ? Math.floor(data.date.toMillis() / 1000)
            : data.date || Math.floor(Date.now() / 1000)
    };
};

// Update the createCampaignInFirestore function
export const createCampaignInFirestore = async (campaignData: Omit<CampaignWrite, "timestamp">, userId: string) => {
    try {
        const campaignRef = doc(collection(db, CAMPAIGN_COLLECTION), campaignData.campaign_wallet_key);
        await setDoc(campaignRef, {
            ...campaignData,
            timestamp: serverTimestamp(),
        });

        // Create transaction record for campaign creation
        await createCampaignCreatedTransaction(userId, campaignData.campaign_wallet_key, campaignData.tx_hash, campaignData.title);

        return campaignRef.id;
    } catch (error) {
        console.error("Error creating campaign in Firestore:", error);
        throw error;
    }
};

// Update the updateCampaignContribution function
export const updateCampaignContribution = async (
    campaignId: string,
    docId: string,
    amount: number,
    contributor: string,
    txHash: string,
    campaignTitle: string,
    recipientUserId?: string
) => {
    try {
        const campaignRef = doc(db, CAMPAIGN_COLLECTION, docId);
        const userRef = doc(db, USER_COLLECTION, contributor);

        // fetch current campaign snapshot
        const campaignSnap = await getDoc(campaignRef);
        if (!campaignSnap.exists()) {
            throw new Error("Campaign not found");
        }

        const campaign = convertToCampaign(campaignSnap.id, campaignSnap.data());

        const newAmount = (campaign.current_amount ?? 0) + amount;
        const newLocked = newAmount < campaign.target_amount; // still locked until target is met

        await updateDoc(campaignRef, {
            current_amount: increment(amount),
            contributors_count: increment(1),
            locked: newLocked,
        });

        await updateDoc(userRef, {
            campaigns_contributed: arrayUnion(docId),
            total_contributions: increment(amount),
        });


        // Create transaction record for contribution
        await createContributionTransaction(contributor, campaignId, amount, txHash, campaignTitle, recipientUserId);
    } catch (error) {
        console.error("Error updating campaign contribution:", error);
        throw error;
    }
};

// Update the updateCampaignWithdrawal function
export const updateCampaignWithdrawal = async (
    campaignId: string,
    amountWithdrawn: number,
    userId: string,
    txHash: string,
    title: string
) => {
    try {
        const campaignRef = doc(db, CAMPAIGN_COLLECTION, campaignId);

        await updateDoc(campaignRef, {
            closed: true,
        });

        // Create transaction record for campaign closure/withdrawal
        await createWithdrawTransaction(userId, campaignId, amountWithdrawn, txHash, title);
    } catch (error) {
        console.error("Error updating campaign withdrawal:", error);
        throw error;
    }
};

// Create a new transaction
export const createTransaction = async (transactionData: Omit<TransactionWrite, 'date'>) => {
    try {
        const transactionsRef = collection(db, TRANSACTION_COLLECTION);
        const transactionDoc = doc(transactionsRef, transactionData.tx_hash); // Use tx_hash as document ID

        await setDoc(transactionDoc, {
            ...transactionData,
            date: serverTimestamp()
        });

        return transactionDoc.id;
    } catch (error) {
        console.error("Error creating transaction:", error);
        throw error;
    }
};

// Get transactions for a specific user
export const getUserTransactions = (userId: string, callback: (transactions: any[]) => void) => {
    const transactionsRef = collection(db, TRANSACTION_COLLECTION);
    const q = query(
        transactionsRef,
        where("user_id", "==", userId),
        orderBy("date", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(transactions);
    });
};

// Get transactions for a specific campaign
export const getCampaignTransactions = (campaignId: string, callback: (transactions: any[]) => void) => {
    const transactionsRef = collection(db, TRANSACTION_COLLECTION);
    const q = query(
        transactionsRef,
        where("campaign_id", "==", campaignId),
        orderBy("date", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(transactions);
    });
};

// Specific transaction creation helpers
export const createContributionTransaction = async (
    userId: string,
    campaignId: string,
    amount: number,
    txHash: string,
    campaignTitle: string,
    recipientUserId?: string,
    
) => {
    return createTransaction({
        amount,
        type: TransactionType.CONTRIBUTION,
        campaign_id: campaignId,
        user_id: userId,
        recipient_user_id: recipientUserId, // Campaign owner will be handled separately if needed
        tx_hash: txHash,

        status: 'completed',
        description: `Contribution to campaign: ${campaignTitle}`
    });
};

export const createCampaignCreatedTransaction = async (
    userId: string,
    campaignId: string,
    tx: string,
    campaignTitle: string,
) => {
    return createTransaction({
        amount: 0, // No amount for creation
        type: TransactionType.CAMPAIGN_CREATED,
        campaign_id: campaignId,
        user_id: userId,
        description: `Created campaign: ${campaignTitle}`,
        tx_hash: tx,
    });
};

export const createDepositTransaction = async (
    userId: string,
    amount: number,
    txHash: string
) => {
    return createTransaction({
        amount,
        type: TransactionType.DEPOSIT,
        user_id: userId,
        tx_hash: txHash,
        status: 'completed',
        description: `Deposit to wallet`
    });
};

export const createWithdrawTransaction = async (
    userId: string,
    campaignId: string,
    amount: number,
    txHash: string,
    campaignTitle: string,
) => {
    return createTransaction({
        amount,
        type: TransactionType.WITHDRAW,
        user_id: userId,
        campaign_id: campaignId,
        tx_hash: txHash,
        status: 'completed',
        description: `Withdrawal from ${campaignTitle} campaign`
    });
};

export const createTransferTransaction = async (
    fromUserId: string,
    toUserId: string,
    amount: number,
    txHash: string
) => {
    return createTransaction({
        amount,
        type: TransactionType.TRANSFER,
        user_id: fromUserId,
        recipient_user_id: toUserId,
        tx_hash: txHash,
        status: 'completed',
        description: `Transfer to ${toUserId.slice(0, 8)}...`
    });
};

export const createCampaignClosedTransaction = async (
    userId: string,
    campaignId: string,
    amountWithdrawn: number,
    txHash: string,
    title: string
) => {
    return createTransaction({
        amount: amountWithdrawn,
        type: TransactionType.CAMPAIGN_CLOSED,
        campaign_id: campaignId,
        user_id: userId,
        tx_hash: txHash,
        status: 'completed',
        description: `${title} Campaign closed and funds withdrawn`
    });
};

// Get all transactions
export const getAllTransactions = async (): Promise<Transaction[]> => {
    try {
        const transactionsRef = collection(db, TRANSACTION_COLLECTION);
        const q = query(transactionsRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const transactions: Transaction[] = [];

         querySnapshot.forEach((doc) => {
            transactions.push(convertToTransaction(doc.id, doc.data()));
        });

        return transactions;
    } catch (error) {
        console.error("Error getting all transactions:", error);
        throw error;
    }
}