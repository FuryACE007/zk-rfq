import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  Activity,
  ChevronRight,
  Lock,
  Globe,
  Cpu,
} from 'lucide-react';

const Home: NextPage = () => {
  const [hovered, setHovered] = useState<string | null>(null);

  const pillars = [
    {
      id: 'erc7683',
      icon: Globe,
      color: 'intent',
      label: 'ERC-7683',
      title: 'Intent Standardisation',
      desc: 'Universal cross-chain order format attracting plug-and-play global market makers. Zero proprietary API lock-in.',
      href: '/terminal',
    },
    {
      id: 'zk',
      icon: Lock,
      color: 'zk',
      label: 'Noir ZK',
      title: 'Aggregate Price Masking',
      desc: 'Zero-knowledge proofs blind the routing strategy. Solvers prove price quality without revealing pool addresses or limit prices.',
      href: '/mempool',
    },
    {
      id: 'jit',
      icon: Zap,
      color: 'intent',
      label: 'Multi-Chain JIT',
      title: 'Cross-Chain Liquidity',
      desc: 'Concurrent JIT quotes from Uniswap V3 (EVM) and Jupiter (Solana). Institutions never take on bridging risk.',
      href: '/mempool',
    },
    {
      id: 'sovereign',
      icon: Shield,
      color: 'settle',
      label: 'Sovereign',
      title: 'Self-Hosted Settlement',
      desc: '100% local infrastructure. Essential declarative protocol server with native Pint contract validation. No public third-party RPC dependency.',
      href: '/settlement',
    },
  ];

  const stats = [
    { label: 'Alpha Leakage', value: '0%', sub: 'ZK-masked routing', accent: '#8b5cf6', wide: false },
    { label: 'Bridging Risk', value: 'None', sub: 'JIT native fill', accent: '#06b6d4', wide: false },
    { label: 'Infrastructure', value: '100%', sub: 'Self-hosted', accent: '#10b981', wide: false },
    { label: 'Intent Standard', value: 'ERC-7683', sub: 'Cross-chain intents', accent: '#7c3aed', wide: true },
  ];

  return (
    <>
      <Head>
        <title>ZK-RFQ Sovereign Gateway — Institutional Block Trading</title>
        <meta
          name="description"
          content="100% sovereign zero-knowledge RFQ gateway for institutional block trading. ERC-7683 intents, Noir ZK proofs, multi-chain JIT liquidity."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Aurora background orbs */}
      <div className="aurora-orb aurora-orb-1" />
      <div className="aurora-orb aurora-orb-2" />
      <div className="aurora-orb aurora-orb-3" />

      <div className="relative min-h-screen overflow-hidden">
        {/* Nav */}
        <nav className="nav-glass relative z-10 flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zk-600 to-intent-500 flex items-center justify-center shadow-lg">
                <Shield size={17} className="text-white" />
              </div>
              <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-5 h-px bg-gradient-to-r from-transparent via-zk-400 to-transparent" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight leading-none">
                <span className="gradient-text-zk">ZK</span>
                <span className="text-slate-200">-RFQ</span>
              </span>
            </div>
            <span className="badge badge-zk ml-1">Sovereign PoC</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link
              href="/terminal"
              className="hover:text-white transition-colors"
            >
              Trader Terminal
            </Link>
            <Link
              href="/mempool"
              className="hover:text-white transition-colors"
            >
              Gateway Mempool
            </Link>
            <Link
              href="/settlement"
              className="hover:text-white transition-colors"
            >
              Settlement
            </Link>
            <Link href="/terminal">
              <button className="btn-primary text-sm ml-2 px-5 py-2">
                <span>Launch App</span>
              </button>
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative z-10 text-center px-8 pt-28 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-zk-600/40 bg-zk-600/10 text-zk-300 text-xs font-semibold mb-10 tracking-wider uppercase">
              <span className="pulse-ring pulse-ring-zk">
                <span className="dot" />
              </span>
              Sovereign Infrastructure · Zero Alpha Leakage
            </div>

            <h1
              className="font-bold leading-none mb-7 tracking-tight"
              style={{
                fontSize: 'clamp(52px, 7vw, 80px)',
                letterSpacing: '-0.04em',
              }}
            >
              <span className="gradient-text-zk">Zero-Knowledge</span>
              <br />
              <span className="text-white">RFQ Gateway</span>
            </h1>

            <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12" style={{ fontSize: '18px' }}>
              Institutional block trading without alpha leakage. ERC-7683
              standardised intents, Noir ZK price masking, and multi-chain JIT
              liquidity on 100% self-hosted infrastructure.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/terminal">
                <button className="btn-primary px-8 py-3.5 text-base">
                  <span className="flex items-center gap-2">
                    Launch Trader Terminal
                    <ChevronRight size={18} />
                  </span>
                </button>
              </Link>
              <Link href="/mempool">
                <button className="px-8 py-3.5 rounded-xl border border-intent-500/30 text-intent-300 text-base font-semibold hover:border-intent-400/50 hover:bg-intent-500/5 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-200">
                  View Live Mempool
                </button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Bento Stats Grid */}
        <section className="relative z-10 px-8 mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-3 grid-rows-2 gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {/* Top row: 3 equal cards */}
              {stats.slice(0, 3).map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="bento-card p-6"
                  style={{ borderLeft: `3px solid ${stat.accent}` }}
                >
                  <div
                    className="text-4xl font-bold mb-2 font-feature-numeric"
                    style={{
                      background: `linear-gradient(135deg, ${stat.accent}, rgba(255,255,255,0.9))`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontFeatureSettings: "'ss01' on",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-slate-200 text-sm font-semibold mb-0.5">
                    {stat.label}
                  </div>
                  <div className="text-slate-500 text-xs">{stat.sub}</div>
                </motion.div>
              ))}

              {/* Bottom row: wide card spanning all 3 columns */}
              <motion.div
                key={stats[3].label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bento-card col-span-3 p-6 flex items-center justify-between"
                style={{ borderLeft: `3px solid ${stats[3].accent}` }}
              >
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Intent Standard</div>
                  <div
                    className="text-3xl font-bold"
                    style={{
                      fontFeatureSettings: "'ss01' on",
                      background: `linear-gradient(135deg, ${stats[3].accent}, #06b6d4)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    ERC-7683
                  </div>
                  <div className="text-slate-500 text-xs mt-1">Cross-chain intents</div>
                </div>
                <div className="flex items-center gap-3 text-slate-600 text-xs font-mono">
                  <span className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/3">CrossChainOrder</span>
                  <ChevronRight size={12} />
                  <span className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/3">EIP-712 Signature</span>
                  <ChevronRight size={12} />
                  <span className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/3">Sovereign Pool</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="relative z-10 px-8 pb-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-2 text-white tracking-tight">
              Three Pillars of Sovereign Block Trading
            </h2>
            <p className="text-slate-500 text-center mb-12 text-sm">
              Each component addresses a critical failure of existing
              institutional OTC infrastructure.
            </p>

            <div className="grid grid-cols-2 gap-5">
              {pillars.map((pillar, i) => {
                const Icon = pillar.icon;
                const isHovered = hovered === pillar.id;

                const borderColor =
                  pillar.color === 'zk'
                    ? 'rgba(139,92,246,0.35)'
                    : pillar.color === 'settle'
                      ? 'rgba(16,185,129,0.35)'
                      : 'rgba(6,182,212,0.35)';
                const glowColor =
                  pillar.color === 'zk'
                    ? 'rgba(139,92,246,0.1)'
                    : pillar.color === 'settle'
                      ? 'rgba(16,185,129,0.1)'
                      : 'rgba(6,182,212,0.1)';
                const accentColor =
                  pillar.color === 'zk'
                    ? '#8b5cf6'
                    : pillar.color === 'settle'
                      ? '#10b981'
                      : '#06b6d4';
                const iconBg =
                  pillar.color === 'zk'
                    ? 'from-zk-600 to-zk-800'
                    : pillar.color === 'settle'
                      ? 'from-settle-500 to-settle-600'
                      : 'from-intent-500 to-intent-700';
                const labelClass =
                  pillar.color === 'zk'
                    ? 'badge-zk'
                    : pillar.color === 'settle'
                      ? 'badge-active'
                      : 'badge-pending';

                return (
                  <motion.div
                    key={pillar.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.12 }}
                    onMouseEnter={() => setHovered(pillar.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <Link href={pillar.href}>
                      <div
                        className="glass-card p-6 cursor-pointer transition-all duration-300"
                        style={{
                          borderColor: isHovered ? borderColor : 'rgba(255,255,255,0.08)',
                          borderLeft: `3px solid ${accentColor}`,
                          boxShadow: isHovered
                            ? `inset 0 1px 0 rgba(255,255,255,0.1), 0 24px 48px rgba(0,0,0,0.5), 0 0 40px ${glowColor}`
                            : undefined,
                          transform: isHovered ? 'translateY(-3px)' : undefined,
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center flex-shrink-0 shadow-lg`}
                          >
                            <Icon size={21} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2.5">
                              <span className={`badge ${labelClass}`}>
                                {pillar.label}
                              </span>
                            </div>
                            <h3 className="text-white font-semibold text-base mb-2">
                              {pillar.title}
                            </h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                              {pillar.desc}
                            </p>
                          </div>
                          <ChevronRight
                            size={16}
                            className={`flex-shrink-0 mt-1 transition-all duration-300 ${isHovered ? 'text-slate-300 translate-x-1' : 'text-slate-600'}`}
                          />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Settlement Flow Timeline */}
        <section className="relative z-10 px-8 py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-center mb-12 text-white tracking-tight">
              Settlement Flow
            </h2>
            <div className="relative flex items-center justify-center gap-0">
              {[
                {
                  label: 'Institutional Client',
                  color: 'text-slate-300',
                  bg: 'from-slate-800/80 to-slate-900/80 border-slate-700/60',
                  dot: '#94a3b8',
                },
                {
                  label: 'ERC-7683 Intent',
                  color: 'text-intent-300',
                  bg: 'from-intent-900/50 to-sovereign-800 border-intent-700/40',
                  dot: '#06b6d4',
                },
                {
                  label: 'Sovereign Pool',
                  color: 'text-zk-300',
                  bg: 'from-zk-900/50 to-sovereign-800 border-zk-700/40',
                  dot: '#8b5cf6',
                },
                {
                  label: 'Multi-Chain Solver',
                  color: 'text-intent-300',
                  bg: 'from-intent-900/50 to-sovereign-800 border-intent-700/40',
                  dot: '#06b6d4',
                },
                {
                  label: 'Noir ZK Proof',
                  color: 'text-zk-300',
                  bg: 'from-zk-900/50 to-sovereign-800 border-zk-700/40',
                  dot: '#8b5cf6',
                },
                {
                  label: 'Declarative Settlement',
                  color: 'text-settle-300',
                  bg: 'from-settle-900/30 to-sovereign-800 border-settle-700/40',
                  dot: '#10b981',
                },
              ].map((step, i, arr) => (
                <div key={i} className="flex items-center">
                  <div
                    className={`relative px-4 py-3 rounded-xl bg-gradient-to-br ${step.bg} border text-xs font-semibold ${step.color} flex flex-col items-center gap-1.5 min-w-[110px] text-center`}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: step.dot, boxShadow: `0 0 8px ${step.dot}` }}
                    />
                    {step.label}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex items-center mx-1">
                      <div className="w-5 h-px bg-gradient-to-r from-white/20 to-white/5" />
                      <ChevronRight size={12} className="text-slate-700 -ml-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 px-8 py-10 border-t border-white/5">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-sm">
                  <span className="gradient-text-zk">ZK</span>
                  <span className="text-slate-400">-RFQ</span>
                </span>
                <span className="text-slate-700">·</span>
                <span className="text-slate-600 text-xs">Research PoC</span>
              </div>
              <p className="text-slate-700 text-xs">
                100% local infrastructure. No public RPC. No alpha leakage.
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-600">
              <Link href="/terminal" className="hover:text-slate-400 transition-colors">Trader Terminal</Link>
              <Link href="/mempool" className="hover:text-slate-400 transition-colors">Gateway Mempool</Link>
              <Link href="/settlement" className="hover:text-slate-400 transition-colors">Settlement Monitor</Link>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="px-2 py-0.5 rounded border border-white/5 text-slate-700">ERC-7683</span>
              <span className="px-2 py-0.5 rounded border border-white/5 text-slate-700">Noir</span>
              <span className="px-2 py-0.5 rounded border border-white/5 text-slate-700">Essential Protocol</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Home;
