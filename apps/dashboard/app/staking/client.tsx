'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { UnifiedWalletButton } from '@jup-ag/wallet-adapter';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import './wallet-button.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { createStakeTx, DurationCode } from '@/lib/jupiter-lock-client';
import { getConnection } from '@/lib/solana';
import { Clock, TrendingUp, Coins, Lock, Info, Plus, Calculator, Zap, Loader2, DollarSign, ChartLine, Users, Wallet } from 'lucide-react';
import { StakingChart } from '@/components/dashboard/staking-chart';
import { BunkerIcon } from '@/components/ui/bunker-icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getTokenBalance } from '@/lib/solana';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAtom } from 'jotai';
import { 
  walletBalanceAtom, 
  walletConnectedAtom, 
  walletAddressAtom,
  userStakesAtom,
  userStakesLoadingAtom,
  protocolTotalStakedAtom,
  protocolTotalStakingWeightAtom,
  protocolTVLAtom,
  protocolLoadingAtom,
  totalUserStakedAtom,
  totalUserStakingUnitsAtom,
  userAverageMultiplierAtom,
  userPoolShareAtom
} from '@/lib/staking-atoms';
import { fetchUserStakes } from '@/lib/staking-utils';

interface StakeOption {
  duration: string;
  months: number;
  multiplier: number;
  label: string;
  tier: 'bronze' | 'silver' | 'gold' | 'mythic';
}


const THIS_MONTHS_REWARDS = 120000;

const stakeOptions: StakeOption[] = [
  { duration: '1 month', months: 1, multiplier: 0.4, label: '1 Month', tier: 'bronze' },
  { duration: '3 months', months: 3, multiplier: 1.0, label: '3 Months', tier: 'silver' },
  { duration: '6 months', months: 6, multiplier: 2.0, label: '6 Months', tier: 'gold' },
  { duration: '12 months', months: 12, multiplier: 4.0, label: '1 Year', tier: 'mythic' },
];


