// src/context/TransactionContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Transaction } from "@/types/transaction";

import { useAuth } from "./AuthContext";
import { getUserTransactions } from "@/lib/firebaseHelpers";

type TransactionContextType = {
  transactions: Transaction[];
  loading: boolean;
  refreshTransactions: () => void;
};

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const unsubscribe = getUserTransactions(user.id, (transactionsData) => {
      // Convert Firestore data to Transaction objects
      const formattedTransactions = transactionsData.map((tx: any) => ({
        ...tx,
        date: tx.date?.toMillis ? Math.floor(tx.date.toMillis() / 1000) : tx.date
      })) as Transaction[];
      
      setTransactions(formattedTransactions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const refreshTransactions = () => {
    setLoading(true);
    // The Firestore listener will automatically update
  };

  const value: TransactionContextType = {
    transactions,
    loading,
    refreshTransactions
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