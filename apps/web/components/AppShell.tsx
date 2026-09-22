'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken } from '../lib/api';

export default function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Haut SaaS</div>
        <nav className="nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/contacts">Contatos</Link>
          <Link href="/crm">CRM</Link>
          <Link href="/integrations">Canais</Link>
        </nav>
      </aside>

      <main className="main">
        <div className="topbar">
          <h1>{title}</h1>
          <button
            className="btn secondary"
            onClick={() => {
              clearToken();
              router.push('/login');
            }}
          >
            Sair
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
