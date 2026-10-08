'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Config = { demoMode: boolean; model: string; effort: string; runner: string; storage: boolean; drive: string | null };

export default function Nav() {
  const path = usePathname();
  const [cfg, setCfg] = useState<Config | null>(null);
  useEffect(() => { fetch('/api/config').then(r => r.json()).then(setCfg).catch(() => {}); }, []);
  const is = (p: string): 'page' | undefined => ((p === '/' ? path === '/' : path.startsWith(p)) ? 'page' : undefined);
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">Stock Research</Link>
        <div className="nav-links">
          <Link href="/" aria-current={is('/')}>Research</Link>
          <Link href="/methodologies" aria-current={is('/methodologies')}>Methodologies</Link>
        </div>
        <div className="nav-status">
          {cfg && (
            <span className="status-chip" title={cfg.demoMode ? 'No ANTHROPIC_API_KEY — demo output only' : `${cfg.model} · effort ${cfg.effort} · runner ${cfg.runner}`}>
              <span className={`dot ${cfg.demoMode ? 'warn' : 'on'}`} />
              {cfg.demoMode ? 'Demo' : 'Live'}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
