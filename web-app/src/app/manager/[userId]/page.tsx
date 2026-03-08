'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  createdAt: string;
}

interface Empresa {
  id: string;
  nombreLegal: string;
  completitud: number;
  sector?: string;
  necesidades: any[];
  ofertas: any[];
  contactos: any[];
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  messages: Message[];
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface ActivityDay {
  date: string;
  count: number;
}

export default function ManagerDrilldown() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<ActivityDay[]>([]);
  const [activeTab, setActiveTab] = useState<'empresas' | 'conversations' | 'activity'>('empresas');
  const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/manager/${userId}`);
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
          throw new Error('Failed to load user data');
        }

        const data = await res.json();
        setUser(data.user);
        setEmpresas(data.empresas);
        setConversations(data.conversations);
        setActivityTimeline(data.activityTimeline);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#233B85]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const avgCompletitud = empresas.length > 0
    ? Math.round(empresas.reduce((sum, e) => sum + e.completitud, 0) / empresas.length)
    : 0;

  const maxActivity = Math.max(...activityTimeline.map(a => a.count), 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#233B85] via-[#195A9D] to-[#233B85] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-3xl font-bold">
                {user.name[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{user.name}</h1>
                <p className="text-sm text-blue-200 mt-1">
                  {user.phone} • Registrado: {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/manager')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
            >
              ← Panel Gerencial
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard title="Empresas Creadas" value={empresas.length} icon="🏢" />
          <StatCard title="Completitud Promedio" value={`${avgCompletitud}%`} icon="📊" />
          <StatCard title="Conversaciones" value={conversations.length} icon="💬" />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex flex-wrap gap-2 p-2">
              <TabButton 
                active={activeTab === 'empresas'} 
                onClick={() => setActiveTab('empresas')}
                label={`Empresas (${empresas.length})`}
              />
              <TabButton 
                active={activeTab === 'conversations'} 
                onClick={() => setActiveTab('conversations')}
                label={`Conversaciones (${conversations.length})`}
              />
              <TabButton 
                active={activeTab === 'activity'} 
                onClick={() => setActiveTab('activity')}
                label="Actividad"
              />
            </div>
          </div>

          <div className="p-6">
            {/* Empresas Tab */}
            {activeTab === 'empresas' && (
              <div className="space-y-4">
                {empresas.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    Este usuario no ha creado empresas aún.
                  </p>
                ) : (
                  empresas.map((empresa) => (
                    <div key={empresa.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div
                        onClick={() => setExpandedEmpresa(expandedEmpresa === empresa.id ? null : empresa.id)}
                        className="bg-slate-50 p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-slate-900">{empresa.nombreLegal}</h4>
                            {empresa.sector && (
                              <p className="text-sm text-slate-600 mt-1">{empresa.sector}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full">
                              <span className="text-sm font-semibold text-slate-700">
                                {empresa.completitud}%
                              </span>
                              <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#233B85] to-[#6BBACB]"
                                  style={{ width: `${empresa.completitud}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedEmpresa === empresa.id && (
                        <div className="p-4 space-y-4 bg-white">
                          {/* Necesidades */}
                          <div>
                            <h5 className="font-semibold text-slate-800 mb-2">
                              📋 Necesidades ({empresa.necesidades.length})
                            </h5>
                            {empresa.necesidades.length === 0 ? (
                              <p className="text-sm text-slate-500">Sin necesidades</p>
                            ) : (
                              <ul className="space-y-2">
                                {empresa.necesidades.map((nec) => (
                                  <li key={nec.id} className="text-sm text-slate-700 pl-4 border-l-2 border-blue-300">
                                    {nec.enunciado}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Ofertas */}
                          <div>
                            <h5 className="font-semibold text-slate-800 mb-2">
                              ✨ Ofertas ({empresa.ofertas.length})
                            </h5>
                            {empresa.ofertas.length === 0 ? (
                              <p className="text-sm text-slate-500">Sin ofertas</p>
                            ) : (
                              <ul className="space-y-2">
                                {empresa.ofertas.map((oferta) => (
                                  <li key={oferta.id} className="text-sm text-slate-700 pl-4 border-l-2 border-green-300">
                                    {oferta.capacidad}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Contactos */}
                          <div>
                            <h5 className="font-semibold text-slate-800 mb-2">
                              👤 Contactos ({empresa.contactos.length})
                            </h5>
                            {empresa.contactos.length === 0 ? (
                              <p className="text-sm text-slate-500">Sin contactos</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {empresa.contactos.map((contacto) => (
                                  <div key={contacto.id} className="text-sm bg-slate-50 rounded p-2">
                                    <p className="font-medium text-slate-800">{contacto.nombre}</p>
                                    {contacto.cargo && <p className="text-slate-600 text-xs">{contacto.cargo}</p>}
                                    {contacto.telefono && <p className="text-slate-500 text-xs">{contacto.telefono}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Conversations Tab */}
            {activeTab === 'conversations' && (
              <div className="space-y-4">
                {conversations.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    Este usuario no tiene conversaciones aún.
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <div key={conv.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div
                        onClick={() => setExpandedConversation(expandedConversation === conv.id ? null : conv.id)}
                        className="bg-slate-50 p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-slate-900">{conv.title}</h4>
                            <p className="text-sm text-slate-600 mt-1">
                              {conv.messages.length} mensajes • Última: {formatDate(conv.lastMessageAt)}
                            </p>
                          </div>
                          <span className="text-slate-400 text-lg">
                            {expandedConversation === conv.id ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>

                      {expandedConversation === conv.id && (
                        <div className="p-4 space-y-3 bg-white max-h-96 overflow-y-auto">
                          {conv.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                msg.role === 'user'
                                  ? 'bg-gradient-to-r from-[#233B85] to-[#195A9D] text-white'
                                  : 'bg-slate-100 text-slate-800'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p className={`text-xs mt-1 ${
                                  msg.role === 'user' ? 'text-blue-200' : 'text-slate-500'
                                }`}>
                                  {formatDateTime(msg.createdAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-4">
                  Mensajes por día (últimos 30 días)
                </h4>
                {activityTimeline.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    Sin actividad en los últimos 30 días.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activityTimeline.map((day) => (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 w-24 font-mono">
                          {formatDate(day.date)}
                        </span>
                        <div className="flex-1 h-8 bg-slate-100 rounded overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#233B85] to-[#6BBACB] flex items-center px-2"
                            style={{ width: `${(day.count / maxActivity) * 100}%` }}
                          >
                            <span className="text-xs font-semibold text-white">
                              {day.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{icon}</div>
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-gradient-to-r from-[#233B85] to-[#195A9D] text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
