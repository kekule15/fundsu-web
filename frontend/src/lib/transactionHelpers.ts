// // src/lib/transactionHelpers.ts
// import { 
//   doc, 
//   setDoc, 
//   collection, 
//   query, 
//   where, 
//   orderBy,
//   onSnapshot,
//   serverTimestamp
// } from "firebase/firestore";
// import { db } from "./firebase";
// import { TransactionWrite, TransactionType } from "@/types/transaction";

// // Create a new transaction
// export const createTransaction = async (transactionData: Omit<TransactionWrite, 'date'>) => {
//   try {
//     const transactionsRef = collection(db, "transactions");
//     const transactionDoc = doc(transactionsRef); // Auto-generated ID
    
//     await setDoc(transactionDoc, {
//       ...transactionData,
//       date: serverTimestamp()
//     });
    
//     return transactionDoc.id;
//   } catch (error) {
//     console.error("Error creating transaction:", error);
//     throw error;
//   }
// };

// // Get transactions for a specific user
// export const getUserTransactions = (userId: string, callback: (transactions: any[]) => void) => {
//   const transactionsRef = collection(db, "transactions");
//   const q = query(
//     transactionsRef, 
//     where("user_id", "==", userId),
//     orderBy("date", "desc")
//   );
  
//   return onSnapshot(q, (snapshot) => {
//     const transactions = snapshot.docs.map(doc => ({
//       id: doc.id,
//       ...doc.data()
//     }));
//     callback(transactions);
//   });
// };

// // Get transactions for a specific campaign
// export const getCampaignTransactions = (campaignId: string, callback: (transactions: any[]) => void) => {
//   const transactionsRef = collection(db, "transactions");
//   const q = query(
//     transactionsRef, 
//     where("campaign_id", "==", campaignId),
//     orderBy("date", "desc")
//   );
  
//   return onSnapshot(q, (snapshot) => {
//     const transactions = snapshot.docs.map(doc => ({
//       id: doc.id,
//       ...doc.data()
//     }));
//     callback(transactions);
//   });
// };

// // Specific transaction creation helpers
// export const createContributionTransaction = async (
//   userId: string, 
//   campaignId: string, 
//   amount: number,
//   txHash: string
// ) => {
//   return createTransaction({
//     amount,
//     type: TransactionType.CONTRIBUTION,
//     campaign_id: campaignId,
//     user_id: userId,
//     recipient_user_id: null, // Campaign owner will be handled separately if needed
//     tx_hash: txHash,
//     status: 'completed',
//     description: `Contribution to campaign ${campaignId}`
//   });
// };

// export const createCampaignCreatedTransaction = async (
//   userId: string, 
//   campaignId: string
// ) => {
//   return createTransaction({
//     amount: 0, // No amount for creation
//     type: TransactionType.CAMPAIGN_CREATED,
//     campaign_id: campaignId,
//     user_id: userId,
//     description: `Created campaign ${campaignId}`,
//   });
// };

// export const createDepositTransaction = async (
//   userId: string, 
//   amount: number,
//   txHash: string
// ) => {
//   return createTransaction({
//     amount,
//     type: TransactionType.DEPOSIT,
//     user_id: userId,
//     tx_hash: txHash,
//     status: 'completed',
//     description: `Deposit to wallet`
//   });
// };

// export const createWithdrawTransaction = async (
//   userId: string, 
//   amount: number,
//   txHash: string
// ) => {
//   return createTransaction({
//     amount,
//     type: TransactionType.WITHDRAW,
//     user_id: userId,
//     tx_hash: txHash,
//     status: 'completed',
//     description: `Withdrawal from wallet`
//   });
// };

// export const createTransferTransaction = async (
//   fromUserId: string, 
//   toUserId: string, 
//   amount: number,
//   txHash: string
// ) => {
//   return createTransaction({
//     amount,
//     type: TransactionType.TRANSFER,
//     user_id: fromUserId,
//     recipient_user_id: toUserId,
//     tx_hash: txHash,
//     status: 'completed',
//     description: `Transfer to ${toUserId.slice(0, 8)}...`
//   });
// };

// export const createCampaignClosedTransaction = async (
//   userId: string, 
//   campaignId: string, 
//   amountWithdrawn: number,
//   txHash: string
// ) => {
//   return createTransaction({
//     amount: amountWithdrawn,
//     type: TransactionType.CAMPAIGN_CLOSED,
//     campaign_id: campaignId,
//     user_id: userId,
//     tx_hash: txHash,
//     status: 'completed',
//     description: `Campaign closed and funds withdrawn`
//   });
// };