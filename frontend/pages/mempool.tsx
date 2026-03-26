import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  Zap,
  Eye,
  Clock,
  Filter,
} from 'lucide-react';
import axios from 'axios';

interface Intent {
  orderHash: string;
  order: {
    orderData: {
      assetPair: string;
      fillDeadline: number;
      limitPriceCommitment: string;
      zkMaskApplied: boolean;
    };
    inputs: Array<{ token: string; amount: string }>;
    swapper: string;
    originChainId: number;
  };
  createdAt: number;
}

interface Bid {
  orderHash: string;
  solverAddress: string;
  finalAggregateQuote: string;
  bidExpiry: number;
  evmWeightBps?: number;
  solanaWeightBps?: number;
}

const MempoolPage: NextPage = () => {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [bids, setBids] = useState<Record<string, Bid[]>>({});
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchIntents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Intent[]>('/api/intents/active', {
        timeout: 5000,
      });
      setIntents(res.data);
      setLastRefresh(new Date());

      // Fetch bids for each intent
      for (const intent of res.data) {
        try {
          const bidRes = await axios.get<Bid[]>(
            `/api/bids/${intent.orderHash}`,
            { timeout: 3000 }
          );
          setBids((prev) => ({ ...prev, [intent.orderHash]: bidRes.data }));
        } catch {
          // ignore bid fetch errors
        }
      }
    } catch {
      // silently handle when gateway is offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntents();
  }, [fetchIntents]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchIntents, 3000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchIntents]);

  const timeRemaining = (deadline: number) => {
    const secs = deadline - Math.floor(Date.now() / 1000);
    if (secs <= 0) return 'Expired';
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  return (
    <>
      <Head>
        <title>Gateway Mempool — ZK-RFQ Sovereign Gateway</title>
        <meta
          name="description"
          content="Live view of the Essential sovereign solution pool. Monitor active ERC-7683 intents and ZK-masked solver bids."
        />
      </Head>

      {/* Aurora background orbs */}
      <div className="aurora-orb aurora-orb-1" />
      <div className="aurora-orb aurora-orb-2" />
      <div className="aurora-orb aurora-orb-3" />

      <div className="min-h-screen relative">
        {/* Nav */}
        <nav className="nav-glass flex items-center justify-between px-8 py-4 relative z-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={15} />
            Back
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              id="auto-refresh-toggle"
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                autoRefresh
                  ? 'border-settle-500/40 text-settle-300 bg-settle-500/10'
                  : 'border-slate-700 text-slate-500'
              }`}
            >
              <RefreshCw
                size={11}
                className={autoRefresh ? 'animate-spin' : ''}
                style={{ animationDuration: '3s' }}
              />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={fetchIntents}
              id="manual-refresh-btn"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link href="/settlement">
              <button className="text-sm px-4 py-1.5 rounded-lg border border-settle-500/30 text-settle-300 hover:border-settle-400/50 hover:shadow-[0_0_16px_rgba(16,185,129,0.15)] transition-all">
                Settlement Log →
              </button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-1 text-xs text-slate-600 font-mono uppercase tracking-widest">
                <Link href="/" className="hover:text-slate-400 transition-colors">Overview</Link>
                <span>/</span>
                <span className="text-slate-500">Gateway Mempool</span>
              </div>
              <h1
                className="text-white font-bold flex items-center gap-3 mb-1.5 tracking-tight whitespace-nowrap"
                style={{ fontSize: '22px', letterSpacing: '-0.02em' }}
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-intent-500 to-intent-700 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Activity size={16} className="text-white" />
                </div>
                Sovereign Pool Mempool
              </h1>
              <p className="text-slate-500 text-sm ml-11 whitespace-nowrap">
                Solution pool ·{' '}
                <span className="text-slate-400">{intents.length} active intent{intents.length !== 1 ? 's' : ''}</span>
                {lastRefresh && (
                  <span className="ml-3 text-slate-600">
                    Updated {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="glass-card px-4 py-2.5 flex items-center gap-2.5 whitespace-nowrap">
                <span className="pulse-ring pulse-ring-intent">
                  <span className="dot" style={{ width: '7px', height: '7px' }} />
                </span>
                <span className="text-intent-300 text-xs font-mono">
                  Solution Pool
                </span>
              </div>
              <div className="glass-card px-4 py-2.5 flex items-center gap-2">
                <Eye size={12} className="text-slate-500" />
                <span className="text-slate-400 text-xs">
                  {intents.length} active
                </span>
              </div>
            </div>
          </div>

          {/* Empty state */}
          {!loading && intents.length === 0 && (
            <div className="space-y-3">
              {/* Skeleton cards — depth effect */}
              {[
                { opacity: 0.28, pair: 'WETH/USDC', amount: '50.00', bids: 2, w1: 'w-28', w2: 'w-20', w3: 'w-36' },
                { opacity: 0.16, pair: 'WBTC/USDC', amount: '1.25', bids: 1, w1: 'w-24', w2: 'w-16', w3: 'w-28' },
                { opacity: 0.08, pair: 'SOL/USDC', amount: '200.00', bids: 3, w1: 'w-20', w2: 'w-24', w3: 'w-32' },
              ].map((sk, i) => (
                <div
                  key={i}
                  className="glass-card p-5 pointer-events-none select-none"
                  style={{ opacity: sk.opacity }}
                  aria-hidden="true"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-5 w-24 rounded-lg bg-white/10 skeleton" />
                        <div className="h-4 w-16 rounded-full bg-zk-600/20 skeleton" />
                        <div className="h-4 w-14 rounded-full bg-intent-500/15 skeleton" />
                      </div>
                      <div className="flex gap-4">
                        <div className={`h-3 ${sk.w3} rounded bg-white/6 skeleton`} />
                        <div className={`h-3 ${sk.w2} rounded bg-white/6 skeleton`} />
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <div className="h-7 w-6 mx-auto rounded bg-white/10 skeleton mb-1" />
                      <div className="h-3 w-12 rounded bg-white/6 skeleton" />
                    </div>
                    <div className="h-7 w-28 rounded-lg bg-white/6 skeleton shrink-0" />
                  </div>
                </div>
              ))}

              {/* Centered message overlay */}
              <div className="glass-card p-14 text-center -mt-2" style={{ background: 'rgba(2,4,8,0.88)', backdropFilter: 'blur(36px)' }}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/8 flex items-center justify-center mx-auto mb-5">
                  <Activity size={26} className="text-slate-600" />
                </div>
                <p className="text-slate-300 font-semibold text-base mb-2">
                  No active intents in sovereign pool
                </p>
                <p className="text-slate-600 text-sm mb-7 max-w-sm mx-auto">
                  Submit a block trade from the Trader Terminal to broadcast an ERC-7683 intent to the pool.
                </p>
                <Link href="/terminal">
                  <button className="btn-primary inline-block px-8 py-2.5 text-sm">
                    <span className="flex items-center gap-2">→ Open Trader Terminal</span>
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* Intent Cards */}
          <div className="space-y-4">
            <AnimatePresence>
              {intents.map((intent) => {
                const intentBids = bids[intent.orderHash] ?? [];
                const isExpanded = expanded === intent.orderHash;

                return (
                  <motion.div
                    key={intent.orderHash}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card overflow-hidden"
                  >
                    {/* Intent Header */}
                    <div
                      className="p-5 cursor-pointer"
                      onClick={() =>
                        setExpanded(isExpanded ? null : intent.orderHash)
                      }
                    >
                      <div className="flex items-center gap-4">
                        {/* Asset + Status */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-white font-bold text-lg tracking-tight">
                              {intent.order.orderData.assetPair}
                            </span>
                            <span className="badge badge-active">ERC-7683</span>
                            <span className="badge badge-zk">
                              <span className="w-1.5 h-1.5 rounded-full bg-zk-400 animate-pulse-slow" />
                              ZK-masked
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                            <span>
                              Hash: {intent.orderHash.slice(0, 16)}...
                              {intent.orderHash.slice(-8)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {timeRemaining(
                                intent.order.orderData.fillDeadline
                              )}
                            </span>
                            <span>
                              Swapper: {intent.order.swapper.slice(0, 10)}...
                            </span>
                          </div>
                        </div>

                        {/* Competing solutions count */}
                        <div className="text-center">
                          <div className="text-2xl font-bold gradient-text-zk" style={{ fontFeatureSettings: "'ss01' on" }}>
                            {intentBids.length}
                          </div>
                          <div className="text-xs text-slate-500">solution{intentBids.length !== 1 ? 's' : ''}</div>
                        </div>

                        {/* Inclusion auction status */}
                        <div className="w-28">
                          <div className="text-xs text-center px-2 py-1.5 rounded-lg border border-zk-600/20 bg-zk-600/8 text-zk-400">
                            {intentBids.length > 0
                              ? 'Inclusion auction'
                              : 'Awaiting solvers'}
                          </div>
                        </div>

                        <div
                          className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Expanded: Bids */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-white/5 overflow-hidden"
                        >
                          <div className="p-5">
                            <div className="flex items-center gap-2 mb-4">
                              <Filter size={13} className="text-slate-500" />
                              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                                Solver Bids — Multi-Chain Routing Masked
                              </span>
                            </div>

                            {intentBids.length === 0 ? (
                              <p className="text-slate-600 text-sm py-3">
                                No bids yet. Whitelisted solvers are querying
                                JIT liquidity...
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {intentBids.map((bid, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-4 p-3.5 rounded-xl bg-white/3 border border-white/5"
                                    style={{ borderLeft: '2px solid rgba(139,92,246,0.3)' }}
                                  >
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zk-600 to-intent-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                      {i + 1}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-white text-sm font-semibold" style={{ fontFeatureSettings: "'ss01' on" }}>
                                          $
                                          {(
                                            Number(bid.finalAggregateQuote) /
                                            1e6
                                          ).toFixed(4)}
                                        </span>
                                        <span className="badge badge-zk">
                                          Multi-Chain Routing Masked
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-500 font-mono">
                                        Solver: {bid.solverAddress.slice(0, 14)}
                                        ...
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                        {bid.evmWeightBps != null && (
                                          <span className="px-2 py-0.5 rounded-lg bg-intent-500/15 text-intent-300 font-mono">
                                            {bid.evmWeightBps / 100}% EVM
                                          </span>
                                        )}
                                        {bid.solanaWeightBps != null && (
                                          <span className="px-2 py-0.5 rounded-lg bg-zk-500/15 text-zk-300 font-mono">
                                            {bid.solanaWeightBps / 100}% SOL
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Zap
                                      size={14}
                                      className="text-intent-400 flex-shrink-0"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Limit Price Commitment */}
                            <div className="mt-4 p-3.5 rounded-xl bg-zk-600/8 border border-zk-600/20">
                              <div className="text-xs text-zk-400 mb-1 font-semibold uppercase tracking-wider">
                                Limit Price Commitment (on-chain)
                              </div>
                              <div className="font-mono text-xs text-slate-400 break-all leading-relaxed">
                                {intent.order.orderData.limitPriceCommitment}
                              </div>
                              <div className="text-xs text-slate-600 mt-1.5">
                                Plaintext limit price never leaves the
                                institution's process
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

export default MempoolPage;
