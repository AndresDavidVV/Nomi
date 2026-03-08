'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ConversationSidebar from '@/components/ConversationSidebar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UserData {
  id: string;
  phone: string;
  name?: string;
  email?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages?: Message[];
}

const QUICK_ACTIONS = [
  { label: '🏢 Registrar empresa', prompt: 'Quiero registrar una nueva empresa' },
  { label: '🔍 Buscar empresa', prompt: 'Buscar una empresa en la base de datos' },
  { label: '📋 Ver checklist', prompt: '¿Qué información necesito para completar una ficha de empresa?' },
];

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

// Declaración de tipos para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function Chat() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const [isLocked, setIsLocked] = useState(false); // locked recording mode (tap to start, tap to send)
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  
  // Conversation state
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/whoami');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const userData = await res.json();
        setUser(userData);
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  // No longer create conversation on mount — lazy creation on first message

  // Inactivity detection
  useEffect(() => {
    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT && messages.length > 0) {
          // User has been inactive for 30+ minutes — reset for new conversation (lazy creation)
          setCurrentConversation(null);
          setMessages([]);
          setShowWelcome(true);
        }
      }, INACTIVITY_TIMEOUT);
    };

    // Reset timer on any user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [messages]);

  const createNewConversation = async () => {
    try {
      const res = await fetch('/api/conversations', { method: 'POST' });
      if (res.ok) {
        const newConv = await res.json();
        setCurrentConversation(newConv);
        setMessages([]);
        setShowWelcome(true);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    if (conversation.messages) {
      setMessages(conversation.messages);
    }
    setShowWelcome(conversation.messages?.length === 0);
  };

  const handleNewConversation = () => {
    // Just reset state — conversation will be created lazily on first message
    setCurrentConversation(null);
    setMessages([]);
    setShowWelcome(true);
  };

  useEffect(() => {
    if (messages.length > 0) setShowWelcome(false);
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  // Audio recording functions (WhatsApp style: hold-to-record OR tap-to-lock)
  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Tu navegador no soporta grabación de audio. Usa HTTPS y un navegador moderno.');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
      }, 1000);
      
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      console.log('[Audio] Recording started');
    } catch (error: any) {
      console.error('[Audio] Recording error:', error);
      if (error.name === 'NotAllowedError') {
        alert('Permiso de micrófono denegado. Permite el acceso al micrófono en tu navegador.');
      } else if (error.name === 'NotFoundError') {
        alert('No se encontró micrófono en este dispositivo.');
      } else {
        alert('Error al iniciar grabación: ' + error.message);
      }
      setIsRecording(false);
    }
  }, []);

  const finishRecording = useCallback(async () => {
    // Clear duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size < 1000) {
          console.log('[Audio] Recording too small, ignoring');
          setIsRecording(false);
          setIsLocked(false);
          setRecordingDuration(0);
          return;
        }

        // Transcribe via server
        try {
          setInput('🎤 Transcribiendo...');
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const { transcript } = await res.json();
            if (transcript && transcript.trim()) {
              setInput(transcript.trim());
            } else {
              setInput('');
            }
          } else {
            console.error('[Audio] Transcription failed');
            setInput('');
          }
        } catch (error) {
          console.error('[Audio] Transcription error:', error);
          setInput('');
        }
        setIsRecording(false);
        setIsLocked(false);
        setRecordingDuration(0);
      };
      mediaRecorderRef.current.stop();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      setIsLocked(false);
      setRecordingDuration(0);
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        // Discard — don't transcribe
      };
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsLocked(false);
    setRecordingDuration(0);
    console.log('[Audio] Recording cancelled');
  }, []);

  // WhatsApp logic: 
  // - Press down → start timer. If held > 300ms, it's hold-to-record mode
  // - Release < 300ms → it's a tap → enter locked mode (tap again to send)
  const handleMicrophonePress = useCallback(() => {
    if (isRecording && isLocked) {
      // Already locked and recording → tap to finish & send
      finishRecording();
      return;
    }
    
    isHoldingRef.current = true;
    
    // Start recording immediately
    startRecording();
    
    // Set a timer: if they release before 300ms, switch to locked mode
    holdTimerRef.current = setTimeout(() => {
      // They're still holding after 300ms → hold-to-record mode (already recording)
      holdTimerRef.current = null;
    }, 300);
  }, [isRecording, isLocked, startRecording, finishRecording]);

  const handleMicrophoneRelease = useCallback(() => {
    isHoldingRef.current = false;
    
    if (isLocked) return; // In locked mode, release doesn't stop recording
    
    if (holdTimerRef.current) {
      // Released before 300ms → short tap → lock mode
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      setIsLocked(true);
      console.log('[Audio] Locked mode activated (tap to send)');
      return;
    }
    
    // Released after 300ms → hold-to-record, finish now
    if (isRecording) {
      const duration = Date.now() - recordingStartTimeRef.current;
      if (duration < 600) {
        // Too short even for hold mode, cancel
        cancelRecording();
        return;
      }
      finishRecording();
    }
  }, [isRecording, isLocked, finishRecording, cancelRecording]);

  // OCR Business Card function
  const handleImageUpload = useCallback(async (file: File) => {
    try {
      setIsProcessingImage(true);

      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1]; // Remove data:image/...;base64, prefix

        try {
          const res = await fetch('/api/ocr-business-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Data }),
          });

          if (res.ok) {
            const { extractedText } = await res.json();
            
            // Insert as a chat message
            const userMsg: Message = {
              id: Date.now().toString(),
              role: 'user',
              content: `Escaneé una tarjeta de presentación:\n\n${extractedText}`,
            };
            
            await sendMessage(userMsg.content);
          } else {
            console.error('[OCR] Failed to process image');
          }
        } catch (error) {
          console.error('[OCR] Error:', error);
        } finally {
          setIsProcessingImage(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('[OCR] Upload error:', error);
      setIsProcessingImage(false);
    }
  }, []);

  const openCamera = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleImageUpload]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      // Lazy-create conversation on first message if none exists
      let convId = currentConversation?.id;
      if (!convId) {
        try {
          const convRes = await fetch('/api/conversations', { method: 'POST' });
          if (convRes.ok) {
            const newConv = await convRes.json();
            convId = newConv.id;
            setCurrentConversation(newConv);
          }
        } catch (err) {
          console.error('Error creating conversation:', err);
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          conversationId: convId,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulated = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
          );
        }
      }
    } catch (e) {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: 'Error al conectar con el servidor. Intenta de nuevo.' } : m)
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, currentConversation]);

  const submitFeedback = async () => {
    if (!feedbackRating || feedbackSending) return;
    setFeedbackSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: feedbackRating,
          comment: feedbackComment.trim() || null,
          conversationId: currentConversation?.id || null,
        }),
      });
      if (res.ok) {
        setFeedbackSent(true);
        setTimeout(() => {
          setShowFeedback(false);
          setFeedbackRating(0);
          setFeedbackComment('');
          setFeedbackSent(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Sidebar */}
      <ConversationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        activeConversationId={currentConversation?.id}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="relative bg-gradient-to-r from-[#233B85] via-[#195A9D] to-[#233B85] text-white px-3 py-2.5 shadow-lg">
          <div className="max-w-lg mx-auto flex items-center gap-2">
            {/* Hamburger Menu */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors flex-shrink-0"
              title="Historial de conversaciones"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo + Title */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
                <img src="/ccc-logo.svg" alt="CCC" className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold tracking-tight leading-tight truncate">Inteligencia Económica</h1>
                <p className="text-[10px] text-blue-200 leading-tight">
                  {user?.name ? `Hola, ${user.name}` : 'Cámara de Comercio de Cali'}
                </p>
              </div>
            </div>

            {/* Dashboard icon button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
              title="Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
            {showWelcome && (
              <div className="flex flex-col items-center text-center pt-8 pb-4 animate-fadeIn">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#233B85] to-[#6BBACB] flex items-center justify-center shadow-xl mb-4">
                  <img src="/ccc-logo.svg" alt="CCC" className="w-14 h-14" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">¡Bienvenido!</h2>
                <p className="text-sm text-slate-500 mb-6 max-w-xs">
                  Soy tu Analista de Inteligencia Económica. Te ayudo a registrar empresas, necesidades y ofertas.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.prompt)}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-[#233B85]/30 hover:text-[#233B85] transition-all shadow-sm active:scale-95"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}>
                {m.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#233B85] to-[#6BBACB] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                    <img src="/ccc-logo.svg" alt="" className="w-5 h-5" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-[#233B85] to-[#195A9D] text-white rounded-2xl rounded-br-md shadow-md'
                    : 'bg-white text-slate-800 rounded-2xl rounded-bl-md shadow-sm border border-slate-100'
                }`}>
                  <MessageContent content={m.content} />
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.content === '' && (
              <div className="flex gap-2.5 animate-slideUp">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#233B85] to-[#6BBACB] flex items-center justify-center flex-shrink-0 shadow-md">
                  <img src="/ccc-logo.svg" alt="" className="w-5 h-5" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-slate-100">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 bg-white/80 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-3 py-3">
            {/* Recording UI overlay */}
            {isRecording ? (
              <div className="flex items-center gap-3 py-2">
                {/* Cancel button */}
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 active:scale-95 transition-all"
                  title="Cancelar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                
                {/* Recording indicator */}
                <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-50 rounded-2xl border border-red-200">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-red-600">
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs text-red-400 ml-auto">
                    {isLocked ? 'Toca enviar →' : 'Suelta para enviar'}
                  </span>
                </div>
                
                {/* Send / stop button (for locked mode) */}
                {isLocked ? (
                  <button
                    type="button"
                    onClick={finishRecording}
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-[#233B85] to-[#195A9D] text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
                    title="Enviar audio"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3 21l18-9L3 3l3 9m0 0h12" /></svg>
                  </button>
                ) : (
                  <div
                    onMouseUp={handleMicrophoneRelease}
                    onTouchEnd={handleMicrophoneRelease}
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-red-500 text-white shadow-lg animate-pulse select-none"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-20 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#233B85]/30 focus:border-[#233B85]/50 transition-all max-h-32"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje..."
                    rows={1}
                    style={{ minHeight: '44px' }}
                    disabled={isProcessingImage}
                  />
                  <div className="absolute right-2 bottom-2 flex gap-1">
                    {/* Camera button */}
                    <button
                      type="button"
                      onClick={openCamera}
                      disabled={isProcessingImage}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                        isProcessingImage
                          ? 'text-blue-600 bg-blue-100'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      } disabled:opacity-50`}
                      title="Escanear tarjeta de presentación"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    
                    {/* Microphone button */}
                    <button
                      type="button"
                      onMouseDown={handleMicrophonePress}
                      onMouseUp={handleMicrophoneRelease}
                      onMouseLeave={handleMicrophoneRelease}
                      onTouchStart={(e) => { e.preventDefault(); handleMicrophonePress(); }}
                      onTouchEnd={(e) => { e.preventDefault(); handleMicrophoneRelease(); }}
                      disabled={isProcessingImage}
                      className="w-8 h-8 flex items-center justify-center rounded-full transition-colors select-none text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      title="Toca o mantén presionado para grabar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || isProcessingImage}
                  className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-[#233B85] to-[#195A9D] text-white shadow-lg disabled:opacity-40 disabled:shadow-none hover:shadow-xl active:scale-95 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3 21l18-9L3 3l3 9m0 0h12" /></svg>
                </button>
              </div>
            )}
          </form>
          <div className="flex items-center justify-center gap-3 pb-3 px-4">
            <img src="/lidarit-logo.png" alt="LiDARit" className="h-4 object-contain opacity-40" />
            <span className="text-slate-200 text-xs">|</span>
            <button
              onClick={() => { setShowFeedback(true); setFeedbackSent(false); }}
              className="flex items-center gap-1 group"
            >
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className="text-sm text-slate-300 group-hover:text-yellow-400 transition-colors">★</span>
              ))}
              <span className="text-[10px] text-slate-400 ml-1 group-hover:text-slate-600 transition-colors">Opinar</span>
            </button>
          </div>

          {/* Feedback Modal */}
          {showFeedback && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowFeedback(false)}>
              <div
                className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slideUp"
                onClick={e => e.stopPropagation()}
              >
                {feedbackSent ? (
                  <div className="text-center py-6">
                    <div className="text-5xl mb-3">🙏</div>
                    <p className="text-lg font-semibold text-slate-800">¡Gracias por tu opinión!</p>
                    <p className="text-sm text-slate-500 mt-1">Nos ayuda a mejorar</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-slate-800">¿Cómo calificas tu experiencia?</h3>
                      <p className="text-sm text-slate-500 mt-1">Tu opinión nos ayuda a mejorar</p>
                    </div>

                    {/* Stars */}
                    <div className="flex justify-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map(i => (
                        <button
                          key={i}
                          onClick={() => setFeedbackRating(i)}
                          onMouseEnter={() => setFeedbackHover(i)}
                          onMouseLeave={() => setFeedbackHover(0)}
                          className="text-4xl transition-transform hover:scale-110 active:scale-95"
                        >
                          <span className={
                            i <= (feedbackHover || feedbackRating)
                              ? 'text-yellow-400'
                              : 'text-slate-200'
                          }>★</span>
                        </button>
                      ))}
                    </div>

                    {feedbackRating > 0 && (
                      <p className="text-center text-sm font-medium text-slate-600 mb-4">
                        {['', 'Muy malo 😞', 'Malo 😕', 'Regular 😐', 'Bueno 😊', 'Excelente 🤩'][feedbackRating]}
                      </p>
                    )}

                    {/* Comment */}
                    <textarea
                      value={feedbackComment}
                      onChange={e => setFeedbackComment(e.target.value)}
                      placeholder="Cuéntanos más... (opcional)"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#233B85]/30 resize-none"
                      rows={3}
                    />

                    {/* Actions */}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => setShowFeedback(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={submitFeedback}
                        disabled={!feedbackRating || feedbackSending}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-[#233B85] to-[#195A9D] text-white text-sm font-medium disabled:opacity-40 hover:shadow-lg active:scale-95 transition-all"
                      >
                        {feedbackSending ? 'Enviando...' : 'Enviar'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        let html = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        if (html.trim().startsWith('- ') || html.trim().startsWith('* ')) {
          html = '<span class="inline-flex gap-1.5"><span class="text-[#6BBACB]">•</span><span>' + html.trim().slice(2) + '</span></span>';
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}
