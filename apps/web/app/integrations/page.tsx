'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { api } from '../../lib/api';

const labels: Record<string, string> = {
  chatwoot: 'Chatwoot',
  mautic: 'Mautic',
  evolution: 'Evolution API',
};

function formatPhone(phone?: string | null) {
  return phone ? `+${phone}` : '—';
}

export default function Integrations() {
  const router = useRouter();
  const [status, setStatus] = useState<any>({});
  const [instances, setInstances] = useState<any[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const [integrationStatus, evolution] = await Promise.all([
      api('/integrations/status'),
      api('/integrations/evolution/instances'),
    ]);

    setStatus(integrationStatus);
    setInstances(Array.isArray(evolution.instances) ? evolution.instances : []);
  }, []);

  useEffect(() => {
    load().catch(() => router.push('/login'));
  }, [load, router]);

  async function connectChatwoot(instanceName: string) {
    setConnecting(instanceName);
    setNotice('');

    try {
      const result = await api(
        `/integrations/evolution/instances/${encodeURIComponent(instanceName)}/chatwoot`,
        { method: 'POST' },
      );
      setNotice(
        `Chatwoot conectado. Inbox criada/validada: ${result.inboxName}.`,
      );
      await load();
    } catch (error: any) {
      setNotice(error?.message || 'Não foi possível conectar ao Chatwoot.');
    } finally {
      setConnecting(null);
    }
  }

  return (
    <AppShell title="Integrações">
      <div className="grid">
        {Object.entries(labels).map(([key, label]) => {
          const integration = status[key] || {};

          return (
            <div className="card" key={key}>
              <h3>{label}</h3>
              <span
                className={`badge ${integration.reachable ? 'ok' : 'bad'}`}
              >
                {integration.reachable
                  ? 'Alcançável'
                  : integration.configured
                    ? 'Indisponível'
                    : 'Não configurado'}
              </span>
              <p className="muted">
                Credencial:{' '}
                {integration.credentialsConfigured ? 'configurada' : 'pendente'}
              </p>

              {key === 'chatwoot' && integration.appUrl ? (
                <a
                  className="btn secondary"
                  href={integration.appUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', marginTop: 4 }}
                >
                  Abrir Chatwoot
                </a>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 style={{ marginBottom: 6 }}>WhatsApp</h3>
            <p className="muted" style={{ margin: 0 }}>
              Instâncias conectadas pela Evolution API
            </p>
          </div>

          {status.evolution?.managerUrl ? (
            <a
              className="btn secondary"
              href={status.evolution.managerUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir Evolution Manager
            </a>
          ) : null}
        </div>

        {notice ? (
          <p
            style={{
              margin: '16px 0 0',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 9,
              background: '#f9fafb',
            }}
          >
            {notice}
          </p>
        ) : null}

        {instances.length ? (
          <div
            style={{
              display: 'grid',
              gap: 12,
              marginTop: 18,
            }}
          >
            {instances.map((instance) => (
              <div
                key={instance.id || instance.name}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  flexWrap: 'wrap',
                }}
              >
                {instance.profilePicUrl ? (
                  <img
                    src={instance.profilePicUrl}
                    alt=""
                    width={52}
                    height={52}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      background: '#f2f4f7',
                      fontWeight: 800,
                    }}
                  >
                    {(instance.profileName || instance.name || 'W')
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                )}

                <div style={{ flex: '1 1 220px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <strong>
                      {instance.profileName || instance.name || 'WhatsApp'}
                    </strong>
                    <span
                      className={`badge ${instance.connected ? 'ok' : 'bad'}`}
                    >
                      {instance.connected ? 'Conectado' : 'Desconectado'}
                    </span>
                    <span
                      className={`badge ${instance.chatwootConnected ? 'ok' : ''}`}
                    >
                      {instance.chatwootConnected
                        ? 'Chatwoot conectado'
                        : 'Chatwoot pendente'}
                    </span>
                  </div>

                  <p className="muted" style={{ margin: '6px 0 0' }}>
                    {formatPhone(instance.phone)} ·{' '}
                    {instance.integration || 'WhatsApp'}
                  </p>
                </div>

                <div
                  className="muted"
                  style={{
                    display: 'flex',
                    gap: 16,
                    flexWrap: 'wrap',
                    fontSize: 14,
                  }}
                >
                  <span>{instance.messageCount} mensagens</span>
                  <span>{instance.contactCount} contatos</span>
                  <span>{instance.chatCount} chats</span>
                </div>

                {!instance.chatwootConnected ? (
                  <button
                    className="btn"
                    disabled={!instance.connected || connecting === instance.name}
                    onClick={() => connectChatwoot(instance.name)}
                  >
                    {connecting === instance.name
                      ? 'Conectando...'
                      : 'Conectar ao Chatwoot'}
                  </button>
                ) : status.chatwoot?.appUrl ? (
                  <a
                    className="btn secondary"
                    href={status.chatwoot.appUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver conversas
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 18 }}>
            Nenhuma instância retornada ou integração ainda não configurada.
          </p>
        )}
      </div>
    </AppShell>
  );
}
