import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import {
  Shield,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Send,
  Zap,
  ChevronDown,
} from 'lucide-react';

const ASSET_PAIRS = ['WETH/USDC', 'WBTC/USDC', 'SOL/USDC', 'WETH/USDT'];

const TerminalPage: NextPage = () => {
  const [assetPair, setAssetPair] = useState('WETH/USDC');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [swapperAddress, setSwapperAddress] = useState(
    '0xInstitutionalClientWallet0000000000000000'
  );
  const [ttlSeconds, setTtlSeconds] = useState(300);
  const [formatErc7683, setFormatErc7683] = useState(true);
  const [showLimit, setShowLimit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<{
    orderHash: string;
    expiresAt: number;
  } | null>(null);
  const [showPairDropdown, setShowPairDropdown] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !limitPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/intents', {
        assetPair,
        amount: (parseFloat(amount) * 1e18).toFixed(0),
        limitPrice: (parseFloat(limitPrice) * 1e6).toFixed(0),
        swapperAddress,
        ttlSeconds,
      });

      setSubmitted({
        orderHash: res.data.orderHash,
        expiresAt: res.data.expiresAt,
      });
      toast.success('Intent submitted to sovereign pool!');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? err.message)
        : String(err);
      toast.error(`Submission failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const [baseA, baseB] = assetPair.split('/');
  const marketRef = {
    'WETH/USDC': 2493.27,
    'WBTC/USDC': 67218.5,
    'SOL/USDC': 145.62,
    'WETH/USDT': 2491.8,
  };
  const marketPrice = marketRef[assetPair as keyof typeof marketRef] ?? 0;

  return (
    <>
      <Head>
        <title>Trader Terminal — ZK-RFQ Sovereign Gateway</title>
        <meta
          name="description"
          content="Submit institutional block trade intents with secret limit price masking via ERC-7683 and Noir ZK."
        />
      </Head>

      <div className="min-h-screen relative">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5 relative z-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back to Overview
          </Link>
          <div className="flex items-center gap-3">
            <span className="badge badge-active">
              <span className="w-1.5 h-1.5 rounded-full bg-settle-400 animate-pulse-slow" />
              Gateway Online
            </span>
            <Link href="/mempool">
              <button className="text-sm px-4 py-1.5 rounded-lg border border-intent-500/30 text-intent-300 hover:border-intent-400/50 transition-all">
                View Mempool →
              </button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-zk-600 to-intent-500 flex items-center justify-center">
                  <Shield size={14} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">
                  Institutional Trader Terminal
                </h1>
              </div>
              <p className="text-slate-500 text-sm ml-9">
                Submit block trade intents. Your limit price is committed via
                keccak256 — never stored in plaintext.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {/* Main Form */}
              <div className="col-span-2 glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <Lock size={16} className="text-zk-400" />
                    New Block Trade Intent
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">
                      Format as ERC-7683
                    </span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formatErc7683}
                        onChange={(e) => setFormatErc7683(e.target.checked)}
                        id="erc7683-toggle"
                      />
                      <div className="toggle-track" />
                      <div className="toggle-thumb" />
                    </label>
                  </div>
                </div>

                {formatErc7683 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-intent-500/8 border border-intent-500/20 mb-5">
                    <div className="w-1.5 h-1.5 rounded-full bg-intent-400" />
                    <span className="text-intent-300 text-xs font-mono">
                      CrossChainOrder format enabled — ERC-7683 compliant
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Asset Pair */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Asset Pair
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        id="asset-pair-select"
                        onClick={() => setShowPairDropdown(!showPairDropdown)}
                        className="input-sovereign flex items-center justify-between text-left"
                      >
                        <span>{assetPair}</span>
                        <ChevronDown
                          size={14}
                          className={`text-slate-500 transition-transform ${showPairDropdown ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <AnimatePresence>
                        {showPairDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute top-full left-0 right-0 z-50 mt-1 py-1 rounded-lg border border-zk-600/30 bg-sovereign-900/95 backdrop-blur-xl shadow-xl"
                          >
                            {ASSET_PAIRS.map((pair) => (
                              <button
                                key={pair}
                                type="button"
                                onClick={() => {
                                  setAssetPair(pair);
                                  setShowPairDropdown(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-zk-600/10 ${pair === assetPair ? 'text-zk-300' : 'text-slate-300'}`}
                              >
                                {pair}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Trade Size{' '}
                      <span className="text-slate-600">({baseA})</span>
                    </label>
                    <input
                      id="trade-amount"
                      type="number"
                      step="0.001"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`e.g. 50 ${baseA}`}
                      className="input-sovereign"
                      required
                    />
                  </div>

                  {/* Secret Limit Price */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Lock size={11} className="text-zk-400" />
                      Secret Limit Price
                      <span className="text-slate-600">
                        ({baseB} per {baseA})
                      </span>
                      <span className="badge badge-zk ml-auto">
                        ZK-committed
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        id="limit-price"
                        type={showLimit ? 'number' : 'password'}
                        step="0.01"
                        min="0"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder="e.g. 2490.00"
                        className="input-sovereign pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLimit(!showLimit)}
                        id="toggle-limit-visibility"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showLimit ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-slate-600 text-xs mt-1 font-mono">
                      Market: ${marketPrice.toLocaleString()} · Stored as
                      keccak256 commitment only
                    </p>
                  </div>

                  {/* Swapper Address */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Settlement Wallet
                    </label>
                    <input
                      id="swapper-address"
                      type="text"
                      value={swapperAddress}
                      onChange={(e) => setSwapperAddress(e.target.value)}
                      className="input-sovereign font-mono text-xs"
                      required
                    />
                  </div>

                  {/* TTL */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Intent TTL:{' '}
                      <span className="text-slate-300">
                        {ttlSeconds}s ({(ttlSeconds / 60).toFixed(1)} min)
                      </span>
                    </label>
                    <input
                      type="range"
                      min={60}
                      max={3600}
                      step={60}
                      value={ttlSeconds}
                      onChange={(e) => setTtlSeconds(Number(e.target.value))}
                      id="ttl-slider"
                      className="w-full accent-zk-500"
                    />
                  </div>

                  <button
                    type="submit"
                    id="submit-intent-btn"
                    disabled={loading}
                    className="btn-primary w-full mt-2 flex items-center justify-center gap-2 py-3"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{' '}
                        Submitting to Sovereign Pool...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send size={16} /> Submit Block Trade Intent
                      </span>
                    )}
                  </button>
                </form>
              </div>

              {/* Side Panel */}
              <div className="space-y-4">
                {/* Privacy Status */}
                <div className="glass-card p-4">
                  <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                    Privacy Status
                  </h3>
                  <div className="space-y-2.5">
                    {[
                      {
                        label: 'Limit Price',
                        status: 'keccak256 committed',
                        ok: true,
                      },
                      { label: 'Asset Pair', status: 'Public', ok: false },
                      { label: 'Trade Size', status: 'Public', ok: false },
                      { label: 'DEX Routing', status: 'ZK-masked', ok: true },
                      {
                        label: 'Pool Addresses',
                        status: 'Hidden in proof',
                        ok: true,
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-400">{row.label}</span>
                        <span
                          className={`font-mono ${row.ok ? 'text-zk-400' : 'text-slate-500'}`}
                        >
                          {row.ok ? '🔒 ' : ''}
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ERC-7683 Info */}
                <div className="glass-card-intent p-4">
                  <h3 className="text-xs font-semibold text-intent-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={11} />
                    ERC-7683
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Your intent is formatted as a{' '}
                    <span className="font-mono text-intent-300">
                      CrossChainOrder
                    </span>{' '}
                    struct — readable by any global solver without proprietary
                    APIs.
                  </p>
                </div>

                {/* Submitted Order */}
                <AnimatePresence>
                  {submitted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card-settle p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-settle-400 animate-pulse-slow" />
                        <span className="text-settle-300 text-xs font-semibold uppercase tracking-wider">
                          Order Live
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs mb-1">Order Hash:</p>
                      <p className="font-mono text-xs text-white break-all mb-2">
                        {submitted.orderHash}
                      </p>
                      <p className="text-slate-500 text-xs">
                        Expires:{' '}
                        {new Date(
                          submitted.expiresAt * 1000
                        ).toLocaleTimeString()}
                      </p>
                      <Link href="/mempool">
                        <button className="mt-3 w-full text-xs py-1.5 rounded-lg bg-settle-500/20 border border-settle-500/30 text-settle-300 hover:bg-settle-500/30 transition-all">
                          View in Mempool →
                        </button>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default TerminalPage;
