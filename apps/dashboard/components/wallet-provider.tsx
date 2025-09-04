'use client';

import React from 'react';
import { UnifiedWalletProvider } from '@jup-ag/wallet-adapter';
import { WalletNotification } from './wallet-notification';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <UnifiedWalletProvider
      wallets={[]}
      config={{
        autoConnect: true,
        env: 'mainnet-beta',
        metadata: {
          name: 'BunkerCoin Dashboard',
          description: 'BUNKER Staking and Dashboard',
          url: 'https://dash.bunkercoin.com',
          iconUrls: ['/img/bunkercoin-icon.svg'],
        },
        notificationCallback: WalletNotification,
        walletlistExplanation: {
          href: 'https://station.jup.ag/docs/additional-topics/wallet-list',
        },
        theme: 'dark',
      }}
    >
      {children}
    </UnifiedWalletProvider>
  );
}
