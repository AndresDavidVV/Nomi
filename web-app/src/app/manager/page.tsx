'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TeamMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  createdAt: string;
  empresasCount: number;
  conversationsCount: number;
  messagesCount: number;
  lastActivity: string | null;
  avgCompletitud: number;
}

interface GlobalStats {
  totalEmpresas: number;
  totalNecesidades: number;
  avgCompletitud: number;
  totalConversations: number;
  totalMessages: number;
  activeUsersLast7Days: number;
}

interface Alertas {
  usersWithoutEmpresas: TeamMember[];
  inactiveUsers: TeamMember[];
}

export default function ManagerPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [alertas, setAlertas] = useState<Alertas | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/manager');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.status === 403) {
          alert('No tienes permisos de Manager');
          router.push('/dashboard');
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to load manager data');
        }

        const data = await res.json();
        setTeamMembers(data.teamMembers);
        setGlobalStats(data.globalStats);
        setAlertas(data.alertas);
      } catch (error) {
        console.error('Error loading manager panel:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#233B85]"></div>
      </div>
    );
  }

  if (!globalStats) {
    return null;
  }

  const getActivityColor = (lastActivity: string | null) => {
    if (!lastActivity) return 'bg-red-100 text-red-800';
    const daysSince = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 3) return 'bg-green-100 text-green-800';
    if (daysSince < 7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const sortedMembers = [...teamMembers].sort((a, b) => b.empresasCount - a.empresasCount);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#233B85] via-[#195A9D] to-[#233B85] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
                🏢
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Panel Gerencial</h1>
                <p className="text-sm text-blue-200 mt-1">
                  Vista consolidada del equipo
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                ← Dashboard
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                💬 Chat
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Global KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Empresas"
            value={globalStats.totalEmpresas}
            icon="🏢"
            color="bg-blue-500"
          />
          <KPICard
            title="Completitud Promedio"
            value={`${globalStats.avgCompletitud}%`}
            icon="📊"
            color="bg-green-500"
          />
          <KPICard
            title="Total Conversaciones"
            value={globalStats.totalConversations}
            icon="💬"
            color="bg-purple-500"
          />
          <KPICard
            title="Usuarios Activos (7d)"
            value={globalStats.activeUsersLast7Days}
            icon="👥"
            color="bg-indigo-500"
          />
        </div>

        {/* Alertas */}
        {alertas && (alertas.usersWithoutEmpresas.length > 0 || alertas.inactiveUsers.length > 0) && (
          <div className="mb-8 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">⚠️ Alertas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alertas.usersWithoutEmpresas.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">
                    Sin empresas ({alertas.usersWithoutEmpresas.length})
                  </h4>
                  <div className="space-y-1">
                    {alertas.usersWithoutEmpresas.map(u => (
                      <p key={u.id} className="text-sm text-yellow-700">
                        • {u.name} ({u.phone})
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {alertas.inactiveUsers.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h4 className="font-semibold text-red-800 mb-2">
                    Inactivos +7 días ({alertas.inactiveUsers.length})
                  </h4>
                  <div className="space-y-1">
                    {alertas.inactiveUsers.map(u => (
                      <p key={u.id} className="text-sm text-red-700">
                        • {u.name} (última: {formatDate(u.lastActivity)})
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Performance Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Rendimiento del Equipo ({teamMembers.length} usuarios)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Usuario</th>
                  <th className="pb-3 pr-4 hidden sm:table-cell">Teléfono</th>
                  <th className="pb-3 pr-4">Empresas</th>
                  <th className="pb-3 pr-4 hidden md:table-cell">Completitud</th>
                  <th className="pb-3 pr-4 hidden lg:table-cell">Mensajes</th>
                  <th className="pb-3">Última Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    onClick={() => router.push(`/manager/${member.id}`)}
                    className="text-sm hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#233B85] to-[#6BBACB] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {member.name[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <span className="font-medium text-slate-800 block">{member.name}</span>
                          {member.role === 'MANAGER' && (
                            <span className="text-xs text-blue-600 font-semibold">MANAGER</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 font-mono text-xs hidden sm:table-cell">
                      +{member.phone}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-slate-900">{member.empresasCount}</span>
                    </td>
                    <td className="py-3 pr-4 hidden md:table-cell">
                      <span className="text-slate-700">{member.avgCompletitud}%</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 hidden lg:table-cell">
                      {member.messagesCount}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActivityColor(member.lastActivity)}`}>
                        {formatDate(member.lastActivity)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
        </div>
        <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
