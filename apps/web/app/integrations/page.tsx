'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { api } from '../../lib/api';

export default function Integrations() {
  const router = useRouter();
  const [platform, setPlatform] = useState<any>({});
  const [whatsapp, setWhatsapp] = useState<any>({
    configured: false,
    instance: null,
  });
  const [qr, setQr] = useState<{ base64?: string | null; pairingCode?: string | null }>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const [status, channel] = await Promise.all([
      api('/integrations/status'),
      api('/integrations/whatsapp'),
    ]);

    setPlatform(status);
    setWhatsapp(channel);
  }, []);

  useEffect(() => {
    load().catch(() => router.push('/login'));
  }, [load, router]);

  useEffect(() => {
    if (!whatsapp.configured || whatsapp.instance?.connected) return;

    const timer = window.setInterval(() => {
      api('/integrations/whatsapp')
        .then((channel) => {
          setWhatsapp(channel);
          if (channel.instance?.connected) {
            setQr({});
            setNotice('WhatsApp conectado com sucesso.');
          }
        })
        .catch(() => undefined);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [whatsapp.configured, whatsapp.instance?.connected]);

  async function setup() {
    setBusy(true);
    setNotice('');

    try {
      const result = await api('/integrations/whatsapp/setup', {
        method: 'POST',
      });

      setWhatsapp({
        configured: result.configured,
        instance: result.instance,
      });
      setQr(result.qrcode || {});

      if (result.instance?.connected) {
        setNotice('WhatsApp conectado com sucesso.');
      } else {
        setNotice('Escaneie o QR Code com o WhatsApp para concluir a conexão.');
      }
    } catch (error: any) {
      setNotice(error?.message || 'Não foi possível iniciar a conexão.');
    } finally {
      setBusy(false);
    }
  }

  async function reconnect() {
    setBusy(true);
    setNotice('');

    try {
      const result = await api('/integrations/whatsapp/connect', {
        method: 'POST',
      });

      setWhatsapp({
        configured: true,
        instance: result.instance,
      });
      setQr(result.qrcode || {});
      setNotice('Escaneie o QR Code para reconectar o WhatsApp.');
    } catch (error: any) {
      setNotice(error?.message || 'Não foi possível reconectar.');
    } finally {
      setBusy(false);
    }
  }

  const instance = whatsapp.instance;

  return (
    <AppShell title="Canais">
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 18,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 style={{ marginBottom: 6 }}>WhatsApp</h3>
            <p className="muted" style={{ margin: 0, maxWidth: 680 }}>
              Conecte o WhatsApp da sua empresa. A configuração técnica é feita
              automaticamente pelo Haut SaaS.
            </p>
          </div>

          {instance ? (
            <span className={`badge ${instance.connected ? 'ok' : 'bad'}`}>
              {instance.connected ? 'Conectado' : 'Desconectado'}
            </span>
          ) : null}
        </div>

        {!whatsapp.configured ? (
          <div style={{ marginTop: 22 }}>
            <p style={{ marginBottom: 16 }}>
              Você não precisa criar instâncias, contas externas ou informar
              tokens.
            </p>
            <button
              className="btn"
              disabled={busy || !platform.tenantProvisioning}
              onClick={setup}
            >
              {busy ? 'Preparando...' : 'Conectar meu WhatsApp'}
            </button>

            {!platform.tenantProvisioning ? (
              <p className="error">
                Provisionamento automático ainda não foi habilitado pelo
                administrador da plataforma.
              </p>
            ) : null}
          </div>
        ) : (
          <div
            style={{
              marginTop: 22,
              display: 'grid',
              gap: 18,
              gridTemplateColumns: 'minmax(0,1fr) minmax(280px,420px)',
            }}
          >
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {instance?.profilePicUrl ? (
                  <img
                    src={instance.profilePicUrl}
                    alt=""
                    width={58}
                    height={58}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      background: '#f2f4f7',
                      fontWeight: 800,
                    }}
                  >
                    W
                  </div>
                )}

                <div>
                  <strong>
                    {instance?.profileName || 'WhatsApp da empresa'}
                  </strong>
                  <p className="muted" style={{ margin: '5px 0 0' }}>
                    {instance?.phone ? `+${instance.phone}` : 'Número ainda não identificado'}
                  </p>
                </div>
              </div>

              {!instance?.connected ? (
                <button
                  className="btn secondary"
                  style={{ marginTop: 18 }}
                  disabled={busy}
                  onClick={reconnect}
                >
                  {busy ? 'Gerando QR...' : 'Gerar novo QR Code'}
                </button>
              ) : null}
            </div>

            {!instance?.connected && qr.base64 ? (
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 18,
                  textAlign: 'center',
                }}
              >
                <strong>Escaneie com o WhatsApp</strong>
                <p className="muted">
                  WhatsApp → Dispositivos conectados → Conectar dispositivo
                </p>
                <img
                  src={qr.base64}
                  alt="QR Code para conectar o WhatsApp"
                  style={{
                    width: '100%',
                    maxWidth: 300,
                    height: 'auto',
                    borderRadius: 8,
                  }}
                />
                {qr.pairingCode ? (
                  <p className="muted">
                    Código de pareamento: <strong>{qr.pairingCode}</strong>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {notice ? (
          <p
            style={{
              marginTop: 18,
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 9,
              background: '#f9fafb',
            }}
          >
            {notice}
          </p>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Atendimento</h3>
        <p className="muted">
          As conversas serão exibidas e respondidas dentro do Haut SaaS. O
          Chatwoot funciona apenas como infraestrutura interna e não exige
          login do cliente.
        </p>
      </div>
    </AppShell>
  );
}
