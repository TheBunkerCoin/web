"use client";

import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';

const DynamicStakingClient = dynamic(() => import('./client'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader className="size-6 text-neutral-600 animate-spin" />
        <p className="text-sm text-neutral-600">Loading</p>
      </div>
    </div>
  ),
});

export default function StakingPage() {
  return <DynamicStakingClient />;
}
