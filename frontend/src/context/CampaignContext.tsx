// src/context/CampaignContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { Campaign, CampaignWrite } from "@/types/campaign";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";

import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../types/idl/fundsu_campaigns.json";
import {
  convertToCampaign,
  createCampaignInFirestore,
  getCampaign,
  updateCampaignContribution,
  updateCampaignWithdrawal,
} from "@/lib/firebaseHelpers";
import {
  createCampaignClosedTransaction,
  createContributionTransaction,
} from "@/lib/transactionHelpers";
import {
  CampaignInitializedEvent,
  CampaignContributedEvent,
  CampaignWithdrawnEvent,
  CampaignClosedEvent,
} from "@/types/anchor_events";
import {
  fetchCampaignContributions,
  getContributionStats,
  mapDecodedCampaign,
  subscribeToAllCampaignEvents,
} from "@/lib/anchorHelpers";
import {
  solToBN,
  bnToSol,
  safeNumberToBN,
  bnToNumber,
} from "@/utils/converters";
import { CAMPAIGN_COLLECTION, USER_COLLECTION } from "@/utils/db_constants";
import { useAuth } from "./AuthContext";
import { getHumanReadableError } from "@/utils/anchorErrorParser";
import * as borsh from "borsh";
import { CampaignAccountWithTransactions } from "@/types/accountSchema";
import { syncCampaignsWithFirebase } from "@/lib/data-sync";
import { s } from "framer-motion/client";
type CampaignContextType = {
  campaigns: Campaign[];
  userCampaigns: Campaign[];
  featuredCampaigns: Campaign[];
  loading: boolean;
  createCampaignState: boolean;
  contributeState: boolean;
  selectedCampaign: Campaign | null;
  selectCampaignState: boolean;
  syncState: boolean;
  withdrawState: boolean;
  // program: anchor.Program | null;
  initializeCampaign: (
    title: string,
    description: string,
    targetAmountSol: number,
    imageUrl?: string
  ) => Promise<string>;
  contributeToCampaign: (
    campaignPda: string,
    amountSol: number,
    recipientUserId: string,
    docId: string,
    title: string
  ) => Promise<string>;
  withdrawFromCampaign: (campaignPda: string, title: string, amount: number) => Promise<string>;
  refreshCampaigns: () => void;
  selectCampaign: (campaign: Campaign) => void;
  refreshCampaign: () => void;
  manualSync: () => Promise<any>;
};

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
);

const CAMPAIGN_SEED = "CAMPAIGN_SEED";

