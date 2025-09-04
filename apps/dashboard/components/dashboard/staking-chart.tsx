'use client';

import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { BunkerIcon } from '@/components/ui/bunker-icon';

const generateStakingData = (months: number) => {
  const data = [];
  
  for (let i = 0; i <= months; i++) {
    const month = new Date();
    month.setMonth(month.getMonth() - (months - i));
    
    const reward = 0;
    const cumulative = 0;
    
    data.push({
      month: month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      fullDate: month.toISOString(),
      rewards: reward,
      cumulative: cumulative
    });
  }
  
  return data;
};

const timeFrames = [
  { label: '3M', value: 3, months: 3 },
  { label: '6M', value: 6, months: 6 },
  { label: '1Y', value: 12, months: 12 }
];

export function StakingChart() {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(12);
  const [viewType, setViewType] = useState<'monthly' | 'cumulative'>('cumulative');
  
  const data = generateStakingData(selectedTimeFrame);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-lg">
          <p className="text-neutral-300 text-sm mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white">
              {value.toFixed(0)}
            </p>
            <BunkerIcon size="sm" />
            <span className="text-xs text-neutral-400">
              BUNKER {viewType === 'monthly' ? 'monthly' : 'total'}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            ~$0.00 USD
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Staking Rewards</h3>
          <p className="text-sm text-neutral-400">Your earnings from staking over time</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setViewType('monthly')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewType === 'monthly'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewType('cumulative')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewType === 'cumulative'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Total
            </button>
          </div>
          
          <div className="flex bg-neutral-800 rounded-lg p-1">
            {timeFrames.map((timeFrame) => (
              <button
                key={timeFrame.value}
                onClick={() => setSelectedTimeFrame(timeFrame.months)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedTimeFrame === timeFrame.months
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {timeFrame.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis 
              dataKey="month"
              stroke="#71717a"
              fontSize={12}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              stroke="#71717a"
              fontSize={12}
              tickFormatter={(value) => `${value}`}
              axisLine={false}
              tickLine={false}
              width={20}
            />
            <Tooltip 
              content={<CustomTooltip />}
              contentStyle={{ 
                backgroundColor: '#18181b', 
                border: '1px solid #27272a',
                borderRadius: '8px' 
              }}
              labelStyle={{ color: '#a1a1aa' }}
              itemStyle={{ color: '#00FFB2' }}
            />
            <defs>
              <linearGradient id="stakingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00FFB2" stopOpacity={0.6} />
                <stop offset="50%" stopColor="#00FFB2" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00FFB2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey={viewType === 'monthly' ? 'rewards' : 'cumulative'}
              stroke="#00FFB2" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#00FFB2' }}
              fillOpacity={0.4}
              fill="url(#stakingGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-neutral-800">
        <div>
          <p className="text-xs text-neutral-400 mb-1">This Month</p>
          <p className="text-lg font-semibold text-white mb-1">0 BUNKER</p>
          <p className="text-xs text-neutral-400">~$0.00 USD</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400 mb-1">Last Month</p>
          <p className="text-lg font-semibold text-white mb-1">0 BUNKER</p>
          <p className="text-xs text-neutral-400">~$0.00 USD</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400 mb-1">Best Month</p>
          <p className="text-lg font-semibold text-white mb-1">0 BUNKER</p>
          <p className="text-xs text-neutral-400">~$0.00 USD</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400 mb-1">Total Earned</p>
          <p className="text-lg font-semibold text-white mb-1">0 BUNKER</p>
          <p className="text-xs text-neutral-400">~$0.00 USD</p>
        </div>
      </div>
    </div>
  );
}
