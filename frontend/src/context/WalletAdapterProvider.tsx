// "use client";

// import { useMemo } from "react";
// import {
//   ConnectionProvider,
//   WalletProvider,
// } from "@solana/wallet-adapter-react";
// import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
// import {
//   PhantomWalletAdapter,
//   SolflareWalletAdapter,
//   TorusWalletAdapter,
// } from "@solana/wallet-adapter-wallets";
// import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
// import "@solana/wallet-adapter-react-ui/styles.css";
// import { clusterApiUrl } from "@solana/web3.js";

// export function WalletAdapterProvider({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   // Example: custom RPC URL (Helius, QuickNode, or your node)
//   //const endpoint = useMemo(() => "https://your-custom-rpc.com", []);

//   // If you want to pass network into Solflare:
//   const network = WalletAdapterNetwork.Devnet;
//   const endpoint = useMemo(() => clusterApiUrl(network), [network]);

//    const wallets = useMemo(() => {
//     const walletAdapters = [
//       new PhantomWalletAdapter(),
//       new SolflareWalletAdapter({ network }),
//       new TorusWalletAdapter(),
//     ];
    
//     // Log wallet names for debugging
//     console.log("Wallet adapters:", walletAdapters.map(w => w.name));
    
//     return walletAdapters;
//   }, [network]);

//    const filteredWallets = useMemo(() => {
//     const seen = new Set();
//     return wallets.filter(wallet => {
//       // Skip any wallet that might be causing the MetaMask conflict
//       if (wallet.name.includes('MetaMask') || wallet.name.includes('Ethereum')) {
//         console.warn(`Skipping non-Solana wallet: ${wallet.name}`);
//         return false;
//       }
      
//       const key = wallet.name;
//       if (seen.has(key)) {
//         console.warn(`Duplicate wallet detected: ${key}. Filtering out.`);
//         return false;
//       }
//       seen.add(key);
//       return true;
//     });
//   }, [wallets]);

  

//   return (
//     <ConnectionProvider endpoint={endpoint}>
//       {/* 👇 Listen globally for wallet connection events */}
//       <WalletProvider wallets={filteredWallets} autoConnect={true}>
//         <WalletModalProvider>{children}</WalletModalProvider>
//       </WalletProvider>
//     </ConnectionProvider>
//   );
// }

