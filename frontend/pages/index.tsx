import type { NextPage, GetServerSideProps } from 'next';
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
    { label: 'Alpha Leakage', value: '0%', sub: 'ZK-masked routing' },
    { label: 'Bridging Risk', value: 'None', sub: 'JIT native fill' },
    { label: 'Infrastructure', value: '100%', sub: 'Self-hosted' },
    { label: 'Standards', value: 'ERC-7683', sub: 'Cross-chain intents' },
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

      <div className="relative min-h-screen overflow-hidden">
        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zk-600 to-intent-500 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="gradient-text-zk">ZK</span>
              <span className="text-slate-200">-RFQ</span>
            </span>
            <span className="badge badge-zk ml-2">Sovereign PoC</span>
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
              <button className="btn-primary text-sm ml-2">
                <span>Launch App</span>
              </button>
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative z-10 text-center px-8 pt-24 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-zk-600/40 bg-zk-600/10 text-zk-300 text-xs font-semibold mb-8 tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-zk-400 animate-pulse-slow" />
              Sovereign Infrastructure · Zero Alpha Leakage
            </div>

            <h1 className="text-6xl font-bold leading-tight mb-6 tracking-tight">
              <span className="gradient-text-zk">Zero-Knowledge</span>
              <br />
              <span className="text-white">RFQ Gateway</span>
            </h1>

            <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed mb-12">
              Institutional block trading without alpha leakage. ERC-7683
              standardised intents, Noir ZK price masking, and multi-chain JIT
              liquidity on 100% self-hosted infrastructure.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/terminal">
                <button className="btn-primary px-8 py-3 text-base">
                  <span className="flex items-center gap-2">
                    Launch Trader Terminal
                    <ChevronRight size={18} />
                  </span>
                </button>
              </Link>
              <Link href="/mempool">
                <button className="px-8 py-3 rounded-xl border border-intent-500/30 text-intent-300 text-base font-semibold hover:border-intent-400/50 hover:bg-intent-500/5 transition-all">
                  View Live Mempool
                </button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Stats */}
        <section className="relative z-10 px-8 mb-20">
          <div className="max-w-5xl mx-auto grid grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="glass-card p-5 text-center"
              >
                <div className="text-3xl font-bold gradient-text-zk mb-1">
                  {stat.value}
                </div>
                <div className="text-slate-200 text-sm font-medium">
                  {stat.label}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">{stat.sub}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pillars */}
        <section className="relative z-10 px-8 pb-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-3 text-white">
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
                    ? 'rgba(139,92,246,0.3)'
                    : pillar.color === 'settle'
                      ? 'rgba(16,185,129,0.3)'
                      : 'rgba(6,182,212,0.3)';
                const glowColor =
                  pillar.color === 'zk'
                    ? 'rgba(139,92,246,0.08)'
                    : pillar.color === 'settle'
                      ? 'rgba(16,185,129,0.08)'
                      : 'rgba(6,182,212,0.08)';
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
                          borderColor: isHovered
                            ? borderColor
                            : 'rgba(139,92,246,0.12)',
                          boxShadow: isHovered
                            ? `0 8px 32px rgba(0,0,0,0.5), 0 0 30px ${glowColor}`
                            : undefined,
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center flex-shrink-0`}
                          >
                            <Icon size={20} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
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

        {/* Architecture Flow */}
        <section className="relative z-10 px-8 py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-center mb-10 text-white">
              Settlement Flow
            </h2>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {[
                {
                  label: 'Institutional Client',
                  color: 'text-slate-300',
                  bg: 'from-slate-800 to-slate-900 border-slate-700',
                },
                { label: '→', color: 'text-slate-600', bg: '' },
                {
                  label: 'ERC-7683 Intent',
                  color: 'text-intent-300',
                  bg: 'from-intent-900/50 to-sovereign-800 border-intent-700/40',
                },
                { label: '→', color: 'text-slate-600', bg: '' },
                {
                  label: 'Essential Solution Pool',
                  color: 'text-zk-300',
                  bg: 'from-zk-900/50 to-sovereign-800 border-zk-700/40',
                },
                { label: '→', color: 'text-slate-600', bg: '' },
                {
                  label: 'Multi-Chain Solver',
                  color: 'text-intent-300',
                  bg: 'from-intent-900/50 to-sovereign-800 border-intent-700/40',
                },
                { label: '→', color: 'text-slate-600', bg: '' },
                {
                  label: 'Noir ZK Proof',
                  color: 'text-zk-300',
                  bg: 'from-zk-900/50 to-sovereign-800 border-zk-700/40',
                },
                { label: '→', color: 'text-slate-600', bg: '' },
                {
                  label: 'Essential Declarative Settlement',
                  color: 'text-settle-300',
                  bg: 'from-settle-900/30 to-sovereign-800 border-settle-700/40',
                },
              ].map((step, i) =>
                step.bg ? (
                  <div
                    key={i}
                    className={`px-3 py-2 rounded-lg bg-gradient-to-br ${step.bg} border text-xs font-semibold ${step.color}`}
                  >
                    {step.label}
                  </div>
                ) : (
                  <span key={i} className={`text-xl ${step.color}`}>
                    {step.label}
                  </span>
                )
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 px-8 py-8 border-t border-white/5 text-center text-slate-600 text-xs">
          <p>
            ZK-RFQ Sovereign Gateway — Research PoC | ERC-7683 · Noir ·
            Essential Declarative Protocol
          </p>
          <p className="mt-1">
            100% local infrastructure. No public RPC. No alpha leakage.
          </p>
        </footer>
      </div>
    </>
  );
};

export default Home;
