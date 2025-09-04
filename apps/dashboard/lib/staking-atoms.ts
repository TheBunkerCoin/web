import { atom } from 'jotai';

export interface UserStake {
  id: string;
  pubkey: string;
  creator: string;
  amount: number;
  lockDuration: string;
  multiplier: number;
  stakingUnits: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'expired' | 'claimed';
  estimatedRewards: number;
}

export const walletBalanceAtom = atom<number>(0);
export const walletConnectedAtom = atom<boolean>(false);
export const walletAddressAtom = atom<string | null>(null);

export const userStakesAtom = atom<UserStake[] | null>(null);
export const userStakesLoadingAtom = atom<boolean>(false);

export const protocolTotalStakedAtom = atom<number | null>(null);
export const protocolTotalStakingWeightAtom = atom<number | null>(null);
export const protocolTVLAtom = atom<number | null>(null);
export const protocolLoadingAtom = atom<boolean>(false);

export const totalUserStakedAtom = atom((get) => {
  const stakes = get(userStakesAtom);
  if (!stakes) return null;
  return stakes.reduce((sum, stake) => sum + stake.amount, 0);
});

export const totalUserStakingUnitsAtom = atom((get) => {
  const stakes = get(userStakesAtom);
  if (!stakes) return null;
  return stakes.reduce((sum, stake) => sum + stake.stakingUnits, 0);
});

export const userAverageMultiplierAtom = atom((get) => {
  const stakes = get(userStakesAtom);
  const totalStaked = get(totalUserStakedAtom);
  const totalUnits = get(totalUserStakingUnitsAtom);
  
  if (!stakes || totalStaked === null || totalUnits === null) return null;
  if (totalStaked === 0) return 0;
  
  console.log(`Average Multiplier Calc: ${totalUnits} units / ${totalStaked} staked = ${totalUnits / totalStaked}`);
  
  return totalUnits / totalStaked;
});

export const userPoolShareAtom = atom((get) => {
  const userStakingWeight = get(totalUserStakingUnitsAtom);
  const protocolTotalWeight = get(protocolTotalStakingWeightAtom);
  
  if (userStakingWeight === null || protocolTotalWeight === null) return null;
  if (protocolTotalWeight === 0) return 0;
  
  console.log(`Pool Share Calc: ${userStakingWeight} user weight / ${protocolTotalWeight} protocol weight = ${(userStakingWeight / protocolTotalWeight) * 100}%`);
  
  return (userStakingWeight / protocolTotalWeight) * 100;
});
