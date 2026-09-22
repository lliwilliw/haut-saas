'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setToken } from '../../lib/api';

export default function AcceptInvitePage() {
  const router = useRouter();
  const [token, setTokenParam] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTokenParam(params.get('token') || '');
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/proxy/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(body.message)
            ? body.message.join(', ')
            : body.message || 'Não foi possível aceitar o convite',
        );
      }

      setToken(body.accessToken);
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Entrar na equipe</h1>
        <div className="muted">
          Se você já possui conta no Haut, use sua senha atual. Se é seu
          primeiro acesso, informe seu nome e crie uma senha.
        </div>

        <label className="field">
          <span>Seu nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome completo"
          />
        </label>

        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? <div className="error">{error}</div> : null}

        <button className="btn full" disabled={busy || !token}>
          {busy ? 'Entrando...' : 'Aceitar convite'}
        </button>

        {!token ? (
          <div className="error">Link de convite inválido.</div>
        ) : null}
      </form>
    </main>
  );
}
