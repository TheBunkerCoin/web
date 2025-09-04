"use client"

import { LockIcon, FlameIcon, DropletIcon } from "lucide-react"
import { TokenomicsChart } from "@/components/dashboard/tokenomics-chart"
import { CirculatingChart } from "@/components/dashboard/circulating-chart"
import { AllocationTable } from "@/components/dashboard/allocation-table"
import { PriceChart } from "@/components/dashboard/price-chart"
import { HoldingsTable } from "@/components/dashboard/holdings-table"
import { getLockData, LockSummary, getLiquidityPoolData, getBurnedTokenData, LiquidityPool } from "@/lib/solana"
import { useEffect, useState } from "react"

export default function DashboardPage() {
  const [lockData, setLockData] = useState<LockSummary | null>(null)
  const [liquidityData, setLiquidityData] = useState<number>(0)
  const [burnedData, setBurnedData] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [liquidityPools, setLiquidityPools] = useState<LiquidityPool[]>([])

  useEffect(() => {
     const fetchData = async () => {
       try {
        const [lockDataResult, liquidityInfoResult, burnedDataResult] = await Promise.all([
          getLockData(),
          getLiquidityPoolData(),
          getBurnedTokenData()
        ])

        const liquidityDataResult = liquidityInfoResult.total;

        setLiquidityPools(liquidityInfoResult.pools);

        const validLocks = lockDataResult && lockDataResult.totalLocked > 0;
        const validLiquidity = liquidityDataResult > 0;
        const validBurned = burnedDataResult > 0;

        setLockData(lockDataResult)
        setLiquidityData(liquidityDataResult)
        setBurnedData(burnedDataResult)

        if (!(validLocks && validLiquidity && validBurned)) {
          setTimeout(fetchData, 10_000)
        }
       } catch (error) {
         console.error("Error fetching data:", error)
        setTimeout(fetchData, 10_000)
       } finally {
         setLoading(false)
       }
     }

    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Transparency Dashboard</h1>
          <p className="text-neutral-400">Real-time insights into BunkerCoin&apos;s tokenomics and distribution</p>
        </div>

        <div className="flex flex-col gap-8 w-full">
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Locked Tokens</h2>
              <p className="text-neutral-400 text-sm">Real-time overview of token locks, burns, and liquidity pools</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <div className="relative bg-gradient-radial-green border border-neutral-800 hover:border-neutral-700 transition-colors rounded-xl p-4">
                <LockIcon className="absolute top-4 right-4 size-5 text-bunker-green opacity-30" />
                <div className="text-neutral-400 text-sm mb-1">Tokens Locked</div>
                <div className="text-xl font-semibold tabular-nums mb-1">
                  {loading ? (
                    <span className="text-neutral-500">Loading...</span>
                  ) : (
                    <span className="text-bunker-green/70 font-normal">
                      {lockData?.totalLocked?.toLocaleString() || 0} BUNKER
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-bunker-green">
                  {lockData ? ((lockData.totalLocked / 1_000_000_000) * 100).toFixed(2) : 0}%
                </div>
                <div className="text-neutral-500 text-xs">
                  of total supply
                </div>
              </div>
              
              <div className="relative bg-gradient-radial-orange border border-neutral-800 hover:border-neutral-700 transition-colors rounded-xl p-4">
                <FlameIcon className="absolute top-4 right-4 size-5 text-orange-500 opacity-30" />
                <div className="text-neutral-400 text-sm mb-1">Total Burned</div>
                <div className="text-xl font-semibold tabular-nums mb-1">
                  {loading ? (
                    <span className="text-neutral-500">Loading...</span>
                  ) : (
                    <span className="text-orange-500/70 font-normal">
                      {burnedData.toLocaleString()} BUNKER
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-orange-400">
                  {((burnedData / 1_000_000_000) * 100).toFixed(2)}%
                </div>
                <div className="text-neutral-500 text-xs">
                  of total supply
                </div>
              </div>
              
              <div className="relative bg-gradient-radial-blue border border-neutral-800 hover:border-neutral-700 transition-colors rounded-xl p-4">
                <DropletIcon className="absolute top-4 right-4 size-5 text-blue-500 opacity-30" />
                <div className="text-neutral-400 text-sm mb-1">Locked Liquidity</div>
                <div className="text-xl font-semibold tabular-nums mb-1">
                  {loading ? (
                    <span className="text-neutral-500">Loading...</span>
                  ) : (
                    <span className="text-blue-500 font-normal">
                      {liquidityData.toLocaleString()} BUNKER
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  {((liquidityData / 1_000_000_000) * 100).toFixed(2)}%
                </div>
                <div className="text-neutral-500 text-xs">
                  of total supply
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Tokenomics</h2>
              <p className="text-neutral-400 text-sm">Distribution breakdown and allocation details</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-8 w-full">
              <div className="w-full lg:w-[500px] shrink-0 bg-neutral-900/50 rounded-xl p-6 border border-neutral-800">
                <TokenomicsChart />
              </div>
              <div className="flex-1 bg-neutral-900/50 rounded-xl p-6 border border-neutral-800">
                <AllocationTable liquidityPools={liquidityPools} />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Circulating Overview</h2>
              <p className="text-neutral-400 text-sm">Current supply distribution across different categories</p>
            </div>
            <div className="bg-neutral-900/50 rounded-xl p-4 md:p-6 border border-neutral-800">
              <div className="h-[300px] md:h-[350px]">
                <CirculatingChart lockData={lockData} liquidityData={liquidityData} burnedData={burnedData} />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Price & Market Data</h2>
              <p className="text-neutral-400 text-sm">Live market data and historical price chart</p>
            </div>
            <div className="w-full h-[500px] bg-neutral-900/50 rounded-xl p-6 border border-neutral-800">
              <PriceChart />
            </div>
          </div>

          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Top Holders</h2>
              <p className="text-neutral-400 text-sm">View the top holders of BunkerCoin</p>
            </div>
            <div className="bg-neutral-900/50 rounded-xl p-4 md:p-6 border border-neutral-800">
              <HoldingsTable />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 