export default function StakingClient() {
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('3');
  const [stakeAmount, setStakeAmount] = useState('');
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  
  const [walletBalance, setWalletBalance] = useAtom(walletBalanceAtom);
  const [, setWalletConnected] = useAtom(walletConnectedAtom);
  const [, setWalletAddress] = useAtom(walletAddressAtom);
  const [userStakes, setUserStakes] = useAtom(userStakesAtom);
  const [userStakesLoading, setUserStakesLoading] = useAtom(userStakesLoadingAtom);
  const [protocolTotalStaked, setProtocolTotalStaked] = useAtom(protocolTotalStakedAtom);
  const [protocolTotalStakingWeight, setProtocolTotalStakingWeight] = useAtom(protocolTotalStakingWeightAtom);
  const [protocolTVL, setProtocolTVL] = useAtom(protocolTVLAtom);
  const [protocolLoading, setProtocolLoading] = useAtom(protocolLoadingAtom);
  
  const [totalUserStaked] = useAtom(totalUserStakedAtom);
  const [totalUserStakingUnits] = useAtom(totalUserStakingUnitsAtom);
  const [userAverageMultiplier] = useAtom(userAverageMultiplierAtom);
  const [userPoolShare] = useAtom(userPoolShareAtom);
  
  const refreshWalletBalance = async () => {
    if (!connected || !publicKey) {
      setWalletBalance(0);
      return;
    }
    setWalletBalanceLoading(true);
    try {
      const raw = await getTokenBalance(publicKey.toBase58());
      const tokens = raw / 1_000_000;
      setWalletBalance(tokens);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setWalletBalance(0);
    } finally {
      setWalletBalanceLoading(false);
    }
  };

  useEffect(() => {
    const fetchWalletData = async () => {
      setWalletConnected(connected);
      setWalletAddress(publicKey?.toBase58() || null); 
          if (!connected || !publicKey) {
      setWalletBalance(0);
      setUserStakes(null);
      return;
    }
      
      await refreshWalletBalance();
      
      setUserStakesLoading(true);
      try {
        const stakes = await fetchUserStakes(publicKey.toBase58(), { uncached: false });
        setUserStakes(stakes);
      } catch (error) {
        console.error('Error fetching user stakes:', error);
        setUserStakes([]);
      } finally {
        setUserStakesLoading(false);
      }
    };
    
    fetchWalletData();
  }, [connected, publicKey]);

  const selectedOption = stakeOptions.find(opt => opt.months.toString() === selectedDuration) || stakeOptions[1];
  const stakingUnits = stakeAmount && selectedOption ? parseFloat(stakeAmount) * selectedOption.multiplier : 0;

  useEffect(() => {
    const fetchProtocolTotals = async () => {
      setProtocolLoading(true);
      try {
        const locksRes = await fetch(`/api/locks`);
        let totalLocked = 0;
        if (locksRes.ok) {
          const data = await locksRes.json();
          if (data && Array.isArray(data.accounts)) {
                          const stakingAccounts = data.accounts.filter((a: any) => {
                return a.name && 
                       typeof a.name === 'string' && 
                       a.name.toUpperCase().startsWith('BUNKER STAKING') &&
                       Number(a.amount) > 0;
              });
            
            console.log(`Found ${stakingAccounts.length} STAKING locks out of ${data.accounts.length} total locks`);
            
            if (stakingAccounts.length > 0) {
              totalLocked = stakingAccounts.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
              console.log(`Total STAKING locked: ${totalLocked.toLocaleString()}`);
              
              const totalStakingWeight = stakingAccounts.reduce((sum: number, a: any) => {
                let multiplier = 1.0;
                const hasStart = !!a.startDate;
                const hasFreq = Number.isFinite(a.frequency) && a.frequency > 0;
                const hasPeriods = Number.isFinite(a.numberOfPeriods) && a.numberOfPeriods > 0;
                const startMs = hasStart ? new Date(a.startDate).getTime() : 0;
                const byScheduleMs = hasStart && hasFreq && hasPeriods ? startMs + a.frequency * a.numberOfPeriods * 1000 : 0;
                const cliffMs = Number.isFinite(a.cliffTime) && a.cliffTime > 1_000_000_000 ? a.cliffTime * 1000 : 0;
                const endMs = Math.max(byScheduleMs, cliffMs);
                const durationDays = endMs > 0 && startMs > 0 ? Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) : 0;

                if (durationDays <= 35) multiplier = 0.4;
                else if (durationDays <= 100) multiplier = 1.0;
                else if (durationDays <= 190) multiplier = 2.0;
                else if (durationDays >= 350) multiplier = 4.0;
                else {
                  const monthsApprox = durationDays / 30;
                  multiplier = Math.min(4.0, Math.max(0.4, monthsApprox / 3));
                }

                const weight = (Number(a.amount) || 0) * multiplier;
                console.log(`Protocol Lock ${a.pubkey?.slice(0,8)}: Duration=${durationDays}d Multiplier=${multiplier} Weight=${weight.toLocaleString()}`);
                return sum + weight;
              }, 0);
              
              setProtocolTotalStakingWeight(totalStakingWeight);
              console.log(`Total STAKING weight: ${totalStakingWeight.toLocaleString()}`);
            } else {
              totalLocked = 0;
              setProtocolTotalStakingWeight(0);
              console.log('No STAKING locks found, showing 0');
            }
          }
          setProtocolTotalStaked(totalLocked);
        }

        let tvlUsd: number | null = null;
        if (totalLocked > 0) {
          const priceRes = await fetch('/api/price');
          if (priceRes.ok) {
            const priceData = await priceRes.json();
            const price = Number(priceData?.price) || 0;
            if (price > 0) {
              tvlUsd = totalLocked * price;
            }
          }
        }
        setProtocolTVL(tvlUsd);
      } catch (e) {
      } finally {
        setProtocolLoading(false);
      }
    };

    fetchProtocolTotals();
  }, []);

  const refreshProtocolTotalsUncached = async () => {
    setProtocolLoading(true);
    try {
      const locksRes = await fetch(`/api/locks?uncached=1`);
      let totalLocked = 0;
      if (locksRes.ok) {
        const data = await locksRes.json();
        if (data && Array.isArray(data.accounts)) {
          const stakingAccounts = data.accounts.filter((a: any) => {
            return a.name && typeof a.name === 'string' && a.name.toUpperCase().startsWith('BUNKER STAKING') && Number(a.amount) > 0;
          });
          if (stakingAccounts.length > 0) {
            totalLocked = stakingAccounts.reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);
            const totalStakingWeight = stakingAccounts.reduce((sum: number, a: any) => {
              let multiplier = 1.0;
              const hasStart = !!a.startDate;
              const hasFreq = Number.isFinite(a.frequency) && a.frequency > 0;
              const hasPeriods = Number.isFinite(a.numberOfPeriods) && a.numberOfPeriods > 0;
              const startMs = hasStart ? new Date(a.startDate).getTime() : 0;
              const byScheduleMs = hasStart && hasFreq && hasPeriods ? startMs + a.frequency * a.numberOfPeriods * 1000 : 0;
              const cliffMs = Number.isFinite(a.cliffTime) && a.cliffTime > 1_000_000_000 ? a.cliffTime * 1000 : 0;
              const endMs = Math.max(byScheduleMs, cliffMs);
              const durationDays = endMs > 0 && startMs > 0 ? Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) : 0;
              if (durationDays <= 35) multiplier = 0.4;
              else if (durationDays <= 100) multiplier = 1.0;
              else if (durationDays <= 190) multiplier = 2.0;
              else if (durationDays >= 350) multiplier = 4.0;
              else {
                const monthsApprox = durationDays / 30;
                multiplier = Math.min(4.0, Math.max(0.4, monthsApprox / 3));
              }
              return sum + ((Number(a.amount) || 0) * multiplier);
            }, 0);
            setProtocolTotalStakingWeight(totalStakingWeight);
          } else {
            setProtocolTotalStakingWeight(0);
            totalLocked = 0;
          }
        }
        setProtocolTotalStaked(totalLocked);
      }
      let tvlUsd: number | null = null;
      if (totalLocked > 0) {
        const priceRes = await fetch('/api/price');
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          const price = Number(priceData?.price) || 0;
          if (price > 0) tvlUsd = totalLocked * price;
        }
      }
      setProtocolTVL(tvlUsd);
    } catch {}
    finally { setProtocolLoading(false); }
  };

  const formatUsd = (n: number) => {
    try {
      return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    } catch {
      return `$${Math.round(n).toLocaleString()}`;
    }
  };

  const fireConfetti = () => {
    const defaults = { 
      startVelocity: 45, 
      spread: 70, 
      ticks: 100, 
      zIndex: 10000,
      gravity: 0.8,
      scalar: 1.2,
      drift: 0
    };

    confetti({
      ...defaults,
      particleCount: 100,
      origin: { x: 0.5, y: 0.35 },
      colors: ['#00FFB2', '#22C55E', '#10B981', '#059669', '#047857']
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#262626',
            color: '#fff',
            borderRadius: '8px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#00FFB2',
              secondary: '#262626',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#262626',
            },
          },
        }}
      />
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">Staking</h1>
              <Badge className="bg-bunker-green/10 text-bunker-green border-0 text-xs px-2 py-0.5">Beta</Badge>
            </div>
            <p className="text-neutral-400">Earn rewards by locking your tokens. All rewards are generated from sustainable liquidity pool earnings.</p>
          </div>
          <UnifiedWalletButton />
        </div>

        <div className="flex flex-col gap-8 w-full">
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Staking Overview</h2>
              <p className="text-neutral-400 text-sm">Current staking metrics and APY information</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <div className="relative bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors rounded-xl p-4">
                <TrendingUp className="absolute top-4 right-4 size-5 text-neutral-500 opacity-30" />
                <div className="text-neutral-400 text-sm mb-1">Current APY</div>
                <div className="text-xl font-semibold tabular-nums mb-1">
                  {protocolTotalStakingWeight && protocolTotalStakingWeight > 0 && protocolTotalStaked && protocolTotalStaked > 0 ? (
                    <span className="text-bunker-green">
                      {(() => {
                        const yearlyRewards = THIS_MONTHS_REWARDS * 12;
                        
                        // APY = (yearly rewards / (total staked / average multiplier)) * 100
                        const avgMultiplier = protocolTotalStakingWeight / protocolTotalStaked;
                        
                        const effectiveStaked = protocolTotalStaked / avgMultiplier;
                        
                        const apy = effectiveStaked > 0 
                          ? (yearlyRewards / effectiveStaked) * 100 
                          : 0;
                        
                        return `${apy.toFixed(1)}%`;
                      })()}
                    </span>
                  ) : (
                    <span className="text-neutral-500 font-normal">Calculating...</span>
                  )}
                </div>
                <div className="text-neutral-500 text-xs">
                  Based on this month's rewards
                </div>
              </div>
              
              <div className="relative bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors rounded-xl p-4">
                <Users className="absolute top-4 right-4 size-5 text-neutral-500 opacity-30" />
                <div className="text-neutral-400 text-sm mb-1">Total Staked</div>
                {protocolLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-20 bg-neutral-800/50" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-semibold text-neutral-300">{(protocolTotalStaked ?? 0).toLocaleString()}</span>
                    <BunkerIcon size="sm" />
                  </div>
                )}
                <div className="text-neutral-500 text-xs">
                  Across all users
                </div>
              </div>
              
              <div className="relative bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors rounded-xl p-4">
                <Wallet className="absolute top-4 right-4 size-5 text-neutral-500 opacity-30" />
                <div className="text-neutral-400 text-sm mb-1">Total Value Locked</div>
                {protocolLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-16 bg-neutral-800/50" />
                  </div>
                ) : (
                  <div className="text-xl font-semibold tabular-nums mb-1">
                    <span className="text-neutral-300 font-normal">{protocolTVL != null ? formatUsd(protocolTVL) : '$0'}</span>
                  </div>
                )}
                <div className="text-neutral-500 text-xs">
                  Active
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Your Stake</h2>
              <p className="text-neutral-400 text-sm">Track your positions and earnings performance</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-8 w-full relative">
              {!connected && (
                <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                  <div className="text-center">
                    <Lock className="h-12 w-12 text-neutral-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Connect your wallet to proceed</h3>
                    <p className="text-neutral-400 text-sm max-w-sm mx-auto">
                      View your staking performance and manage positions
                    </p>
                  </div>
                </div>
              )}
              <div className="w-full lg:w-[600px] shrink-0 bg-neutral-900/50 rounded-xl p-6 border border-neutral-800">
                <StakingChart />
              </div>
              <div className="flex-1 bg-neutral-900/50 rounded-xl p-6 border border-neutral-800 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Position Summary</h3>
                  <p className="text-sm text-neutral-400">Your current staking positions</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-auto h-full">
                  <div className="bg-neutral-800/20 rounded-lg p-6 flex flex-col justify-center">
                    <p className="text-sm text-neutral-400 mb-2">Active Stake</p>
                    {totalUserStaked === null ? (
                      <Skeleton className="h-8 w-20 mb-1 bg-neutral-800/50" />
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-2xl font-bold text-white">{totalUserStaked.toLocaleString()}</p>
                          <BunkerIcon size="md" />
                        </div>
                        {totalUserStakingUnits && totalUserStakingUnits > 0 && (
                          <p className="text-xs text-bunker-green">
                            Est. {(() => {
                              const totalWeight = protocolTotalStakingWeight || totalUserStakingUnits;
                              if (!totalWeight || totalWeight === 0) return '0';
                              const shareOfRewards = totalUserStakingUnits / totalWeight;
                              const monthlyReward = Math.round(THIS_MONTHS_REWARDS * shareOfRewards);
                              return monthlyReward.toLocaleString();
                            })()} BUNKER/mo
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-neutral-500 mt-1">BUNKER staked</p>
                  </div>
                  <div className="bg-neutral-800/20 rounded-lg p-6 flex flex-col justify-center">
                    <p className="text-sm text-neutral-400 mb-2">Average Multiplier</p>
                    {userAverageMultiplier === null ? (
                      <Skeleton className="h-8 w-16 mb-1 bg-neutral-800/50" />
                    ) : (
                      <p className="text-2xl font-bold text-white mb-1">{userAverageMultiplier.toFixed(1)}x</p>
                    )}
                    <p className="text-xs text-neutral-500">weighted average</p>
                  </div>
                  <div className="bg-neutral-800/20 rounded-lg p-6 flex flex-col justify-center">
                    <p className="text-sm text-neutral-400 mb-2">Stake Weight</p>
                    {totalUserStakingUnits === null ? (
                      <Skeleton className="h-8 w-24 mb-1 bg-neutral-800/50" />
                    ) : (
                      <p className="text-2xl font-bold text-white mb-1">{totalUserStakingUnits.toLocaleString()}</p>
                    )}
                    <p className="text-xs text-neutral-500">total units</p>
                  </div>
                  <div className="bg-neutral-800/20 rounded-lg p-6 flex flex-col justify-center">
                    <p className="text-sm text-neutral-400 mb-2">Pool Share</p>
                    {userPoolShare === null ? (
                      <Skeleton className="h-8 w-16 mb-1 bg-neutral-800/50" />
                    ) : (
                      <p className="text-2xl font-bold text-white mb-1">{userPoolShare.toFixed(2)}%</p>
                    )}
                    <p className="text-xs text-neutral-500">of total pool</p>
                  </div>
                </div>
                <div className="pt-6 mt-auto border-t border-neutral-800">
                  <Button 
                    onClick={() => setIsStakeModalOpen(true)}
                    disabled={!connected}
                    className="w-full text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: connected ? '#00FFB2' : '#404040' }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {connected ? 'Stake BunkerCoin' : 'Connect Wallet to Stake'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Active Stakes</h2>
              <p className="text-neutral-400 text-sm">View individual staking positions</p>
            </div>
            <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden relative">
              {!connected && (
                <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                  <div className="text-center">
                    <Lock className="h-12 w-12 text-neutral-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Connect your wallet to proceed</h3>
                    <p className="text-neutral-400 text-sm max-w-sm mx-auto">
                      View your staking performance and manage positions
                    </p>
                  </div>
                </div>
              )}
              {userStakes === null ? (
                <div className="overflow-x-auto">
                  <Table className="border-0">
                    <TableHeader>
                      <TableRow className="border-neutral-700/50">
                        <TableHead className="text-neutral-400">Amount</TableHead>
                        <TableHead className="text-neutral-400">Duration</TableHead>
                        <TableHead className="text-neutral-400">Multiplier</TableHead>
                        <TableHead className="hidden sm:table-cell text-neutral-400">Staking Weight</TableHead>
                        <TableHead className="text-neutral-400">Unlock Date</TableHead>
                        <TableHead className="hidden sm:table-cell text-neutral-400">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  Rewards
                                  <Info className="h-3 w-3 text-neutral-500" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <div><span className="font-semibold">Est:</span> Estimated this month</div>
                                  <div><span className="font-semibold">Rec:</span> Total received</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                        <TableHead className="text-neutral-400">Status</TableHead>
                        <TableHead className="text-neutral-400">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-16 bg-neutral-800/50" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12 bg-neutral-800/50" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-8 bg-neutral-800/50" /></TableCell>
                          <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16 bg-neutral-800/50" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 bg-neutral-800/50" /></TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="space-y-1">
                              <Skeleton className="h-3 w-12 bg-neutral-800/50" />
                              <Skeleton className="h-3 w-12 bg-neutral-800/50" />
                            </div>
                          </TableCell>
                          <TableCell><Skeleton className="h-6 w-16 bg-neutral-800/50 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-16 bg-neutral-800/50 rounded-md" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : userStakes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="border-0">
                    <TableHeader>
                      <TableRow className="border-neutral-700/50">
                        <TableHead className="text-neutral-400">Amount</TableHead>
                        <TableHead className="text-neutral-400">Duration</TableHead>
                        <TableHead className="text-neutral-400">Multiplier</TableHead>
                        <TableHead className="hidden sm:table-cell text-neutral-400">Staking Weight</TableHead>
                        <TableHead className="text-neutral-400">Unlock Date</TableHead>
                        <TableHead className="hidden sm:table-cell text-neutral-400">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  Rewards
                                  <Info className="h-3 w-3 text-neutral-500" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <div><span className="font-semibold">Est:</span> Estimated this month</div>
                                  <div><span className="font-semibold">Rec:</span> Total received</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                        <TableHead className="text-neutral-400">Status</TableHead>
                        <TableHead className="text-neutral-400">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userStakesLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-16 bg-neutral-800/50" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12 bg-neutral-800/50" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-8 bg-neutral-800/50" /></TableCell>
                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16 bg-neutral-800/50" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20 bg-neutral-800/50" /></TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="space-y-1">
                                <Skeleton className="h-3 w-12 bg-neutral-800/50" />
                                <Skeleton className="h-3 w-12 bg-neutral-800/50" />
                              </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-6 w-16 bg-neutral-800/50 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-16 bg-neutral-800/50 rounded-md" /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        userStakes.map((stake) => (
                          <TableRow key={stake.id} className="border-neutral-700/50">
                            <TableCell className="font-medium text-white">
                              <div className="flex items-center gap-2">
                                <span>{stake.amount.toLocaleString()}</span>
                                <BunkerIcon size="xs" />
                                <span className="text-sm text-neutral-400 hidden sm:inline">BUNKER</span>
                              </div>
                              <div className="text-xs text-neutral-400 sm:hidden space-y-0.5">
                                <div>{stake.stakingUnits.toLocaleString()} weight</div>
                                <div>Est: {(() => {
                                  const totalWeight = protocolTotalStakingWeight || stake.stakingUnits;
                                  const shareOfRewards = stake.stakingUnits / totalWeight;
                                  const monthlyReward = Math.round(THIS_MONTHS_REWARDS * shareOfRewards);
                                  return monthlyReward.toLocaleString();
                                })()} BUNKER</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-neutral-400" />
                                {stake.lockDuration}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-neutral-800/50 border-0" style={{ color: '#00FFB2' }}>
                                {stake.multiplier}x
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-white">
                              {stake.stakingUnits.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-white">
                              {stake.endDate.toLocaleDateString()}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-white">
                              <div className="text-xs">
                                <div className="text-neutral-400">
                                  Est: <span className="text-white">
                                    {(() => {
                                      const totalWeight = protocolTotalStakingWeight || stake.stakingUnits;
                                      const shareOfRewards = stake.stakingUnits / totalWeight;
                                      const monthlyReward = Math.round(THIS_MONTHS_REWARDS * shareOfRewards);
                                      return monthlyReward.toLocaleString();
                                    })()}
                                  </span>
                                </div>
                                <div className="text-neutral-400">Rec: <span className="text-white">0</span></div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="default" 
                                className={`border-0 ${
                                  stake.status === 'active' 
                                    ? 'bg-green-500/10 text-green-500' 
                                    : 'bg-neutral-700/20 text-neutral-400'
                                }`}
                              >
                                {stake.status === 'active' ? 'Active' : 'Claimed'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={true}
                                className="bg-neutral-800/20 border-neutral-700/50 text-neutral-500 cursor-not-allowed"
                              >
                                Claim
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <h3 className="text-xl font-semibold text-white mb-2">No active stakes</h3>
                  <p className="text-neutral-400 mb-6 max-w-md mx-auto">
                    Start staking your BUNKER tokens to earn rewards from our sustainable LP revenue sharing program
                  </p>
                </div>
              )}
            </div>
          </div>

          <Dialog open={isStakeModalOpen} onOpenChange={async (open) => {
            setIsStakeModalOpen(open);
            if (open && connected && publicKey) {
              await refreshWalletBalance();
              setUserStakesLoading(true);
              try {
                const stakes = await fetchUserStakes(publicKey.toBase58());
                setUserStakes(stakes);
              } catch (error) {
                console.error('Error refreshing user stakes:', error);
              } finally {
                setUserStakesLoading(false);
              }
            }
          }}>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[95vh] bg-neutral-900 border-neutral-800 overflow-y-auto">
              <DialogHeader className="space-y-2 sm:space-y-3">
                <DialogTitle className="text-xl sm:text-2xl font-bold">Stake BunkerCoin</DialogTitle>
                <DialogDescription className="text-sm sm:text-base text-neutral-400">
                  Choose your staking duration and amount. Longer lock periods earn higher multipliers.
                </DialogDescription>
              </DialogHeader>
              
                              <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="amount" className="text-base sm:text-lg font-medium">Amount to Stake</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                      <BunkerIcon size="sm" />
                    </div>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="pl-10 pr-24 h-12 sm:h-14 text-base sm:text-lg bg-neutral-800/30 border-neutral-700/50 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      style={{ MozAppearance: 'textfield' } as React.CSSProperties}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm text-muted-foreground">
                      <span>BUNKER</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                      {walletBalanceLoading ? (
                        <Skeleton className="h-4 w-24 bg-neutral-800/50" />
                      ) : (
                        <>
                          <span>Balance: {connected ? walletBalance.toLocaleString() : '0'}</span>
                          <BunkerIcon size="sm" />
                        </>
                      )}
                    </div>
                    <button 
                      onClick={() => setStakeAmount(walletBalance.toString())}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!connected || walletBalance === 0}
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-sm sm:text-base font-medium">Lock Duration</Label>
                  <RadioGroup value={selectedDuration} onValueChange={setSelectedDuration}>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {stakeOptions.map((option) => (
                        <div key={option.months} className="relative">
                          <RadioGroupItem
                            value={option.months.toString()}
                            id={`duration-${option.months}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`duration-${option.months}`}
                            className={`flex flex-col items-center justify-center rounded-lg border p-2 sm:p-4 hover:border-neutral-400/50 hover:bg-neutral-700/30 cursor-pointer transition-all relative overflow-hidden ${
                              option.months === 12 
                                ? selectedDuration === '12' 
                                  ? 'bg-gradient-radial-bunker-selected border-neutral-400/50' 
                                  : 'bg-gradient-radial-bunker border-neutral-700/50'
                                : selectedDuration === option.months.toString()
                                  ? 'bg-neutral-700/40 border-neutral-400/50'
                                  : 'bg-neutral-800/30 border-neutral-700/50'
                            }`}
                          >
                            <span className="text-sm sm:text-base font-semibold">{option.label}</span>
                            <div className="flex flex-col gap-1 mt-1">
                              <div className="flex items-center gap-1">
                                <span className={`text-xs sm:text-sm font-medium ${option.months === 12 ? 'text-bunker-green' : 'text-muted-foreground'}`}>
                                  {option.multiplier}x multiplier
                                </span>
                                {option.months === 12 && (
                                  <Zap className="h-2 w-2 sm:h-3 sm:w-3 text-bunker-green" />
                                )}
                              </div>
                              <span className="text-xs text-neutral-400 hidden sm:block">
                                Est. APY: {(() => {
                                  const yearlyRewards = THIS_MONTHS_REWARDS * 12;
                                  
                                  const hypotheticalStake = 100000;
                                  const weightedStake = hypotheticalStake * option.multiplier;
                                  
                                  const currentTotalWeight = protocolTotalStakingWeight || weightedStake;
                                  
                                  const shareOfRewards = weightedStake / currentTotalWeight;
                                  const yourYearlyRewards = yearlyRewards * shareOfRewards;
                                  
                                  const apy = (yourYearlyRewards / hypotheticalStake) * 100;
                                  
                                  return apy > 1000 ? '>1000%' : `~${Math.round(apy)}%`;
                                })()}
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div className="rounded-lg bg-neutral-800/30 p-4 space-y-3">
                  <div className="text-base font-medium">
                    Summary
                  </div>
                  <Separator className="bg-neutral-700/30" />
                  <div className="space-y-2 text-base">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-light">Amount:</span>
                      <span className="font-medium">{stakeAmount || '0'} BUNKER</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-light">Duration:</span>
                      <span className="font-medium">{selectedOption?.duration || '3 months'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-light">Multiplier:</span>
                      <span className="font-medium text-primary">{selectedOption?.multiplier || 1}x</span>
                    </div>
                    <Separator className="my-2 bg-neutral-700/30" />
                                      <div className="flex justify-between text-lg">
                    <span className="font-medium">Staking Weight:</span>
                    <span className="font-bold text-primary">
                      {stakingUnits.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="font-medium text-neutral-400">
                      Est. Monthly Rewards:
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="inline-block h-3 w-3 ml-1 text-neutral-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="text-xs">
                              <div className="font-semibold mb-1">Dynamic Rewards</div>
                              <div>Based on:</div>
                              <ul className="list-disc list-inside ml-1 mt-1 space-y-0.5">
                                <li>Current total staked: {protocolTotalStaked?.toLocaleString() || '0'} BUNKER</li>
                                <li>This month's pool: {THIS_MONTHS_REWARDS.toLocaleString()} BUNKER</li>
                                <li>Your weight vs total weight</li>
                              </ul>
                              <div className="mt-2 text-neutral-400">
                                Actual rewards may vary as more users stake or unstake.
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <span className="font-semibold text-bunker-green">
                      {(() => {
                        const currentTotalWeight = protocolTotalStakingWeight || stakingUnits;
                        const newTotalWeight = currentTotalWeight + stakingUnits;
                        const shareOfRewards = stakingUnits / newTotalWeight;
                        const yourMonthlyRewards = THIS_MONTHS_REWARDS * shareOfRewards;
                        return `~${Math.round(yourMonthlyRewards).toLocaleString()} BUNKER`;
                      })()}
                    </span>
                  </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                <Button 
                  variant="ghost" 
                  size="default"
                  onClick={() => setIsStakeModalOpen(false)}
                  className="hover:bg-neutral-800/50 text-sm sm:text-base h-10 sm:h-11"
                >
                  Cancel
                </Button>
                <Button 
                  size="default"
                  onClick={async () => {
                    if (!connected || !publicKey || isStaking) return;
                    
                    const amount = parseFloat(stakeAmount || '0');
                    
                    setIsStaking(true);
                    try {
                      const connection = getConnection();
                      if (!signTransaction) {
                        console.error('Wallet adapter missing signTransaction');
                        setIsStaking(false);
                        return;
                      }

                      const duration: DurationCode = selectedDuration === '1' ? '1M' : selectedDuration === '3' ? '3M' : selectedDuration === '6' ? '6M' : '12M';
                      const title = `BUNKER STAKING ${duration}`;

                      const transaction = await createStakeTx({
                        connection,
                        wallet: publicKey,
                        signTransaction,
                        amountBunker: amount,
                        duration,
                        title,
                      });

                      const signed = await signTransaction(transaction);
                      
                      const toastId = toast.loading('Sending transaction...');
                      
                      let sig: string;
                      try {
                        sig = await connection.sendRawTransaction(signed.serialize(), {
                          skipPreflight: false,
                          preflightCommitment: 'confirmed',
                          maxRetries: 3
                        });
                        
                        toast.loading('Confirming transaction...', { id: toastId });
                      } catch (sendError: any) {
                        const errorStr = sendError?.message || sendError?.toString() || '';
                        const sigMatch = errorStr.match(/[1-9A-HJ-NP-Za-km-z]{87,88}/);
                        
                        if (sigMatch) {
                          sig = sigMatch[0];
                          console.log('Transaction sent with signature from error:', sig);
                          toast.loading('Confirming transaction...', { id: toastId });
                        } else {
                          throw sendError;
                        }
                      }
                      

                      try {
                        const latestBlockhash = await connection.getLatestBlockhash('confirmed');
                        await connection.confirmTransaction({
                          signature: sig,
                          blockhash: latestBlockhash.blockhash,
                          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
                        }, 'confirmed');
                      } catch (confirmError: any) {

                        const txInfo = await connection.getTransaction(sig, { commitment: 'confirmed' });
                        if (!txInfo) {
                          throw confirmError;
                        }
                        console.log('Transaction confirmed via getTransaction:', sig);
                      }

                      toast.success(
                        `Successfully staked ${amount.toLocaleString()} BUNKER for ${selectedOption?.label}!`,
                        { id: toastId }
                      );
                      
                      console.log(`View transaction: https://solscan.io/tx/${sig}`);

                      setIsStakeModalOpen(false);
                      fireConfetti(); 
                      
                      refreshProtocolTotalsUncached().catch(console.error);
                      
                      setTimeout(async () => {
                        console.log('Refreshing data after 1s...');
                        toast.loading('Updating staking data...', { duration: 2000 });
                        await refreshProtocolTotalsUncached();
                        
                        setUserStakesLoading(true);
                        try {
                          const stakes = await fetchUserStakes(publicKey.toBase58(), { uncached: true });
                          setUserStakes(stakes);
                        } catch {
                          setUserStakes([]);
                        } finally {
                          setUserStakesLoading(false);
                        }
                      }, 1000);
                      
                      setTimeout(async () => {
                        console.log('Final refresh after 3s...');
                        await refreshProtocolTotalsUncached();
                        
                        try {
                          const stakes = await fetchUserStakes(publicKey.toBase58(), { uncached: true });
                          setUserStakes(stakes);
                        } catch (e) {
                          console.error('Failed to refresh user stakes:', e);
                        }
                      }, 3000);
                    } catch (e: any) {
                      console.error('Stake tx failed', e);
                      
                      let errorTitle = 'Transaction Failed';
                      let errorMessage = 'Please try again.';
                      
                      const errorStr = e?.message || e?.toString() || '';
                      
                      if (errorStr.includes('User rejected') || errorStr.includes('cancelled')) {
                        errorTitle = 'Transaction Cancelled';
                        errorMessage = 'You cancelled the transaction.';
                      } else if (errorStr.includes('BlockhashNotFound') || errorStr.includes('blockhash')) {
                        errorTitle = 'Transaction Expired';
                        errorMessage = 'The transaction took too long. Please try again.';
                      } else if (errorStr.includes('insufficient') || errorStr.includes('0x1')) {
                        errorTitle = 'Insufficient Balance';
                        errorMessage = `You need at least ${amount} BUNKER plus SOL for fees.`;
                      } else if (errorStr.includes('slippage')) {
                        errorTitle = 'Slippage Error';
                        errorMessage = 'Price moved too much. Please try again.';
                      } else if (errorStr.includes('Simulation failed')) {
                        errorTitle = 'Simulation Failed';
                        errorMessage = 'Transaction would fail. Check your balance and try again.';
                      } else if (errorStr.includes('timeout') || errorStr.includes('Timeout')) {
                        errorTitle = 'Network Timeout';
                        errorMessage = 'Network is congested. Please try again.';
                      } else if (errorStr.includes('429') || errorStr.includes('rate')) {
                        errorTitle = 'Rate Limited';
                        errorMessage = 'Too many requests. Please wait a moment.';
                      } else if (errorStr.includes('Invalid') || errorStr.includes('invalid')) {
                        errorTitle = 'Invalid Transaction';
                        errorMessage = 'The transaction parameters are invalid.';
                      } else if (errorStr.includes('Program failed')) {
                        errorTitle = 'Program Error';
                        errorMessage = 'The staking program encountered an error.';
                      } else if (errorStr.includes('Account does not exist')) {
                        errorTitle = 'Account Not Found';
                        errorMessage = 'Token account not found. Please try again.';
                      } else if (errorStr.includes('network')) {
                        errorTitle = 'Network Error';
                        errorMessage = 'Could not connect to Solana network.';
                      }
                      
                      toast.error(`${errorTitle}: ${errorMessage}`);
                    } finally {
                      setIsStaking(false);
                    }
                  }}
                  disabled={!connected || !stakeAmount || parseFloat(stakeAmount) <= 0 || parseFloat(stakeAmount) > walletBalance || isStaking}
                  className="w-full sm:w-auto text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base h-10 sm:h-11"
                  style={{ backgroundColor: isStaking ? '#00FFB2' : '#00FFB2' }}
                >
                  {isStaking ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    'Confirm Stake'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
