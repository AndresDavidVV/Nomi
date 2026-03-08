'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'phone' | 'otp' | 'name';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState(''); // Para mostrar OTP en desarrollo

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar código');
      }

      if (data.otp) {
        setDevOtp(data.otp); // Mostrar OTP en desarrollo
      }

      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, code: otp, name: name || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al verificar código');
      }

      if (data.requiresName && !name) {
        setStep('name');
      } else {
        // Redirigir al chat
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    // Reenviar verificación con nombre
    await handleVerifyOTP(e);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#233B85] to-[#6BBACB] flex items-center justify-center shadow-xl mb-4">
            <img src="/ccc-logo.svg" alt="CCC" className="w-14 h-14" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Inteligencia Económica</h1>
          <p className="text-sm text-slate-500">Cámara de Comercio de Cali</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {step === 'phone' && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Número de WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#233B85]/30 focus:border-[#233B85]"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  Ingresa tu número con código de país (ej: +57 para Colombia)
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-br from-[#233B85] to-[#195A9D] text-white py-3 rounded-xl font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Enviando...' : 'Enviar código por WhatsApp'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Código de verificación
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#233B85]/30 focus:border-[#233B85]"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  Ingresa el código de 6 dígitos que recibiste por WhatsApp
                </p>
                {devOtp && (
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg text-xs">
                    <strong>Modo desarrollo:</strong> Tu código es <strong>{devOtp}</strong>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-br from-[#233B85] to-[#195A9D] text-white py-3 rounded-xl font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Verificando...' : 'Verificar código'}
              </button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-sm text-slate-600 hover:text-slate-800"
                disabled={loading}
              >
                ← Cambiar número
              </button>
            </form>
          )}

          {step === 'name' && (
            <form onSubmit={handleSubmitName} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ¿Cómo te llamas?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#233B85]/30 focus:border-[#233B85]"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  Para personalizar tu experiencia
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-br from-[#233B85] to-[#195A9D] text-white py-3 rounded-xl font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Guardando...' : 'Continuar'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-3 opacity-50">
          <img src="/lidarit-logo.png" alt="LiDARit" className="h-4 object-contain" />
          <span className="text-xs text-slate-400">×</span>
          <img src="/ccc-logo.svg" alt="CCC" className="h-4 object-contain" />
        </div>
      </div>
    </div>
  );
}
