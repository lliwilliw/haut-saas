'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    Promise.all([
      api('/integrations/status'),
      api('/integrations/evolution/instances'),
    ])
      .then(([integrationStatus, evolution]) => {
        setStatus(integrationStatus);
        setInstances(
          Array.isArray(evolution.instances) ? evolution.instances : [],
        );
      })
      .catch(() => router.push('/login'));
  }, [router]);

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

                <div style={{ flex: '1 1 240px' }}>
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
