'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface FeedbackItem {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  user: { name: string | null; phone: string };
}

interface Stats {
  averageRating: number;
  totalCount: number;
  distribution: Record<number, number>;
  statusDistribution: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  pending: { label: 'Pendiente', emoji: '🟡', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  reviewed: { label: 'Revisado', emoji: '🔵', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  resolved: { label: 'Resuelto', emoji: '🟢', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

export default function FeedbackPanel() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFeedback();
  }, [filterRating, filterStatus, page]);

  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRating) params.set('rating', filterRating.toString());
      if (filterStatus) params.set('status', filterStatus);
      params.set('page', page.toString());

      const res = await fetch(`/api/feedback?${params}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setFeedbacks(data.feedbacks);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number, size = 'text-lg') => (
    <span className={size}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-slate-200'}>★</span>
      ))}
    </span>
  );

  const ratingLabel = (rating: number) => {
    const labels: Record<number, string> = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' };
    return labels[rating] || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#233B85] via-[#195A9D] to-[#233B85] text-white px-4 py-3 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Opiniones de Usuarios</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Card */}
        {stats && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-6 flex-wrap">
              {/* Average */}
              <div className="text-center">
                <div className="text-5xl font-bold text-slate-800">{stats.averageRating || '—'}</div>
                <div className="mt-1">{renderStars(Math.round(stats.averageRating), 'text-2xl')}</div>
                <div className="text-sm text-slate-500 mt-1">{stats.totalCount} opiniones</div>
              </div>

              {/* Distribution bars */}
              <div className="flex-1 min-w-[200px] space-y-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = stats.distribution[star] || 0;
                  const pct = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                  const isActive = filterRating === star;
                  return (
                    <button
                      key={star}
                      onClick={() => { setFilterRating(isActive ? null : star); setPage(1); }}
                      className={`w-full flex items-center gap-2 group rounded-lg px-2 py-0.5 transition-colors ${
                        isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm text-slate-600 w-4">{star}</span>
                      <span className="text-yellow-400 text-sm">★</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            star <= 2 ? 'bg-red-400' : star === 3 ? 'bg-yellow-400' : 'bg-green-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Status Filter Tabs */}
        {stats && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => { setFilterStatus(null); setPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                !filterStatus
                  ? 'bg-[#233B85] text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todos
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${!filterStatus ? 'bg-white/20' : 'bg-slate-100'}`}>
                {stats.totalCount}
              </span>
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const count = stats.statusDistribution?.[key] || 0;
              const isActive = filterStatus === key;
              return (
                <button
                  key={key}
                  onClick={() => { setFilterStatus(isActive ? null : key); setPage(1); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? `${config.bg} ${config.color} ${config.border} border shadow-sm`
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{config.emoji}</span>
                  {config.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/50' : 'bg-slate-100'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Filters Summary */}
        {(filterRating || filterStatus) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-500">Filtrando:</span>
            {filterRating && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                {filterRating} ★ — {ratingLabel(filterRating)}
                <button onClick={() => { setFilterRating(null); setPage(1); }} className="ml-1 hover:text-blue-900">✕</button>
              </span>
            )}
            {filterStatus && (
              <span className={`px-2 py-1 ${STATUS_CONFIG[filterStatus].bg} ${STATUS_CONFIG[filterStatus].color} rounded-full text-xs font-medium flex items-center gap-1`}>
                {STATUS_CONFIG[filterStatus].emoji} {STATUS_CONFIG[filterStatus].label}
                <button onClick={() => { setFilterStatus(null); setPage(1); }} className="ml-1 hover:opacity-70">✕</button>
              </span>
            )}
          </div>
        )}

        {/* Feedback List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-2">📭</div>
            <p>No hay opiniones {filterStatus ? `con estado "${STATUS_CONFIG[filterStatus]?.label}"` : filterRating ? `con ${filterRating} estrella${filterRating > 1 ? 's' : ''}` : 'todavía'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map(fb => {
              const statusConf = STATUS_CONFIG[fb.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={fb.id}
                  className={`rounded-xl border p-4 transition-colors bg-white ${statusConf.border}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderStars(fb.rating, 'text-base')}
                        <span className="text-xs font-medium text-slate-500">{ratingLabel(fb.rating)}</span>
                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.bg} ${statusConf.color}`}>
                          {statusConf.emoji} {statusConf.label}
                        </span>
                      </div>
                      {fb.comment && (
                        <p className="mt-2 text-sm text-slate-700 leading-relaxed">{fb.comment}</p>
                      )}
                      {/* Admin note (visible to user when resolved) */}
                      {fb.adminNote && fb.status === 'resolved' && (
                        <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                          <span className="text-emerald-500 text-sm mt-0.5">✓</span>
                          <p className="text-xs text-emerald-700 leading-relaxed">{fb.adminNote}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                    <span>{fb.user.name || fb.user.phone}</span>
                    <span>·</span>
                    <span>{formatDate(fb.createdAt)}</span>
                    {fb.resolvedAt && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-500">Resuelto {formatDate(fb.resolvedAt)}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50"
                >
                  ← Anterior
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-500">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
