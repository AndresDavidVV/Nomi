'use client';

import { useEffect, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  messages?: Message[];
}

interface ConversationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  activeConversationId?: string;
}

export default function ConversationSidebar({
  isOpen,
  onClose,
  onSelectConversation,
  onNewConversation,
  activeConversationId,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (deletingId) return;

    setDeletingId(convId);
    try {
      const res = await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== convId));
        // If we deleted the active conversation, start fresh
        if (convId === activeConversationId) {
          onNewConversation();
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const cleanupEmpty = async () => {
    try {
      const res = await fetch('/api/conversations/cleanup', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.deleted > 0) {
          loadConversations();
        }
      }
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'ayer';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      const res = await fetch(`/api/conversations/${conversation.id}`);
      if (res.ok) {
        const fullConversation = await res.json();
        onSelectConversation(fullConversation);
        if (window.innerWidth < 768) {
          onClose();
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:sticky top-0 left-0 h-[100dvh] w-80 bg-white border-r border-slate-200 shadow-xl md:shadow-none transform transition-transform duration-300 z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Historial</h2>
          <button
            onClick={onClose}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Conversation Button */}
        <div className="p-3 border-b border-slate-200">
          <button
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 768) {
                onClose();
              }
            }}
            className="w-full px-4 py-3 bg-gradient-to-br from-[#4A3F2F] to-[#5D4E37] text-white rounded-lg font-medium shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva conversación
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No hay conversaciones previas
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative flex items-center rounded-lg transition-colors cursor-pointer ${
                    activeConversationId === conv.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <button
                    onClick={() => handleSelectConversation(conv)}
                    className="flex-1 text-left p-3 pr-10 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${
                        activeConversationId === conv.id ? 'text-[#4A3F2F]' : 'text-slate-800'
                      }`}>
                        {conv.title}
                      </p>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    {conv.messages && conv.messages[0] && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {conv.messages[0].content}
                      </p>
                    )}
                  </button>

                  {/* Delete button — visible on hover */}
                  <button
                    onClick={(e) => deleteConversation(e, conv.id)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                      deletingId === conv.id
                        ? 'bg-red-100 text-red-500'
                        : 'opacity-0 group-hover:opacity-100 hover:bg-red-100 text-slate-400 hover:text-red-500'
                    }`}
                    title="Eliminar conversación"
                  >
                    {deletingId === conv.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — cleanup button */}
        {conversations.length > 0 && (
          <div className="p-3 border-t border-slate-200">
            <button
              onClick={cleanupEmpty}
              className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              Limpiar conversaciones vacías
            </button>
          </div>
        )}
      </div>
    </>
  );
}
