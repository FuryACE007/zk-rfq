import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <div className="scan-line" />
      <Component {...pageProps} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(10, 22, 40, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            color: '#e2e8f0',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#020408' },
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#020408' },
          },
        }}
      />
    </>
  );
}
