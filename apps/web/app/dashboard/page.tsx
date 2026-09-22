'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { api } from '../../lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [platform, setPlatform] = useState<any>({});
  const [team, setTeam] = useState<any>({ members: [] });

  useEffect(() => {
    Promise.all([
      api('/auth/me'),
      api('/contacts?take=5'),
      api('/integrations/status'),
      api('/team'),
    ])
      .then(([identity, recentContacts, status, teamData]) => {
        setMe(identity);
        setContacts(recentContacts);
        setPlatform(status);
        setTeam(teamData);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  return (
    <AppShell title="Dashboard">
      <div className="muted">
        {me ? `${me.organization.name} · ${me.user.name}` : 'Carregando...'}
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="muted">Contatos recentes</div>
          <div className="stat">{contacts.length}</div>
        </div>

        <div className="card">
          <div className="muted">Usuários da equipe</div>
          <div className="stat">{team.members?.length || 0}</div>
        </div>

        <div className="card">
          <div className="muted">Mensageria</div>
          <div className="stat">{platform.messaging ? 'Online' : 'Verificar'}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Fundação SaaS</h3>
        <p className="muted">
          Organização isolada, equipe com papéis, convites, cofre criptografado,
          auditoria e canais provisionados por tenant.
        </p>
      </div>
    </AppShell>
  );
}