// Helper function to get campaign PDA
export function getCampaignAddress(
  title: string,
  author: PublicKey,
  programID: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode(title),
      anchor.utils.bytes.utf8.encode(CAMPAIGN_SEED),
      author.toBuffer(),
    ],
    programID
  );
}

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributeState, setContribute] = useState(false);
  const [createCampaignState, setCreateCampaignState] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [selectCampaignState, setSelectCampaignState] = useState(false);
  const [syncState, setSyncState] = useState(false);
  const [withdrawState, setWithdrawState] = useState(false);

  // Hooks must be at top level
  const { wallet: connectedWallet, connect } = useWallet();
  const { user } = useAuth();
  const getProgram = useCallback(async (): Promise<anchor.Program> => {
    if (!user?.wallet_address) throw new Error("User wallet not available");

    const connection = new anchor.web3.Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    );

    // Use the useWallet hook's wallet directly

    if (connectedWallet == null) {
      console.log("No connected wallet found, attempting to connect...");
      try {
        await connect();
        // Wait a moment for connection to establish
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        console.error("Wallet connection failed:", err);
        throw new Error("Failed to connect wallet");
      }
    }
    {
      console.log("Connected wallet:", connectedWallet);
    }

    // Create the wallet object that Anchor expects

    const anchorWallet: Wallet = {
      publicKey: connectedWallet?.adapter.publicKey!,
      //payer: connectedWallet?.adapter.publicKey!,
      signTransaction: async <
        T extends anchor.web3.Transaction | anchor.web3.VersionedTransaction
      >(
        tx: T
      ): Promise<T> => {
        // @ts-ignore
        return await connectedWallet?.adapter.signTransaction(tx);
      },
      signAllTransactions: async <
        T extends anchor.web3.Transaction | anchor.web3.VersionedTransaction
      >(
        txs: T[]
      ): Promise<T[]> => {
        // @ts-ignore
        return await connectedWallet?.adapter.signAllTransactions(txs);
      },
    } as Wallet;

    // Use the connected wallet from useWallet hook
    const provider = new anchor.AnchorProvider(connection, anchorWallet, {
      preflightCommitment: "processed",
    });

    anchor.setProvider(provider);

    const programInstance = new anchor.Program(idl as anchor.Idl, provider);
    //setProgram(programInstance);
    console.log(
      "Anchor program initialized:",
      programInstance.programId.toString()
    );
    return programInstance;
  }, [user]);

  // Event handler functions
  const handleCampaignInitialized = useCallback(
    async (event: CampaignInitializedEvent) => {
      try {
        console.log("CampaignInitialized event:", event);
        // const campaignId = event.campaign.toString();
        // const campaignDoc = doc(db, CAMPAIGN_COLLECTION, campaignId);
        // const docSnap = await getDoc(campaignDoc);

        // if (!docSnap.exists()) {
        //   await setDoc(campaignDoc, {
        //     campaign_wallet_key: campaignId,
        //     author: event.author.toString(),
        //     title: event.title,
        //     description: event.description,
        //     target_amount: bnToNumber(event.target_amount), // store in Number
        //     current_amount: 0,
        //     locked: true,
        //     likes: 0,
        //     dislikes: 0,
        //     closed: false,
        //     contributors_count: 0,
        //     timestamp: event.timestamp.toNumber(),
        //   });
        // }
      } catch (error) {
        console.error("Error handling CampaignInitialized event:", error);
      }
    },
    []
  );

  const handleCampaignContributed = useCallback(
    async (event: CampaignContributedEvent) => {
      try {
        console.log("CampaignContributed event:", event);
        // const campaignId = event.campaign.toString();
        // const contributor = event.contributor.toString();
        // const amountSol = bnToNumber(event.amount);
        // const newTotalSol = bnToNumber(event.new_total);

        // await updateDoc(doc(db, CAMPAIGN_COLLECTION, campaignId), {
        //   current_amount: newTotalSol, // store in Number
        // });

        // await updateDoc(doc(db, USER_COLLECTION, contributor), {
        //   campaigns_contributed: arrayUnion(campaignId),
        //   total_contributions: increment(amountSol),
        // });

        // await createContributionTransaction(
        //   contributor,
        //   campaignId,
        //   amountSol
        // );
      } catch (error) {
        console.error("Error handling CampaignContributed event:", error);
      }
    },
    []
  );

  const handleCampaignWithdrawn = useCallback(
    async (event: CampaignWithdrawnEvent) => {
      try {
        console.log("CampaignWithdrawn event:", event);

        // const campaignId = event.campaign.toString();
        // const author = event.author.toString();
        // const amountWithdrawnSol = bnToNumber(event.amount_withdrawn);

        // await updateDoc(doc(db, CAMPAIGN_COLLECTION, campaignId), {
        //   current_amount: 0,
        //   closed: true,
        // });

        // await createCampaignClosedTransaction(
        //   author,
        //   campaignId,
        //   amountWithdrawnSol
        // );
      } catch (error) {
        console.error("Error handling CampaignWithdrawn event:", error);
      }
    },
    []
  );

  const handleCampaignClosed = useCallback(
    async (event: CampaignClosedEvent) => {
      try {
        console.log("CampaignClosed event:", event);
        // await updateDoc(doc(db, CAMPAIGN_COLLECTION, event.campaign.toString()), {
        //   closed: true,
        // });
      } catch (error) {
        console.error("Error handling CampaignClosed event:", error);
      }
    },
    []
  );

  // Set up event listeners
  // useEffect(() => {

  //   let eventListeners: number[] = [];

  //   (async () => {
  //     const programInstance = program || (await getProgram());
  //     try {
  //       eventListeners = subscribeToAllCampaignEvents(programInstance, {
  //         onInitialized: handleCampaignInitialized,
  //         onContributed: handleCampaignContributed,
  //         onWithdrawn: handleCampaignWithdrawn,
  //         onClosed: handleCampaignClosed,
  //       });
  //     } catch (error) {
  //       console.error("Error setting up event listeners:", error);
  //     }
  //   })();

  //   return () => {
  //     const programInstance = program || (await getProgram());
  //     if (programInstance && eventListeners.length > 0) {
  //       eventListeners.forEach((id) =>
  //         programInstance.removeEventListener(id).catch(console.error)
  //       );
  //     }
  //   };
  // }, [

  //   handleCampaignInitialized,
  //   handleCampaignContributed,
  //   handleCampaignWithdrawn,
  //   handleCampaignClosed,
  // ]);

  // useEffect(() => {
  //   const initProgram = async () => {
  //     console.log("Initializing Anchor program...");
  //     console.log("Wallet in CampaignContext:", wallet);
  //     if (!user?.wallet_address) {
  //       setProgram(null);
  //       return;
  //     }

  //     if (!wallet) {
  //       try {
  //         await connect(); // triggers autoConnect or opens modal
  //         return; // wait until wallet is available
  //       } catch (err) {
  //         console.error("Wallet connection failed:", err);
  //         setProgram(null);
  //         return;
  //       }
  //     }

  //     try {
  //       const connection = new anchor.web3.Connection(
  //         process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  //           "https://api.devnet.solana.com",
  //         "confirmed"
  //       );

  //       // Use real wallet if connected; otherwise dummy wallet for read-only
  //       const activeWallet = wallet;

  //       const provider = new anchor.AnchorProvider(
  //         connection,
  //         activeWallet as any,
  //         {
  //           preflightCommitment: "processed",
  //         }
  //       );

  //       anchor.setProvider(provider);
  //       const programInstance = new anchor.Program(idl as anchor.Idl, provider);
  //       console.log("Anchor program initialized:", programInstance.programId.toString());
  //       setProgram(programInstance);
  //     } catch (err) {
  //       console.error("Error initializing Anchor program:", err);
  //       setProgram(null);
  //     }
  //   };

  //   initProgram();
  // }, [user, wallet]);

  // Subscribe to Firestore

  useEffect(() => {
    const q = query(
      collection(db, CAMPAIGN_COLLECTION),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Campaign[] = [];
      snapshot.forEach((doc) =>
        data.push(convertToCampaign(doc.id, doc.data()))
      );
      setCampaigns(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Initialize a new campaign
  const initializeCampaign = async (
    title: string,
    description: string,
    targetAmountSol: number,
    imageUrl?: string
  ): Promise<string> => {
    setCreateCampaignState(true);
    const programInstance = await getProgram();
    if (!programInstance || !user?.wallet_address)
      throw new Error("Wallet not connected");

    try {
      console.log(" program Id:", programInstance.programId.toString());
      const publicKey = new PublicKey(user.wallet_address);
      const [campaignPda] = getCampaignAddress(
        title,
        publicKey,
        programInstance.programId
      );
      const targetBN = solToBN(targetAmountSol);
      // Log
      console.log("Initializing campaign with PDA:", campaignPda.toString());
      console.log("Target amount (BN):", targetBN.toString());
      // Title
      console.log("Title:", title);
      console.log("Description:", description);
      console.log("Image URL:", imageUrl);

      const tx = await programInstance.methods
        .initializeCampaign(title, description, targetBN)
        .accounts({
          authority: publicKey,
          campaign: campaignPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });

      await createCampaignInFirestore(
        {
          campaign_wallet_key: campaignPda.toString(),
          author: publicKey.toString(),
          title,
          description,
          target_amount: bnToNumber(targetBN), // store in number
          current_amount: 0,
          locked: true,
          likes: 0,
          dislikes: 0,
          closed: false,
          contributors_count: 0,
          image_url: imageUrl,
          tx_hash: tx,
        },
        publicKey.toString()
      );

      return tx;
    } catch (error: any) {
      setCreateCampaignState(false);
      // Parse the error for user-friendly messages
      const humanReadableError = getHumanReadableError(
        error,
        idl as anchor.Idl
      );
      // Log detailed error information for debugging

      if (error instanceof anchor.AnchorError) {
        console.error("Anchor error details:", {
          code: error.error.errorCode,
          message: error.error.errorMessage,
          logs: error.logs,
        });
      }
      // Throw user-friendly error
      throw new Error(humanReadableError);
    } finally {
      setCreateCampaignState(false);
    }
  };

  // Contribute
  const contributeToCampaign = async (
    campaignPda: string,
    amountSol: number,
    recipientUserId: string,
    docId: string,
    title: string
  ): Promise<string> => {
    const programInstance = await getProgram();
    if (!programInstance || !user?.wallet_address)
      throw new Error("Wallet not connected");

    try {
      setContribute(true);
      const publicKey = new PublicKey(user.wallet_address);
      const campaignPublicKey = new PublicKey(campaignPda);
      const amountBN = solToBN(amountSol);

      const tx = await programInstance.methods
        .contribute(amountBN)
        .accounts({
          contributor: publicKey,
          campaign: campaignPublicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed", skipPreflight: true });

      await updateCampaignContribution(
        campaignPda,
        docId,
        bnToNumber(amountBN),
        publicKey.toString(),
        tx,
        title,
        recipientUserId
      );
      setContribute(false);

      return tx;
    } catch (error) {
      console.error("Error contributing to campaign:", error);
      setContribute(false);
      const humanReadableError = getHumanReadableError(
        error,
        idl as anchor.Idl
      );
      // Log detailed error information for debugging

      if (error instanceof anchor.AnchorError) {
        console.error("Anchor error details:", {
          code: error.error.errorCode,
          message: error.error.errorMessage,
          logs: error.logs,
        });
      }
      // Throw user-friendly error
      throw new Error(humanReadableError);
    } finally {
      setContribute(false);
    }
  };

  // Withdraw
  const withdrawFromCampaign = async (campaignPda: string, title: string, amount: number): Promise<string> => {
    const programInstance = await getProgram();
    if (!programInstance || !user?.wallet_address)
      throw new Error("Wallet not connected");

    try {
      setWithdrawState(true);
      const publicKey = new PublicKey(user.wallet_address);
      const tx = await programInstance.methods
        .withdrawAll()
        .accounts({
          author: publicKey,
          campaign: new PublicKey(campaignPda),
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });

      await updateCampaignWithdrawal(campaignPda, amount, publicKey.toString(), tx, title);
      return tx;
    } catch (error) {
      console.error("Error withdrawing from campaign:", error);
      const humanReadableError = getHumanReadableError(
        error,
        idl as anchor.Idl
      );
      // Log detailed error information for debugging

      if (error instanceof anchor.AnchorError) {
        console.error("Anchor error details:", {
          code: error.error.errorCode,
          message: error.error.errorMessage,
          logs: error.logs,
        });
      }
      // Throw user-friendly error
      throw new Error(humanReadableError);
    } finally {
      setWithdrawState(false);
    }
  };

  // Fetch program accounts

  // const getProgramAccounts = async () => {
  //   const PROGRAM_ID = new PublicKey(
  //     "9ZtgtUtzDRraorcWZM7vSE7ydGhCJfhpMcV9hbTgLsRr"
  //   );
  //   const connection = new Connection("https://api.devnet.solana.com");
  //   const provider = new anchor.AnchorProvider(connection, {} as any, {});
  //   anchor.setProvider(provider);

  //   const program = new anchor.Program(idl as anchor.Idl, provider);
  //   const accounts = await connection.getProgramAccounts(PROGRAM_ID);

  //   const grouped: Record<string, any[]> = {};
  //   const accountTypes = Object.keys(program.account);

  //   for (const acc of accounts) {
  //     let matched = false;

  //     for (const type of accountTypes) {
  //       try {
  //         const decoded = program.coder.accounts.decode(type, acc.account.data);
  //         if (!grouped[type]) grouped[type] = [];
  //         grouped[type].push({ pubkey: acc.pubkey, data: decoded });
  //         matched = true;
  //         break;
  //       } catch {}
  //     }

  //     if (!matched) {
  //       if (!grouped["unknown"]) grouped["unknown"] = [];
  //       grouped["unknown"].push(acc);
  //     }
  //   }

  //   const campaignAccounts: CampaignAccountWithTransactions[] =
  //     await Promise.all(
  //       (grouped["campaign"] || []).map(async (acc) => {
  //         const signatures = await connection.getSignaturesForAddress(
  //           acc.pubkey,
  //           {
  //             limit: 100,
  //           }
  //         );

  //         let txHash = "";
  //         if (signatures.length > 0) {
  //           // Oldest signature is the account creation (last element in array)
  //           txHash = signatures[signatures.length - 1].signature;
  //         }
  //         // fetch all transactions related to this campaign
  //         const transactions = await fetchCampaignContributions(
  //           connection,
  //           acc.pubkey,
  //           { limit: 100 }
  //         );
  //         // console.log(
  //         //   "Fetched transactions for campaign:",
  //         //   acc.pubkey.toString(),
  //         //   transactions
  //         // );
  //         // Get contribution statistics
  //         // const stats = await getContributionStats(connection, acc.pubkey);

  //         // console.log("Contribution stats:", stats);

  //         return mapDecodedCampaign(acc.pubkey, acc.data, txHash, transactions);
  //       })
  //     );

  //   console.log(
  //     "Campaign accounts with transactions:",
  //     JSON.stringify(campaignAccounts)
  //   );

  //   return grouped;
  // };

  // Manual sync function
  const manualSync = async (): Promise<any> => {
    setSyncState(true);
    try {
      const result = await syncCampaignsWithFirebase();
      return result;
    } catch (error) {
      console.error("Manual sync failed:", error);
      throw error;
    } finally {
      setSyncState(false);
    }
  };

  // Select a campaign
  const selectCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
  };

  // Refresh a single campaign's data from Firestore
  const refreshCampaign = async () => {
    if (!selectedCampaign) return;

    try {
      setSelectCampaignState(true);
      const camp = await getCampaign(selectedCampaign.id);
      if (camp) {
        setSelectedCampaign(camp);
      }
    } catch (error) {
      setSelectCampaignState(false);
      console.error("Error refreshing campaign:", error);
    } finally {
      setSelectCampaignState(false);
    }
  };

  let userCampaigns: Campaign[] = [];
  if (user) {
    const publicKey = new PublicKey(user.wallet_address);
    userCampaigns = publicKey
      ? campaigns.filter((c) => c.author === publicKey.toString())
      : [];
  }

  const featuredCampaigns = campaigns
    .filter((c) => !c.closed)
    .sort((a, b) => b.likes - b.dislikes - (a.likes - a.dislikes))
    .slice(0, 10);

  const refreshCampaigns = () => setLoading(true);

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        userCampaigns,
        featuredCampaigns,
        loading,
        createCampaignState,
        contributeState,
        //program,
        initializeCampaign,
        contributeToCampaign,
        withdrawFromCampaign,
        refreshCampaigns,
        refreshCampaign,
        selectedCampaign: selectedCampaign,
        selectCampaign,
        selectCampaignState,
        manualSync,
        syncState,
        withdrawState,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context)
    throw new Error("useCampaign must be used within CampaignProvider");
  return context;
}
