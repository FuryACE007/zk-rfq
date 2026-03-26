import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Cpu,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  RefreshCw,
} from 'lucide-react';
import axios from 'axios';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'success' | 'info' | 'proof' | 'warn' | 'error';
  message: string;
}

interface Settlement {
  orderHash: string;
  txHash: string;
  blockNumber: number | null;
  solver: string;
  aggregateQuote: string;
  simulated?: boolean;
  timestamp: string;
}

// Demo/mock log generator for when gateway isn't running
function generateDemoLog(tick: number): LogEntry[] {
  const ts = new Date().toLocaleTimeString();
  const entries: LogEntry[][] = [
    [
      {
        id: `${tick}-1`,
        timestamp: ts,
        type: 'info',
        message:
          '🔍 Polling Essential sovereign solution pool for active ERC-7683 intents...',
      },
    ],
    [
      {
        id: `${tick}-1`,
        timestamp: ts,
        type: 'info',
        message: '📋 Intent found: WETH/USDC — hash 0xa3f2b1...e9d7',
      },
      {
        id: `${tick}-2`,
        timestamp: ts,
        type: 'info',
        message: '🌐 Initiating JIT multi-chain liquidity aggregation...',
      },
    ],
    [
      {
        id: `${tick}-1`,
        timestamp: ts,
        type: 'info',
        message: '🔵 [Uniswap V3] EVM quote: $2,498.42 USDC — latency: 143ms',
      },
      {
        id: `${tick}-2`,
        timestamp: ts,
        type: 'info',
        message:
          '🟣 [Jupiter / Solana] Solana quote: $2,495.88 USDC — latency: 267ms',
      },
    ],
    [
      {
        id: `${tick}-1`,
        timestamp: ts,
        type: 'info',
        message: '⚖️  Optimal route: 62% Uniswap (EVM) | 38% Jupiter (Solana)',
      },
      {
        id: `${tick}-2`,
        timestamp: ts,
        type: 'info',
        message:
          '💡 Aggregate quote computed: $2,497.38 USDC [PRIVATE DEX prices sealed]',
      },
    ],
    [
      {
        id: `${tick}-1`,
        timestamp: ts,
        type: 'proof',
        message: '⚙️  Generating Noir ZK-proof (blind_aggregate_matcher)...',
      },
      {
        id: `${tick}-2`,
        timestamp: ts,
        type: 'proof',
        message: '   Public inputs: final_aggregate_quote = 2497380000',
      },
      {
        id: `${tick}-3`,
        timestamp: ts,
        type: 'proof',
        message:
          '   Private inputs: [uniswap_price, jupiter_price, dex_weights, institutional_limit] → SEALED',
      },
    ],
    [
      {
        id: `${tick}-1`,
        timestamp: ts,
        type: 'proof',
        message: '✅ Noir Proof Verified: Aggregate Price Met',
      },
      {
        id: `${tick}-2`,
        timestamp: ts,
        type: 'success',
        message: '📤 ZK-bid submitted to gateway — solver 0xWhitelisted...',
      },
    ],
    [
      {
        id: `${tick}-1`,
        timestamp: ts,
        type: 'success',
        message: '🏆 Best bid selected: $2,497.38 USDC (3/3 bids received)',
      },
      {
        id: `${tick}-2`,
        timestamp: ts,
        type: 'info',
        message: '🏛️  Submitting settlement solution to Essential server...',
      },
    ],
    [
      {
        id: `${tick}-1`,
        timestamp: ts,
        type: 'success',
        message: '✅ Noir Proof Verified: Aggregate Price Met',
      },
      {
        id: `${tick}-2`,
        timestamp: ts,
        type: 'success',
        message: '🔄 Solution included in Essential block #12 — all Pint constraints satisfied',
      },
      {
        id: `${tick}-3`,
        timestamp: ts,
        type: 'success',
        message: '────────────── Settlement Complete ──────────────',
      },
    ],
  ];

  return entries[tick % entries.length] ?? [];
}

