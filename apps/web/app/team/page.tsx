'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { api } from '../../lib/api';

const roleLabels: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  AGENT: 'Atendente',
  MARKETING: 'Marketing',
  VIEWER: 'Visualizador',
};

const editableRoles = ['ADMIN', 'MANAGER', 'AGENT', 'MARKETING', 'VIEWER'];

export default function TeamPage() {
  const router = useRouter();
  const [data, setData] = useState<any>({ members: [], invitations: [] });
  const [me, setMe] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('AGENT');
  const [notice, setNotice] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [team, identity] = await Promise.all([api('/team'), api('/auth/me')]);
    setData(team);
    setMe(identity);
  }, []);

  useEffect(() => {
    load().catch(() => router.push('/login'));
  }, [load, router]);

  const canManage = me?.role === 'OWNER' || me?.role === 'ADMIN';

  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice('');
    setInviteLink('');

    try {
      const result = await api('/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });

      const url = new URL(result.invitePath, window.location.origin).toString();
      setInviteLink(url);
      setNotice('Convite criado com validade de 7 dias.');
      setEmail('');
      await load();
    } catch (error: any) {
      setNotice(error?.message || 'Não foi possível criar o convite.');
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(membershipId: string, nextRole: string) {
    setNotice('');
    try {
      await api(`/team/members/${membershipId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
      await load();
    } catch (error: any) {
      setNotice(error?.message || 'Não foi possível alterar o papel.');
    }
  }

  async function removeMember(membershipId: string) {
    if (!window.confirm('Remover este usuário da organização?')) return;

    setNotice('');
    try {
      await api(`/team/members/${membershipId}`, { method: 'DELETE' });
      await load();
    } catch (error: any) {
      setNotice(error?.message || 'Não foi possível remover o usuário.');
    }
  }

  async function revokeInvitation(id: string) {
    setNotice('');
    try {
      await api(`/team/invitations/${id}`, { method: 'DELETE' });
      await load();
    } catch (error: any) {
      setNotice(error?.message || 'Não foi possível revogar o convite.');
    }
  }

  async function copyInvite() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setNotice('Link do convite copiado.');
  }

  return (
    <AppShell title="Equipe">
      {canManage ? (
        <form className="card" onSubmit={invite}>
          <h3>Convidar usuário</h3>
          <div className="row">
            <label className="field">
              <span>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
              />
            </label>

            <label className="field">
              <span>Papel</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {editableRoles.map((value) => (
                  <option key={value} value={value}>
                    {roleLabels[value]}
                  </option>
                ))}
              </select>
            </label>

            <button className="btn" disabled={busy}>
              {busy ? 'Criando...' : 'Criar convite'}
            </button>
          </div>

          {inviteLink ? (
            <div style={{ marginTop: 16 }}>
              <div className="muted">Link de convite</div>
              <div className="row" style={{ marginTop: 6 }}>
                <input
                  style={{ flex: '1 1 420px' }}
                  value={inviteLink}
                  readOnly
                />
                <button
                  type="button"
                  className="btn secondary"
                  onClick={copyInvite}
                >
                  Copiar
                </button>
              </div>
            </div>
          ) : null}
        </form>
      ) : null}

      {notice ? (
        <div className="card" style={{ marginTop: 18 }}>
          {notice}
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Membros</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>E-mail</th>
                <th>Papel</th>
                {canManage ? <th>Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {data.members.map((membership: any) => (
                <tr key={membership.id}>
                  <td>{membership.user.name}</td>
                  <td>{membership.user.email}</td>
                  <td>
                    {canManage && membership.role !== 'OWNER' ? (
                      <select
                        value={membership.role}
                        onChange={(e) =>
                          changeRole(membership.id, e.target.value)
                        }
                      >
                        {editableRoles.map((value) => (
                          <option key={value} value={value}>
                            {roleLabels[value]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      roleLabels[membership.role] || membership.role
                    )}
                  </td>
                  {canManage ? (
                    <td>
                      {membership.role !== 'OWNER' ? (
                        <button
                          className="btn secondary"
                          onClick={() => removeMember(membership.id)}
                        >
                          Remover
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canManage && data.invitations.length ? (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>Convites pendentes</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Papel</th>
                  <th>Expira</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.invitations.map((invitation: any) => (
                  <tr key={invitation.id}>
                    <td>{invitation.email}</td>
                    <td>{roleLabels[invitation.role] || invitation.role}</td>
                    <td>
                      {new Date(invitation.expiresAt).toLocaleString('pt-BR')}
                    </td>
                    <td>
                      <button
                        className="btn secondary"
                        onClick={() => revokeInvitation(invitation.id)}
                      >
                        Revogar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
