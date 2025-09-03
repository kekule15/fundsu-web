// src/context/TransactionContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Transaction } from "@/types/transaction";

import { useAuth } from "./AuthContext";
import {
  convertToCampaign,
  convertToTransaction,
  getAllTransactions,
  getUserTransactions,
} from "@/lib/firebaseHelpers";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { TRANSACTION_COLLECTION } from "@/utils/db_constants";
import { db } from "@/lib/firebase";
import { Campaign } from "@/types/campaign";

type TransactionContextType = {
  transactions: Transaction[];
  loading: boolean;
  refreshTransactions: () => void;
};

const TransactionContext = createContext<TransactionContextType | undefined>(
  undefined
);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  //  useEffect(() => {
  //     if (!user) {
  //       setTransactions([]);
  //       setLoading(false);
  //       return;
  //     }

  //     setLoading(true);

  //     try {
  //       const transactionsRef = collection(db, TRANSACTION_COLLECTION);

  //       // Create a query that orders transactions by date descending
  //       const q = query(transactionsRef, orderBy("date", "desc"));

  //       // Set up real-time listener
  //       const unsubscribe = onSnapshot(q,
  //         (querySnapshot) => {
  //           const transactionsData: Transaction[] = [];

  //           querySnapshot.forEach((doc) => {
  //             transactionsData.push(convertToTransaction(doc.id, doc.data()));
  //           });

  //           console.log("Fetched transactions:", transactionsData);

  //           setTransactions(transactionsData);
  //           setLoading(false);
  //         },
  //         (error) => {
  //           console.error("Error listening to transactions:", error);
  //           setLoading(false);
  //         }
  //       );

  //       // Return cleanup function to unsubscribe from listener
  //       return () => unsubscribe();
  //     } catch (error) {
  //       console.error("Error setting up transaction listener:", error);
  //       setLoading(false);
  //     }
  //   }, [user]);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, TRANSACTION_COLLECTION),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Transaction[] = [];
      snapshot.forEach((doc) =>
        data.push(convertToTransaction(doc.id, doc.data()))
      );
      console.log("Fetched transactions:", data);
      setTransactions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const refreshTransactions = () => {
    setLoading(true);
    // The Firestore listener will automatically update
  };

  const value: TransactionContextType = {
    transactions,
    loading,
    refreshTransactions,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error("useTransactions must be used within TransactionProvider");
  }
  return context;
}