const SettlementPage: NextPage = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [demoTick, setDemoTick] = useState(0);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Demo log ticker
  useEffect(() => {
    if (!demoMode) return;
    const id = setInterval(() => {
      setDemoTick((t) => {
        const newEntries = generateDemoLog(t);
        setLogs((prev) => [...prev, ...newEntries].slice(-80));
        return t + 1;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [demoMode]);

  // Poll Essential server block number
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await axios.get('/api/health/essential-block', {
          timeout: 2000,
        });
        if (res.data.online) {
          setBlockNumber(res.data.number);
          if (!demoMode) {
            setLogs((prev) =>
              [
                ...prev,
                {
                  id: `block-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  type: 'info' as const,
                  message: `📦 Essential block: ${res.data.number} — Essential server online`,
                },
              ].slice(-80)
            );
          }
        }
      } catch {
        if (!demoMode) {
          setLogs((prev) =>
            [
              ...prev,
              {
                id: `no-node-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString(),
                type: 'warn' as const,
                message:
                  '⚠️  Essential server offline — run: npm run essential:up',
              },
            ].slice(-80)
          );
        }
      }
    };

    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [demoMode]);

  const activateDemoMode = () => {
    setDemoMode(true);
    setLogs([
      {
        id: 'demo-start',
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        message:
          '🚀 Demo Mode activated — simulating full ZK-RFQ settlement flow',
      },
    ]);
  };

  const logColorClass = (type: LogEntry['type']) => {
    const map: Record<string, string> = {
      success: 'success',
      info: 'info',
      proof: 'proof',
      warn: 'warn',
      error: 'error',
    };
    return map[type] ?? 'info';
  };

  return (
    <>
      <Head>
        <title>Settlement Monitor — ZK-RFQ Sovereign Gateway</title>
        <meta
          name="description"
          content="Monitor the Essential declarative settlement server. Watch Noir proof verification and solution inclusion in real-time."
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
            href="/mempool"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={15} />
            Back to Mempool
          </Link>
          <div className="flex items-center gap-3">
            {blockNumber !== null ? (
              <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-settle-500/40 text-settle-300 bg-settle-500/10">
                <span className="pulse-ring pulse-ring-settle">
                  <span className="dot" style={{ width: '6px', height: '6px' }} />
                </span>
                Essential · Block #{blockNumber}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-400/70">
                <Clock size={11} />
                Essential server offline
              </div>
            )}
            <button
              onClick={activateDemoMode}
              id="demo-mode-btn"
              className={`text-sm px-4 py-1.5 rounded-lg border transition-all ${
                demoMode
                  ? 'border-zk-500/40 text-zk-300 bg-zk-600/10'
                  : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              {demoMode ? '⚡ Demo Running' : 'Run Demo Simulation'}
            </button>
            <button
              onClick={() => {
                setLogs([]);
                setDemoMode(false);
                setDemoTick(0);
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-800 text-slate-600 hover:text-slate-400 transition-all"
            >
              Clear
            </button>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
          {/* Page Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-1 text-xs text-slate-600 font-mono uppercase tracking-widest">
              <Link href="/" className="hover:text-slate-400 transition-colors">Overview</Link>
              <span>/</span>
              <Link href="/mempool" className="hover:text-slate-400 transition-colors">Mempool</Link>
              <span>/</span>
              <span className="text-slate-500">Settlement Monitor</span>
            </div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-settle-500 to-settle-600 flex items-center justify-center shadow-lg">
                <Cpu size={15} className="text-white" />
              </div>
              <h1
                className="font-bold text-white tracking-tight"
                style={{ fontSize: '26px', letterSpacing: '-0.02em' }}
              >
                Local Settlement Monitor
              </h1>
            </div>
            <p className="text-slate-500 text-sm ml-11">
              Essential declarative protocol server · Noir proof verification + solution inclusion
            </p>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {/* Main Terminal — 2 columns */}
            <div className="col-span-2">
              <div className="terminal h-[600px] flex flex-col">
                <div className="terminal-header">
                  <div
                    className="terminal-dot"
                    style={{ background: '#f43f5e', color: '#f43f5e' }}
                  />
                  <div
                    className="terminal-dot"
                    style={{ background: '#f59e0b', color: '#f59e0b' }}
                  />
                  <div
                    className="terminal-dot"
                    style={{ background: '#10b981', color: '#10b981' }}
                  />
                  <span className="ml-2 text-xs text-settle-400/70 font-mono">
                    essential-server · Pint Declarative VM
                  </span>
                  {demoMode && (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-zk-400">
                      <RefreshCw size={9} className="animate-spin" />
                      Live demo
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                  {logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-12 h-12 rounded-xl bg-white/4 border border-white/6 flex items-center justify-center mb-4">
                        <Cpu size={22} className="text-slate-600" />
                      </div>
                      <p className="text-slate-600 text-sm font-mono">
                        Waiting for settlement activity...
                      </p>
                      <p className="text-slate-700 text-xs mt-1 font-mono">
                        Start Essential server or activate Demo Mode
                      </p>
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {logs.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`log-entry ${logColorClass(entry.type)}`}
                      >
                        <span className="log-ts">[{entry.timestamp}]</span>
                        {entry.message}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-4">
              {/* Node Status */}
              <div className="glass-card-settle p-5">
                <h3 className="text-xs font-semibold text-settle-300 mb-4 uppercase tracking-widest flex items-center gap-1.5">
                  <Shield size={11} />
                  Infrastructure Status
                </h3>
                <div className="space-y-1">
                  {[
                    {
                      label: 'Essential Server',
                      status:
                        blockNumber !== null ? 'Connected' : 'Offline',
                      ok: blockNumber !== null,
                      accent: blockNumber !== null ? '#10b981' : '#f43f5e',
                    },
                    {
                      label: 'Block Builder',
                      status:
                        blockNumber !== null
                          ? `Block #${blockNumber}`
                          : 'Offline',
                      ok: blockNumber !== null,
                      accent: blockNumber !== null ? '#10b981' : '#f43f5e',
                    },
                    { label: 'Noir Prover', status: 'PoC Mock Mode', ok: true, accent: '#8b5cf6' },
                    {
                      label: 'Gateway API',
                      status: 'Localhost:4000',
                      ok: true,
                      accent: '#06b6d4',
                    },
                    { label: 'Public RPC', status: 'Not required', ok: true, accent: '#10b981' },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between text-xs py-2 px-2 rounded-lg"
                      style={{
                        borderLeft: `2px solid ${row.accent}`,
                        background: `${row.accent}08`,
                      }}
                    >
                      <span className="text-slate-400">{row.label}</span>
                      <span
                        className={`flex items-center gap-1 font-mono text-xs ${
                          row.ok ? 'text-settle-400' : 'text-danger-400'
                        }`}
                      >
                        {row.ok ? (
                          <CheckCircle size={10} />
                        ) : (
                          <XCircle size={10} />
                        )}
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="glass-card p-5">
                <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-widest">
                  Log Legend
                </h3>
                <div className="space-y-2">
                  {[
                    { color: '#10b981', label: 'Settlement event' },
                    { color: '#06b6d4', label: 'System info' },
                    { color: '#8b5cf6', label: 'ZK proof step' },
                    { color: '#f59e0b', label: 'Warning' },
                    { color: '#f43f5e', label: 'Error' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 text-xs text-slate-500"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: item.color,
                          boxShadow: `0 0 6px ${item.color}80`,
                        }}
                      />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Start */}
              <div className="glass-card p-5">
                <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-widest">
                  Quick Start
                </h3>
                <div className="space-y-0.5 font-mono text-xs rounded-xl overflow-hidden border border-white/5" style={{ background: 'rgba(2,4,8,0.6)' }}>
                  <div className="px-3 pt-3 pb-1">
                    {[
                      { text: '# Start Essential server', type: 'comment' },
                      { text: 'npm run essential:up', type: 'cmd' },
                      { text: '', type: 'spacer' },
                      { text: '# Build & deploy contract', type: 'comment' },
                      { text: 'npm run pint:build', type: 'cmd' },
                      { text: 'npm run deploy:contract', type: 'cmd' },
                      { text: '', type: 'spacer' },
                      { text: '# Start gateway', type: 'comment' },
                      { text: 'npm run gateway:dev', type: 'cmd' },
                      { text: '', type: 'spacer' },
                      { text: '# Run solver', type: 'comment' },
                      { text: 'npm run solver:rust', type: 'cmd' },
                    ].map((line, i) => (
                      <div
                        key={i}
                        className={
                          line.type === 'comment'
                            ? 'text-slate-600 py-0.5'
                            : line.type === 'spacer'
                            ? 'h-2'
                            : 'text-settle-400 py-0.5 pl-2 border-l border-settle-700/30'
                        }
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettlementPage;
