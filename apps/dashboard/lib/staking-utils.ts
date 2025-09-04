import { UserStake } from './staking-atoms';

export async function fetchUserStakes(walletAddress: string, opts?: { uncached?: boolean }): Promise<UserStake[]> {
  try {
    const useUncached = !!opts?.uncached;
    const response = await fetch(useUncached ? '/api/locks?uncached=1' : '/api/locks');
    if (!response.ok) {
      throw new Error('Failed to fetch locks data');
    }
    
    const data = await response.json();
    if (!data.accounts || !Array.isArray(data.accounts)) {
      return [];
    }
    
    const userStakingLocks = data.accounts.filter((account: any) => {
      return (
        account.creator === walletAddress &&
        account.name &&
        typeof account.name === 'string' &&
        account.name.toUpperCase().startsWith('BUNKER STAKING')
      );
    });
    
    const userStakes: UserStake[] = userStakingLocks.map((lock: any) => {
      let lockDuration = '3 months';
      let multiplier = 1.0;
      
      /*console.log(`Lock data for ${lock.pubkey?.slice(0,8)}:`, {
        cliffTime: lock.cliffTime,
        startDate: lock.startDate,
        unlockDate: lock.unlockDate,
        frequency: lock.frequency,
        numberOfPeriods: lock.numberOfPeriods
      });*/

      if (lock.startDate) {
        const startTimeMs = new Date(lock.startDate).getTime();
        const cliffMs = lock.cliffTime ? lock.cliffTime * 1000 : 0;
        const hasFreq = Number.isFinite(lock.frequency) && (lock.frequency as number) > 0;
        const hasPeriods = Number.isFinite(lock.numberOfPeriods) && (lock.numberOfPeriods as number) > 0;
        const endByScheduleMs = hasFreq && hasPeriods
          ? startTimeMs + (lock.frequency as number) * (lock.numberOfPeriods as number) * 1000
          : 0;
        const endMs = Math.max(cliffMs, endByScheduleMs);
        const durationDays = endMs > 0 ? Math.round((endMs - startTimeMs) / (1000 * 60 * 60 * 24)) : 0;
        
        if (durationDays < 0 || durationDays > 1000) {
          const cliffIso = lock.cliffTime ? new Date(lock.cliffTime * 1000).toISOString() : 'n/a';
          console.warn(`Suspicious duration for ${lock.pubkey?.slice(0,8)}: ${durationDays} days. Start: ${new Date(lock.startDate).toISOString()}, Cliff: ${cliffIso}`);
        }
        
        console.log(`Lock ${lock.pubkey?.slice(0,8)}: Start=${new Date(startTimeMs).toISOString()}, End=${endMs > 0 ? new Date(endMs).toISOString() : 'unknown'}, Duration=${durationDays} days`);
        
        if (durationDays <= 35) {
          lockDuration = '1 month';
          multiplier = 0.4;
        } else if (durationDays <= 100) { 
          lockDuration = '3 months'; 
          multiplier = 1.0;
        } else if (durationDays <= 190) {
          lockDuration = '6 months';
          multiplier = 2.0;
        } else if (durationDays >= 350) {
          lockDuration = '12 months';
          multiplier = 4.0;
        } else {
          const monthsApprox = durationDays / 30;
          lockDuration = `${Math.round(monthsApprox)} months`;
          multiplier = Math.min(4.0, Math.max(0.4, monthsApprox / 3));
        }
      } else {
        const durationMatch = lock.name.match(/BUNKER\s+STAKING\s+(\d+)(M|Y)/i);
        if (durationMatch) {
          const num = parseInt(durationMatch[1]);
          const unit = durationMatch[2].toUpperCase();
          
          if (unit === 'M') {
            lockDuration = `${num} month${num > 1 ? 's' : ''}`;
            if (num === 1) multiplier = 0.4;
            else if (num === 3) multiplier = 1.0;
            else if (num === 6) multiplier = 2.0;
            else if (num === 12) multiplier = 4.0;
            else multiplier = 1.0;
          } else if (unit === 'Y') {
            lockDuration = `${num} year${num > 1 ? 's' : ''}`;
            multiplier = 4.0;
          }
        }
      }
      
      const stakingUnits = lock.amount * multiplier;
      
      console.log(`User Stake: ${lock.name} | Amount: ${lock.amount} | Multiplier: ${multiplier} | Units: ${stakingUnits}`);
      
      const startDate = lock.startDate ? new Date(lock.startDate) : new Date();
      let endDate = lock.unlockDate ? new Date(lock.unlockDate) : new Date();
      
      if (lock.cliffTime && lock.frequency && lock.numberOfPeriods) {
        const cliffDate = new Date(lock.cliffTime * 1000);
        const totalDuration = lock.frequency * lock.numberOfPeriods * 1000;
        const calculatedEndDate = new Date(startDate.getTime() + totalDuration);
        
        endDate = cliffDate > calculatedEndDate ? cliffDate : calculatedEndDate;
      }

      return {
        id: lock.pubkey,
        pubkey: lock.pubkey,
        creator: lock.creator,
        amount: lock.amount,
        lockDuration,
        multiplier,
        stakingUnits,
        startDate,
        endDate,
        status: lock.amount > 0 ? 'active' : 'claimed',
        estimatedRewards: 0,
      };
    });
    
    return userStakes;
  } catch (error) {
    console.error('Error fetching user stakes:', error);
    return [];
  }
}

export function parseDurationCode(duration: string): string {
  switch (duration.toLowerCase()) {
    case '1 month':
    case '1m':
      return '1M';
    case '3 months':
    case '3m':
      return '3M';
    case '6 months':
    case '6m':
      return '6M';
    case '12 months':
    case '1 year':
    case '12m':
    case '1y':
      return '12M';
    default:
      return '3M';
  }
}

export function createStakingLockName(duration: string): string {
  const code = parseDurationCode(duration);
  return `BUNKER STAKING ${code}`;
}
