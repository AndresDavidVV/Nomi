'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getPipelineMetrics, 
  getEstablecimientos,
  getOportunidadesPorEtapa,
  obtenerSeguimientosRecientes,
  getProximosSeguimientos,
  getOportunidadesVencidas,
} from '@/lib/actions';

interface UserData {
  id: string;
  phone: string;
  name?: string;
  role?: string;
}

const ETAPA_COLORS: Record<string, string> = {
  DESCUBRIR: 'bg-blue-500',
  VALIDAR: 'bg-yellow-500',
  ACTIVAR: 'bg-green-500',
  CERRADO: 'bg-slate-500',
};

const ETAPA_LABELS: Record<string, string> = {
  DESCUBRIR: '🔍 Descubrir',
  VALIDAR: '✅ Validar',
  ACTIVAR: '🚀 Activar',
  CERRADO: '🏁 Cerrado',
};

const TIPO_ICONS: Record<string, string> = {
  RESTAURANTE: '🍽️',
  CLUB: '🎵',
  HOTEL: '🏨',
  BAR: '🍸',
  EXPERIENCIA_TURISTICA: '🌴',
  OTRO: '🏢',
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [establecimientos, setEstablecimientos] = useState<any[]>([]);
  const [seguimientos, setSeguimientos] = useState<any[]>([]);
  const [proximosSeg, setProximosSeg] = useState<any[]>([]);
  const [vencidas, setVencidas] = useState<any[]>([]);
  const [selectedEtapa, setSelectedEtapa] = useState<string | null>(null);
  const [etapaOportunidades, setEtapaOportunidades] = useState<any[]>([]);
  const [expandedEst, setExpandedEst] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/auth/whoami');
        if (!res.ok) { router.push('/login'); return; }
        const userData = await res.json();
        setUser(userData);

        const [metricsData, estData, segData, proxData, vencData] = await Promise.all([
          getPipelineMetrics(),
          getEstablecimientos(),
          obtenerSeguimientosRecientes(10),
          getProximosSeguimientos(7),
          getOportunidadesVencidas(),
        ]);

        setMetrics(metricsData);
        setEstablecimientos(estData);
        setSeguimientos(segData);
        setProximosSeg(proxData);
        setVencidas(vencData);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const handleEtapaClick = async (etapa: string) => {
    if (selectedEtapa === etapa) {
      setSelectedEtapa(null);
      setEtapaOportunidades([]);
      return;
    }
    setSelectedEtapa(etapa);
    const data = await getOportunidadesPorEtapa(etapa);
    setEtapaOportunidades(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A3F2F]"></div>
      </div>
    );
  }

  if (!user || !metrics) return null;

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#4A3F2F] via-[#5D4E37] to-[#4A3F2F] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center overflow-hidden">
                <img src="/nomi-logo.png" alt="Nomi" className="w-12 h-12 object-cover" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold">Pipeline DVA</h1>
                <p className="text-sm text-green-200 mt-1">
                  {user.name || 'Usuario'} • Nomi CRM
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard title="Establecimientos" value={metrics.totalEstablecimientos} icon="🍽️" color="bg-[#7ED321]" />
          <KPICard title="Oportunidades" value={metrics.totalOportunidades} icon="🎯" color="bg-[#5D4E37]" />
          <KPICard title="Seguimientos Pendientes" value={vencidas.length} icon="⚠️" color="bg-orange-500" />
          <KPICard title="Próximos 7 días" value={proximosSeg.length} icon="📅" color="bg-blue-500" />
        </div>

        {/* Pipeline DVA - Funnel Visual */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Pipeline DVA</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {['DESCUBRIR', 'VALIDAR', 'ACTIVAR', 'CERRADO'].map((etapa) => {
              const count = metrics.porEtapa[etapa] || 0;
              const total = metrics.totalOportunidades || 1;
              const percentage = ((count / total) * 100).toFixed(0);
              const isSelected = selectedEtapa === etapa;

              return (
                <button
                  key={etapa}
                  onClick={() => handleEtapaClick(etapa)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? 'border-[#4A3F2F] bg-[#4A3F2F]/5 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="text-2xl mb-2">{ETAPA_LABELS[etapa]?.split(' ')[0]}</div>
                  <div className="text-3xl font-bold text-slate-800">{count}</div>
                  <div className="text-xs text-slate-500 mt-1">{percentage}% del total</div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                    <div className={`${ETAPA_COLORS[etapa]} h-2 rounded-full transition-all`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expanded Etapa Details */}
          {selectedEtapa && etapaOportunidades.length > 0 && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">{ETAPA_LABELS[selectedEtapa]} — {etapaOportunidades.length} oportunidades</h4>
              <div className="space-y-2">
                {etapaOportunidades.map((op: any) => (
                  <div key={op.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">
                        {TIPO_ICONS[op.establecimiento?.tipo] || '🏢'} {op.establecimiento?.nombre}
                      </p>
                      <p className="text-xs text-slate-500">
                        {op.establecimiento?.ciudad}{op.establecimiento?.pais ? `, ${op.establecimiento.pais}` : ''}
                        {op.hipotesisValor ? ` — ${op.hipotesisValor.substring(0, 80)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {op.nivelPotencial && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          op.nivelPotencial === 'ALTO' ? 'bg-green-100 text-green-800' :
                          op.nivelPotencial === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {op.nivelPotencial}
                        </span>
                      )}
                      {op.nivelInteres && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          op.nivelInteres === 'ALTO' ? 'bg-green-100 text-green-800' :
                          op.nivelInteres === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Interés: {op.nivelInteres}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Por Tipo de Establecimiento */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Por Tipo de Establecimiento</h3>
            <div className="space-y-3">
              {Object.entries(metrics.porTipo || {}).sort((a: any, b: any) => b[1] - a[1]).map(([tipo, count]) => {
                const total = metrics.totalEstablecimientos || 1;
                const percentage = ((count as number) / total) * 100;
                return (
                  <div key={tipo}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{TIPO_ICONS[tipo] || '🏢'} {tipo.replace('_', ' ')}</span>
                      <span className="text-slate-600">{count as number} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className="bg-[#7ED321] h-2.5 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nivel de Interés */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Nivel de Interés</h3>
            <div className="space-y-3">
              {Object.entries(metrics.porNivelInteres || {}).map(([nivel, count]) => {
                const total = metrics.totalOportunidades || 1;
                const percentage = ((count as number) / total) * 100;
                const color = nivel === 'ALTO' ? 'bg-green-500' : nivel === 'MEDIO' ? 'bg-yellow-500' : nivel === 'BAJO' ? 'bg-red-500' : 'bg-slate-300';
                return (
                  <div key={nivel}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 capitalize">{nivel.toLowerCase().replace('_', ' ')}</span>
                      <span className="text-slate-600">{count as number} ({percentage.toFixed(0)}%)</span>
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

        {/* Seguimientos Vencidos */}
        {vencidas.length > 0 && (
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-red-800 mb-4">⚠️ Seguimientos Vencidos</h3>
            <div className="space-y-2">
              {vencidas.map((op: any) => (
                <div key={op.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                  <div>
                    <p className="font-medium text-slate-800">{op.establecimiento?.nombre}</p>
                    <p className="text-xs text-slate-500">Etapa: {ETAPA_LABELS[op.etapaActual]}</p>
                  </div>
                  <span className="text-xs font-semibold text-red-600">{formatDate(op.fechaSeguimiento)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Establecimientos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Establecimientos</h3>
            <button
              onClick={() => {
                const headers = ['Nombre', 'Tipo', 'Ciudad', 'País', 'Oportunidades', 'Contactos'];
                const rows = establecimientos.map(e => [
                  e.nombre, e.tipo, e.ciudad || '', e.pais || '',
                  e.oportunidades?.length || 0, e.contactos?.length || 0
                ]);
                const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `nomi-establecimientos-${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4A3F2F] to-[#5D4E37] text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
            >
              📥 Exportar CSV
            </button>
          </div>

          {establecimientos.length === 0 ? (
            <p className="text-slate-500 text-sm">No hay establecimientos registrados.</p>
          ) : (
            <div className="space-y-2">
              {establecimientos.map((est) => (
                <div key={est.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedEst(expandedEst === est.id ? null : est.id)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className="text-2xl">{TIPO_ICONS[est.tipo] || '🏢'}</div>
                      <div>
                        <p className="font-semibold text-slate-800">{est.nombre}</p>
                        <p className="text-xs text-slate-500">{est.ciudad}{est.pais ? `, ${est.pais}` : ''} • {est.tipo?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600">🎯 {est.oportunidades?.length || 0}</span>
                      <span className="text-xs text-slate-600">👤 {est.contactos?.length || 0}</span>
                      <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedEst === est.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {expandedEst === est.id && (
                    <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                      {est.contactos?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Contactos</h4>
                          {est.contactos.map((c: any) => (
                            <div key={c.id} className="text-sm text-slate-600 bg-slate-50 p-2 rounded mb-1">
                              <p className="font-medium">{c.nombre} {c.cargo ? `- ${c.cargo}` : ''} {c.esDecisor ? '⭐ Decisor' : ''}</p>
                              {c.telefono && <p className="text-xs">📞 {c.telefono}</p>}
                              {c.email && <p className="text-xs">✉️ {c.email}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      {est.oportunidades?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Oportunidades</h4>
                          {est.oportunidades.map((op: any) => (
                            <div key={op.id} className="text-sm bg-blue-50 p-3 rounded mb-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                  op.etapaActual === 'DESCUBRIR' ? 'bg-blue-100 text-blue-800' :
                                  op.etapaActual === 'VALIDAR' ? 'bg-yellow-100 text-yellow-800' :
                                  op.etapaActual === 'ACTIVAR' ? 'bg-green-100 text-green-800' :
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  {ETAPA_LABELS[op.etapaActual]}
                                </span>
                                {op.nivelPotencial && <span className="text-xs text-slate-500">Potencial: {op.nivelPotencial}</span>}
                              </div>
                              {op.hipotesisValor && <p className="text-slate-600">{op.hipotesisValor}</p>}
                              {op.valorNomi && <p className="text-xs text-green-700 mt-1">Valor Nomi: {op.valorNomi}</p>}
                              {op.resultadoFinal && <p className="text-xs font-semibold mt-1">Resultado: {op.resultadoFinal}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seguimientos Recientes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Seguimientos Recientes</h3>
          {seguimientos.length === 0 ? (
            <p className="text-slate-500 text-sm">No hay seguimientos registrados.</p>
          ) : (
            <div className="space-y-3">
              {seguimientos.map((seg: any) => (
                <div key={seg.id} className="border-l-4 border-[#7ED321] pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-800">{seg.oportunidad?.establecimiento?.nombre}</p>
                      <p className="text-sm text-slate-600 mt-1">{seg.accion}</p>
                      {seg.resultado && <p className="text-xs text-slate-500 mt-1">Resultado: {seg.resultado}</p>}
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap ml-3">{formatDate(seg.fecha)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-slate-600">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`${color} w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
