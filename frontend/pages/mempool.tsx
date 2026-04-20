import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  Zap,
  Eye,
  Clock,
  Filter,
  CheckCircle,
  ExternalLink,
  Lock,
  EyeOff,
} from 'lucide-react';

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
  settled?: boolean;
}

interface SettlementResult {
  status: 'settled' | 'awaiting_institution_approval' | 'not_found';
  txHash?: string;
  blockNumber?: number;
  etherscanUrl?: string;
  solverAddress?: string;
  aggregateQuote?: string;
  bidTimestamp?: number;
}

const MempoolPage: NextPage = () => {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [bids, setBids] = useState<Record<string, Bid[]>>({});
  const [settlements, setSettlements] = useState<Record<string, SettlementResult>>({});
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Approval UI state per order
  const [approvalLimit, setApprovalLimit] = useState<Record<string, string>>({});
  const [showApprovalLimit, setShowApprovalLimit] = useState<Record<string, boolean>>({});
  const [approving, setApproving] = useState<Record<string, boolean>>({});

  const fetchIntents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Intent[]>('/api/intents/active', {
        timeout: 5000,
      });
      setIntents(res.data);
      setLastRefresh(new Date());

      for (const intent of res.data) {
        try {
          const bidRes = await axios.get<Bid[]>(
            `/api/bids/${intent.orderHash}`,
            { timeout: 3000 },
          );
          setBids((prev) => ({ ...prev, [intent.orderHash]: bidRes.data }));
        } catch {
          // ignore
        }

        // Fetch settlement status
        try {
          const settleRes = await axios.get<SettlementResult>(
            `/api/settlement/${intent.orderHash}`,
            { timeout: 3000 },
          );
          if (settleRes.data.status !== 'not_found') {
            setSettlements((prev) => ({ ...prev, [intent.orderHash]: settleRes.data }));
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // gateway offline
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

  const handleApprove = async (orderHash: string) => {
    const limit = approvalLimit[orderHash];
    if (!limit) {
      toast.error('Enter your secret limit price first');
      return;
    }

    setApproving((prev) => ({ ...prev, [orderHash]: true }));
    try {
      // Convert limit price (display dollars) to 1e6 fixed-point string
      const limitMicro = Math.round(parseFloat(limit) * 1e6).toString();

      const res = await axios.post('/api/settlement/prove-and-settle', {
        orderHash,
        institutionLimit: limitMicro,
      });

      if (res.data.settled) {
        toast.success('Settlement confirmed on Sepolia!');
        setSettlements((prev) => ({
          ...prev,
          [orderHash]: {
            status: 'settled',
            txHash: res.data.txHash,
            blockNumber: res.data.blockNumber,
            etherscanUrl: res.data.etherscanUrl,
          },
        }));
        // Clear approval form
        setApprovalLimit((prev) => { const n = { ...prev }; delete n[orderHash]; return n; });
      } else {
        toast.error(res.data.error ?? 'Settlement failed');
      }
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? err.response?.data?.message ?? err.message)
        : String(err);
      toast.error(`Approval failed: ${msg}`);
    } finally {
      setApproving((prev) => ({ ...prev, [orderHash]: false }));
    }
  };

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

      <div className="aurora-orb aurora-orb-1" />
      <div className="aurora-orb aurora-orb-2" />
      <div className="aurora-orb aurora-orb-3" />

      <div className="min-h-screen relative">
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
              {[
                { opacity: 0.28 },
                { opacity: 0.16 },
                { opacity: 0.08 },
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
                      </div>
                      <div className="flex gap-4">
                        <div className="h-3 w-36 rounded bg-white/6 skeleton" />
                        <div className="h-3 w-20 rounded bg-white/6 skeleton" />
                      </div>
                    </div>
                    <div className="h-7 w-28 rounded-lg bg-white/6 skeleton shrink-0" />
                  </div>
                </div>
              ))}

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

          <div className="space-y-4">
            <AnimatePresence>
              {intents.map((intent) => {
                const intentBids = bids[intent.orderHash] ?? [];
                const settlement = settlements[intent.orderHash];
                const isExpanded = expanded === intent.orderHash;
                const isSettled = settlement?.status === 'settled';
                const awaitingApproval = settlement?.status === 'awaiting_institution_approval'
                  || (intentBids.some((b) => b.settled) && !isSettled);

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
                            {isSettled && (
                              <span className="badge badge-settle flex items-center gap-1">
                                <CheckCircle size={10} />
                                Settled on Sepolia
                              </span>
                            )}
                            {awaitingApproval && !isSettled && (
                              <span className="badge" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                                Awaiting Approval
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                            <span>
                              Hash: {intent.orderHash.slice(0, 16)}...
                              {intent.orderHash.slice(-8)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {timeRemaining(intent.order.orderData.fillDeadline)}
                            </span>
                            <span>
                              Swapper: {intent.order.swapper.slice(0, 10)}...
                            </span>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-2xl font-bold gradient-text-zk" style={{ fontFeatureSettings: "'ss01' on" }}>
                            {intentBids.length}
                          </div>
                          <div className="text-xs text-slate-500">solution{intentBids.length !== 1 ? 's' : ''}</div>
                        </div>

                        <div className="w-28">
                          <div className={`text-xs text-center px-2 py-1.5 rounded-lg border ${
                            isSettled
                              ? 'border-settle-500/30 bg-settle-500/8 text-settle-400'
                              : intentBids.length > 0
                              ? 'border-zk-600/20 bg-zk-600/8 text-zk-400'
                              : 'border-slate-700/30 bg-transparent text-slate-600'
                          }`}>
                            {isSettled ? 'Settled' : intentBids.length > 0 ? 'Inclusion auction' : 'Awaiting solvers'}
                          </div>
                        </div>

                        <div className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-white/5 overflow-hidden"
                        >
                          <div className="p-5 space-y-5">
                            {/* Solver Bids */}
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <Filter size={13} className="text-slate-500" />
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                                  Solver Bids — Multi-Chain Routing Masked
                                </span>
                              </div>

                              {intentBids.length === 0 ? (
                                <p className="text-slate-600 text-sm py-3">
                                  No bids yet. Whitelisted solvers are querying JIT liquidity...
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
                                          <span className="text-white text-sm font-semibold">
                                            ${(Number(bid.finalAggregateQuote) / 1e6).toFixed(4)}
                                          </span>
                                          <span className="badge badge-zk">Routing Masked</span>
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono">
                                          Solver: {bid.solverAddress.slice(0, 14)}...
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
                                      <Zap size={14} className="text-intent-400 flex-shrink-0" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* On-chain Settlement Result */}
                            {isSettled && settlement && (
                              <div className="p-4 rounded-xl bg-settle-500/8 border border-settle-500/30">
                                <div className="flex items-center gap-2 mb-3">
                                  <CheckCircle size={14} className="text-settle-400" />
                                  <span className="text-xs font-semibold text-settle-300 uppercase tracking-widest">
                                    Settlement Confirmed on Sepolia
                                  </span>
                                </div>
                                <div className="space-y-1.5 text-xs font-mono">
                                  {settlement.txHash && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                      <span className="text-slate-600">Tx:</span>
                                      <span className="text-white">{settlement.txHash.slice(0, 20)}...{settlement.txHash.slice(-8)}</span>
                                      {settlement.etherscanUrl && (
                                        <a
                                          href={settlement.etherscanUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-intent-300 hover:text-intent-200 transition-colors"
                                        >
                                          <ExternalLink size={11} />
                                          Etherscan
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {settlement.blockNumber && (
                                    <div className="text-slate-500">
                                      Block #{settlement.blockNumber}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Institution Approval Panel */}
                            {!isSettled && intentBids.length > 0 && (
                              <div className="p-4 rounded-xl bg-zk-600/8 border border-zk-600/25">
                                <div className="flex items-center gap-2 mb-3">
                                  <Lock size={13} className="text-zk-400" />
                                  <span className="text-xs font-semibold text-zk-300 uppercase tracking-widest">
                                    Institution Approval
                                  </span>
                                  <span className="ml-auto text-xs text-slate-600">
                                    limit_check ZK proof generated server-side
                                  </span>
                                </div>
                                <p className="text-slate-500 text-xs mb-3 leading-relaxed">
                                  Enter your secret limit price to approve settlement.
                                  If the solver's aggregate quote meets your limit, a Noir proof is
                                  generated and both proofs are submitted to Sepolia.
                                </p>
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type={showApprovalLimit[intent.orderHash] ? 'number' : 'password'}
                                      step="0.01"
                                      min="0"
                                      placeholder="Limit price (e.g. 2490.00)"
                                      value={approvalLimit[intent.orderHash] ?? ''}
                                      onChange={(e) =>
                                        setApprovalLimit((prev) => ({
                                          ...prev,
                                          [intent.orderHash]: e.target.value,
                                        }))
                                      }
                                      className="input-sovereign w-full text-sm pr-9"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowApprovalLimit((prev) => ({
                                          ...prev,
                                          [intent.orderHash]: !prev[intent.orderHash],
                                        }))
                                      }
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                      {showApprovalLimit[intent.orderHash] ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => handleApprove(intent.orderHash)}
                                    disabled={approving[intent.orderHash] || !approvalLimit[intent.orderHash]}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-settle-500/20 border border-settle-500/40 text-settle-300 hover:bg-settle-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                  >
                                    {approving[intent.orderHash] ? (
                                      <>
                                        <span className="w-3 h-3 border border-settle-400/40 border-t-settle-300 rounded-full animate-spin" />
                                        Proving...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle size={12} />
                                        Approve &amp; Settle
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Limit Price Commitment */}
                            <div className="p-3.5 rounded-xl bg-zk-600/8 border border-zk-600/20">
                              <div className="text-xs text-zk-400 mb-1 font-semibold uppercase tracking-wider">
                                Limit Price Commitment (on-chain)
                              </div>
                              <div className="font-mono text-xs text-slate-400 break-all leading-relaxed">
                                {intent.order.orderData.limitPriceCommitment}
                              </div>
                              <div className="text-xs text-slate-600 mt-1.5">
                                Plaintext limit price never stored
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
