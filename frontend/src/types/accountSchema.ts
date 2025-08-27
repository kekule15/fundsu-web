import { ProgramTransactionType } from "@/lib/anchorHelpers";
import { CampaignWrite } from "./campaign";



export interface ContributionTx {
    signature: string;
    slot: number;
    blockTime: number | null;
    from: string;
    to: string;
    lamports: number;
    isInner: boolean;
    instructionIndex?: number;
    parentProgram?: string; // Program that initiated the transfer (useful for CPI)
    memo?: string; // Memo if available
    type: ProgramTransactionType
}

export interface CampaignAccountWithTransactions {
    campaign: CampaignWrite;
    transactions: ContributionTx[]; // List of contribution transactions
}