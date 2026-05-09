import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Cpu,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
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
  txHash?: string;
  blockNumber?: number | null;
  solver?: string;
  aggregateQuote?: string;
  status?: string;
  timestamp?: string;
}

const SettlementPage: NextPage = () => {
  const router = useRouter();
  const orderHashQuery =
    typeof router.query.orderHash === 'string' ? router.query.orderHash : null;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [gatewayOnline, setGatewayOnline] = useState<boolean | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const seenStatuses = useRef<Set<string>>(new Set());

  const pushLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) =>
      [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toLocaleTimeString(),
          type,
          message,
        },
      ].slice(-80),
    );
  };

  // Auto-scroll
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Poll gateway health + Essential block number
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await axios.get('/api/health/essential-block', {
          timeout: 3000,
        });
        if (cancelled) return;
        if (res.data.online) {
          setGatewayOnline(true);
          setBlockNumber((prev) => {
            if (prev !== res.data.number) {
              pushLog(
                'info',
                `Essential block #${res.data.number}`,
              );
            }
            return res.data.number;
          });
        } else {
          setGatewayOnline(true);
          setBlockNumber(null);
        }
      } catch {
        if (cancelled) return;
        setGatewayOnline(false);
        setBlockNumber(null);
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Poll the specific settlement if an orderHash is supplied
  useEffect(() => {
    if (!orderHashQuery) return;
    let cancelled = false;
    pushLog('info', `Tracking order ${orderHashQuery.slice(0, 16)}…`);
    const poll = async () => {
      try {
        const res = await axios.get(`/api/settlement/${orderHashQuery}`, {
          timeout: 5000,
        });
        if (cancelled) return;
        const data: Settlement = res.data;
        setSettlement(data);
        const status = data.status ?? 'unknown';
        if (!seenStatuses.current.has(status)) {
          seenStatuses.current.add(status);
          pushLog('info', `Settlement status: ${status}`);
        }
        if (data.txHash && !seenStatuses.current.has(`tx:${data.txHash}`)) {
          seenStatuses.current.add(`tx:${data.txHash}`);
          pushLog('success', `Sepolia tx: ${data.txHash}`);
        }
        if (
          data.blockNumber &&
          !seenStatuses.current.has(`blk:${data.blockNumber}`)
        ) {
          seenStatuses.current.add(`blk:${data.blockNumber}`);
          pushLog('success', `Included in Sepolia block #${data.blockNumber}`);
        }
      } catch (err) {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          // not yet settled — ignore
        } else {
          pushLog('warn', `Settlement query failed: ${String(err)}`);
        }
      }
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [orderHashQuery]);

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
        <title>Settlement Monitor — ZK-RFQ</title>
      </Head>

      <div className="min-h-screen relative">
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
              onClick={() => {
                setLogs([]);
                seenStatuses.current.clear();
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-800 text-slate-600 hover:text-slate-400 transition-all"
            >
              Clear
            </button>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-1 text-xs text-slate-600 font-mono uppercase tracking-widest">
              <Link href="/" className="hover:text-slate-400 transition-colors">
                Overview
              </Link>
              <span>/</span>
              <Link
                href="/mempool"
                className="hover:text-slate-400 transition-colors"
              >
                Mempool
              </Link>
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
                Settlement Monitor
              </h1>
            </div>
            <p className="text-slate-500 text-sm ml-11">
              Essential declarative protocol · Sepolia ZkRfqSettlement
            </p>
          </div>

          <div className="grid grid-cols-3 gap-5">
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
                    essential-server · sepolia
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                  {logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-12 h-12 rounded-xl bg-white/4 border border-white/6 flex items-center justify-center mb-4">
                        <Cpu size={22} className="text-slate-600" />
                      </div>
                      <p className="text-slate-600 text-sm font-mono">
                        Waiting for settlement activity…
                      </p>
                      <p className="text-slate-700 text-xs mt-1 font-mono">
                        Approve an intent in /mempool to track it here
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

            <div className="space-y-4">
              <div className="glass-card-settle p-5">
                <h3 className="text-xs font-semibold text-settle-300 mb-4 uppercase tracking-widest flex items-center gap-1.5">
                  <Shield size={11} />
                  Infrastructure
                </h3>
                <div className="space-y-1">
                  {[
                    {
                      label: 'Gateway API',
                      status:
                        gatewayOnline === null
                          ? 'Checking…'
                          : gatewayOnline
                          ? 'Online'
                          : 'Offline',
                      ok: gatewayOnline === true,
                      accent:
                        gatewayOnline === false ? '#f43f5e' : '#06b6d4',
                    },
                    {
                      label: 'Essential Server',
                      status:
                        blockNumber !== null
                          ? `Block #${blockNumber}`
                          : 'Offline',
                      ok: blockNumber !== null,
                      accent: blockNumber !== null ? '#10b981' : '#f43f5e',
                    },
                    {
                      label: 'Sepolia RPC',
                      status:
                        gatewayOnline === true ? 'via Gateway' : 'Unknown',
                      ok: gatewayOnline === true,
                      accent:
                        gatewayOnline === true ? '#10b981' : '#f43f5e',
                    },
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

              {settlement && (
                <div className="glass-card-settle p-5">
                  <h3 className="text-xs font-semibold text-settle-300 mb-3 uppercase tracking-widest">
                    Order
                  </h3>
                  <div className="text-xs font-mono space-y-1.5 text-slate-400">
                    <div className="break-all">
                      <span className="text-slate-600">hash:</span>{' '}
                      {settlement.orderHash.slice(0, 24)}…
                    </div>
                    {settlement.status && (
                      <div>
                        <span className="text-slate-600">status:</span>{' '}
                        <span className="text-settle-400">
                          {settlement.status}
                        </span>
                      </div>
                    )}
                    {settlement.txHash && (
                      <div className="break-all">
                        <span className="text-slate-600">tx:</span>{' '}
                        <a
                          href={`https://sepolia.etherscan.io/tx/${settlement.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zk-300 hover:underline"
                        >
                          {settlement.txHash.slice(0, 24)}…
                        </a>
                      </div>
                    )}
                    {settlement.blockNumber && (
                      <div>
                        <span className="text-slate-600">block:</span>{' '}
                        {settlement.blockNumber}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettlementPage;
