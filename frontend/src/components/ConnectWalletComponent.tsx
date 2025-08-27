"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "../styles/ConnectWalletComponent.css";

export default function ConnectWalletComponent() {
  const { publicKey } = useWallet();

  if (publicKey) {
    return (
      <div className="connect-wallet-container">
        <p className="connected-text">
          Connected: {publicKey.toBase58()}
        </p>
      </div>
    );
  }

  return (
    <div className="connect-wallet-container">
      <p className="connect-wallet-message">
        To fully enjoy the features of this platform, please connect your Wallet.
      </p>
      <WalletMultiButton className="connect-wallet-button" />
    </div>
  );
}
