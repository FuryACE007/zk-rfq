import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowRight, Shield } from 'lucide-react';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>ZK-RFQ Sovereign Gateway</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-xl w-full text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zk-500 to-zk-600 flex items-center justify-center shadow-lg">
              <Shield size={18} className="text-white" />
            </div>
            <h1
              className="font-bold text-white tracking-tight"
              style={{ fontSize: '32px', letterSpacing: '-0.02em' }}
            >
              ZK-RFQ Sovereign Gateway
            </h1>
          </div>

          <p className="text-slate-400 text-sm mb-10">
            Private institutional block trading on Ethereum Sepolia.
            ZK-attested aggregate quotes, ERC-7683 intents, declarative
            settlement.
          </p>

          <div className="flex flex-col items-center gap-4">
            <ConnectButton />

            <Link
              href="/terminal"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zk-500/40 bg-zk-600/10 text-zk-300 hover:text-white hover:bg-zk-600/20 transition-all text-sm"
            >
              Open Terminal
              <ArrowRight size={14} />
            </Link>

            <div className="flex gap-4 mt-4 text-xs text-slate-600 font-mono">
              <Link
                href="/mempool"
                className="hover:text-slate-400 transition-colors"
              >
                /mempool
              </Link>
              <Link
                href="/settlement"
                className="hover:text-slate-400 transition-colors"
              >
                /settlement
              </Link>
            </div>
          </div>

          <div className="mt-12 text-xs text-slate-700 font-mono">
            Network: Ethereum Sepolia (chainId 11155111)
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
