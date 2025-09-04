"use client";

import { WalletProvider } from '@/components/wallet-provider';

export default function StakingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletProvider>{children}</WalletProvider>;
}
