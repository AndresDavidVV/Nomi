'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getPortfolioMetrics, 
  getTopNecesidades, 
  getNecesidadesVencidas,
  getProximasAcciones,
  obtenerSeguimientosRecientes,
  getNecesidadesPorEstado,
  getMisEmpresas,
  getAccionesPorResponsable
} from '@/lib/actions';

interface UserData {
  id: string;
  phone: string;
  name?: string;
  role?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [topNecesidades, setTopNecesidades] = useState<any[]>([]);
  const [vencidas, setVencidas] = useState<any[]>([]);
  const [proximasAcciones, setProximasAcciones] = useState<any[]>([]);
  const [seguimientos, setSeguimientos] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [misEmpresas, setMisEmpresas] = useState<any[]>([]);
  const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);
  const [accionesPorResponsable, setAccionesPorResponsable] = useState<Record<string, any[]>>({});
  const [accionesFilter, setAccionesFilter] = useState<'deadline' | 'impact' | 'urgency'>('deadline');
  const [expandedResponsable, setExpandedResponsable] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check auth
        const res = await fetch('/api/auth/whoami');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const userData = await res.json();
        setUser(userData);

        // Load all metrics in parallel
        const [metricsData, topData, vencidasData, proximasData, seguimientosData, empresasData, accionesData] = await Promise.all([
          getPortfolioMetrics(userData.id),
          getTopNecesidades(userData.id, 10),
          getNecesidadesVencidas(userData.id),
          getProximasAcciones(userData.id, 7),
          obtenerSeguimientosRecientes(userData.id, 10),
          getMisEmpresas(userData.id),
          getAccionesPorResponsable(),
        ]);

        setMetrics(metricsData);
        setTopNecesidades(topData);
        setVencidas(vencidasData);
        setProximasAcciones(proximasData);
        setSeguimientos(seguimientosData);
        setMisEmpresas(empresasData);
        setAccionesPorResponsable(accionesData);

        // Load admin stats
        try {
          const adminRes = await fetch('/api/admin/stats?key=ccc-admin-2026-stats');
          if (adminRes.ok) {
            const adminData = await adminRes.json();
            setAdminStats(adminData);
          }
        } catch (e) { /* optional */ }
      } catch (error) {
        console.error('Error loading dashboard:', error);
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

  if (!user || !metrics) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#233B85] via-[#195A9D] to-[#233B85] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
                <img src="/ccc-logo.svg" alt="CCC" className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold hidden sm:block">Dashboard de Inteligencia Económica</h1>
                <h1 className="text-lg sm:text-2xl font-bold sm:hidden">Dashboard</h1>
                <p className="text-sm text-blue-200 mt-1">
                  {user.name || 'Usuario'} • CCC
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.role === 'MANAGER' && (
                <button
                  onClick={() => router.push('/manager')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                >
                  🏢 Panel Gerencial
                </button>
              )}
              <button
                onClick={() => router.push('/feedback')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                ⭐ Opiniones
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
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Empresas"
            value={metrics.totalEmpresas}
            icon="🏢"
            color="bg-blue-500"
          />
          <KPICard
            title="Total Necesidades"
            value={metrics.totalNecesidades}
            icon="📋"
            color="bg-purple-500"
          />
          <KPICard
            title="Valor Total de Problemas"
            value={formatCurrency(metrics.valorTotal)}
            icon="💰"
            color="bg-green-500"
          />
          <KPICard
            title="Acciones Pendientes"
            value={Object.values(accionesPorResponsable).flat().length}
            icon="📌"
            color="bg-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Necesidades por Estado */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Necesidades por Estado</h3>
            <div className="space-y-3">
              {Object.entries(metrics.porEstado || {}).map(([estado, count]) => {
                const total = metrics.totalNecesidades;
                const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                const color = estado === 'ABIERTO' ? 'bg-yellow-500' : estado === 'EN_PROCESO' ? 'bg-blue-500' : 'bg-green-500';
                
                return (
                  <div key={estado}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{estado.replace('_', ' ')}</span>
                      <span className="text-slate-600">{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Necesidades por Prioridad */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Necesidades por Prioridad</h3>
            <div className="space-y-3">
              {Object.entries(metrics.porPrioridad || {}).map(([prioridad, count]) => {
                const total = metrics.totalNecesidades;
                const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                const color = prioridad === 'alta' ? 'bg-red-500' : prioridad === 'media' ? 'bg-yellow-500' : 'bg-green-500';
                
                return (
                  <div key={prioridad}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 capitalize">{prioridad.replace('_', ' ')}</span>
                      <span className="text-slate-600">{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top 10 Necesidades por Magnitud */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 10 Necesidades por Magnitud</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="pb-3">Empresa</th>
                  <th className="pb-3">Necesidad</th>
                  <th className="pb-3">Magnitud</th>
                  <th className="pb-3">Prioridad</th>
                  <th className="pb-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topNecesidades.slice(0, 10).map((nec) => (
                  <tr key={nec.id} className="text-sm">
                    <td className="py-3 text-slate-700 font-medium">{nec.empresa.nombreLegal}</td>
                    <td className="py-3 text-slate-600">{nec.enunciado.substring(0, 60)}...</td>
                    <td className="py-3 text-slate-900 font-semibold">{formatCurrency(nec.magnitud || 0)}</td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        nec.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                        nec.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {nec.prioridad || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        nec.estado === 'ABIERTO' ? 'bg-yellow-100 text-yellow-800' :
                        nec.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {nec.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Próximas Acciones */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Próximas Acciones (7 días)</h3>
          <div className="space-y-3">
            {proximasAcciones.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay acciones próximas en los siguientes 7 días.</p>
            ) : (
              proximasAcciones.map((nec) => (
                <div key={nec.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-800">{nec.empresa.nombreLegal}</p>
                        <p className="text-sm text-slate-600">{nec.proximoPaso || nec.enunciado}</p>
                        <p className="text-xs text-slate-500 mt-1">Responsable: {nec.responsable || 'N/A'}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 whitespace-nowrap ml-3">
                        {formatDate(nec.fechaEstimada)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Acciones Pendientes por Responsable */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-slate-800">📌 Acciones Pendientes por Responsable</h3>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {([
                { key: 'deadline', label: '📅 Fecha', title: 'Próximas a vencer' },
                { key: 'impact', label: '💰 Impacto', title: 'Mayor magnitud' },
                { key: 'urgency', label: '🔥 Urgencia', title: 'Mayor prioridad' },
              ] as const).map(({ key, label, title }) => (
                <button
                  key={key}
                  title={title}
                  onClick={() => setAccionesFilter(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    accionesFilter === key 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {Object.keys(accionesPorResponsable).length === 0 ? (
            <p className="text-slate-500 text-sm">No hay acciones pendientes con responsable asignado.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(accionesPorResponsable)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([responsable, acciones]) => {
                  // Sort acciones based on filter
                  const sorted = [...acciones].sort((a: any, b: any) => {
                    if (accionesFilter === 'impact') {
                      return (b.magnitud || 0) - (a.magnitud || 0);
                    }
                    if (accionesFilter === 'urgency') {
                      const prioOrder: Record<string, number> = { alta: 1, media: 2, baja: 3 };
                      return (prioOrder[a.prioridad] || 4) - (prioOrder[b.prioridad] || 4);
                    }
                    // deadline
                    const dateA = a.fechaEstimada ? new Date(a.fechaEstimada).getTime() : Infinity;
                    const dateB = b.fechaEstimada ? new Date(b.fechaEstimada).getTime() : Infinity;
                    return dateA - dateB;
                  });

                  const isExpanded = expandedResponsable === responsable;
                  const overdue = sorted.filter((a: any) => a.fechaEstimada && new Date(a.fechaEstimada) < new Date());

                  return (
                    <div key={responsable} className="border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedResponsable(isExpanded ? null : responsable)}
                        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#233B85] to-[#6BBACB] flex items-center justify-center text-white font-bold text-sm">
                            {responsable[0].toUpperCase()}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-slate-800">{responsable}</p>
                            <p className="text-xs text-slate-500">{acciones.length} pendiente{acciones.length !== 1 ? 's' : ''}{overdue.length > 0 ? ` • ${overdue.length} vencida${overdue.length !== 1 ? 's' : ''}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {overdue.length > 0 && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">⚠️ {overdue.length}</span>
                          )}
                          <svg
                            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                          {sorted.map((acc: any) => {
                            const isOverdue = acc.fechaEstimada && new Date(acc.fechaEstimada) < new Date();
                            return (
                              <div key={acc.id} className={`p-3 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-800 text-sm">{acc.empresa?.nombreLegal}</p>
                                    <p className="text-sm text-slate-600 mt-1">{acc.enunciado}</p>
                                    {acc.proximoPaso && (
                                      <p className="text-xs text-blue-600 mt-1">→ {acc.proximoPaso}</p>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    {acc.prioridad && (
                                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                        acc.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                                        acc.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                      }`}>
                                        {acc.prioridad}
                                      </span>
                                    )}
                                    {acc.magnitud && (
                                      <span className="text-xs font-semibold text-slate-700">
                                        {formatCurrency(acc.magnitud)}
                                      </span>
                                    )}
                                    {acc.fechaEstimada && (
                                      <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                        {isOverdue ? '⚠️ ' : ''}{formatDate(acc.fechaEstimada)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Empresas del Equipo */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Empresas del Equipo</h3>
            <button
              onClick={() => {
                // Generate CSV
                const headers = ['Nombre', 'Sector', 'Completitud (%)', 'Necesidades', 'Ofertas', 'Contactos', 'Propuesta de Valor'];
                const rows = misEmpresas.map(e => [
                  e.nombreLegal || '',
                  e.sector || '',
                  e.completitud || 0,
                  e.necesidades?.length || 0,
                  e.ofertas?.length || 0,
                  e.contactos?.length || 0,
                  e.propuestaValor || ''
                ]);
                
                const csvContent = [
                  headers.join(','),
                  ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                ].join('\n');
                
                // Download
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `mis-empresas-${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#233B85] to-[#195A9D] text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
            >
              📥 Exportar CSV
            </button>
          </div>
          
          {misEmpresas.length === 0 ? (
            <p className="text-slate-500 text-sm">No has registrado empresas aún.</p>
          ) : (
            <div className="space-y-2">
              {misEmpresas.map((empresa) => (
                <div key={empresa.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Header (always visible) */}
                  <button
                    onClick={() => setExpandedEmpresa(expandedEmpresa === empresa.id ? null : empresa.id)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#233B85] to-[#6BBACB] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(empresa.nombreLegal || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{empresa.nombreLegal}</p>
                        <p className="text-xs text-slate-500">{empresa.sector || 'Sin sector'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Completitud</p>
                        <p className="text-sm font-bold text-slate-800">{empresa.completitud}%</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span>📋 {empresa.necesidades?.length || 0}</span>
                        <span>💼 {empresa.ofertas?.length || 0}</span>
                        <span>👤 {empresa.contactos?.length || 0}</span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${expandedEmpresa === empresa.id ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {expandedEmpresa === empresa.id && (
                    <div className="p-4 bg-white border-t border-slate-200 space-y-4">
                      {/* Propuesta de Valor */}
                      {empresa.propuestaValor && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-1">Propuesta de Valor</h4>
                          <p className="text-sm text-slate-600">{empresa.propuestaValor}</p>
                        </div>
                      )}

                      {/* Contactos */}
                      {empresa.contactos && empresa.contactos.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Contactos</h4>
                          <div className="space-y-2">
                            {empresa.contactos.map((c: any) => (
                              <div key={c.id} className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                <p className="font-medium">{c.nombre} {c.cargo ? `- ${c.cargo}` : ''}</p>
                                {c.telefono && <p className="text-xs">📞 {c.telefono}</p>}
                                {c.email && <p className="text-xs">✉️ {c.email}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Necesidades */}
                      {empresa.necesidades && empresa.necesidades.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Necesidades</h4>
                          <div className="space-y-2">
                            {empresa.necesidades.map((n: any) => (
                              <div key={n.id} className="text-sm text-slate-600 bg-blue-50 p-2 rounded">
                                <p>{n.enunciado}</p>
                                {n.categoria && (
                                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-700">
                                    {n.categoria}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ofertas */}
                      {empresa.ofertas && empresa.ofertas.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Ofertas</h4>
                          <div className="space-y-2">
                            {empresa.ofertas.map((o: any) => (
                              <div key={o.id} className="text-sm text-slate-600 bg-green-50 p-2 rounded">
                                <p>{o.capacidad}</p>
                                {o.target && <p className="text-xs text-slate-500 mt-1">Target: {o.target}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usuarios de la Plataforma */}
        {adminStats && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Usuarios de la Plataforma</h3>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">{adminStats.totalUsers} usuarios</span>
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">{adminStats.totalMsgs} mensajes</span>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full font-medium">{adminStats.convsWithMsgs} conversaciones</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Nombre</th>
                    <th className="pb-3 pr-4">Teléfono</th>
                    <th className="pb-3">Registrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminStats.users.map((u: any, i: number) => (
                    <tr key={i} className="text-sm">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#233B85] to-[#6BBACB] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(u.name || '?')[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">{u.name || '(sin nombre)'}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600 font-mono text-xs">+{u.phone}</td>
                      <td className="py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Seguimientos Recientes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Seguimientos Recientes</h3>
          <div className="space-y-3">
            {seguimientos.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay seguimientos registrados.</p>
            ) : (
              seguimientos.map((seg) => (
                <div key={seg.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-800">{seg.necesidad.empresa.nombreLegal}</p>
                      <p className="text-sm text-slate-600 mt-1">{seg.accion}</p>
                      {seg.resultado && (
                        <p className="text-xs text-slate-500 mt-1">Resultado: {seg.resultado}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap ml-3">
                      {formatDate(seg.fecha)}
                    </span>
                  </div>
                </div>
              ))
            )}
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
