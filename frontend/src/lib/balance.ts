import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

// create a connection to the cluster
// you can reuse your Anchor provider connection here if available
const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com");

export async function getUWalletBalance(publicKey: string): Promise<number> {
  try {
    const key = new PublicKey(publicKey);
    const balanceLamports = await connection.getBalance(key);
    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
    return balanceSOL;
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    throw error;
  }
}
