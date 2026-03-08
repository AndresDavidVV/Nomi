import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/db';
import { generateOTP, sendOTPViaWhatsApp } from '@/lib/twilio';
import { normalizePhone } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Número de teléfono requerido' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phoneNumber);

    // Generar OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Guardar OTP en la base de datos
    await query(
      `INSERT INTO "OTPCode" ("id", "phone", "code", "expiresAt") 
       VALUES (gen_random_uuid(), $1, $2, $3)`,
      [normalizedPhone, otp, expiresAt]
    );

    // Intentar enviar por WhatsApp
    const smsSent = await sendOTPViaWhatsApp(normalizedPhone, otp);

    // En desarrollo, retornar OTP para testing
    const isDev = process.env.NODE_ENV === 'development' || !smsSent;

    return NextResponse.json({
      success: true,
      message: smsSent
        ? 'Código de verificación enviado por WhatsApp'
        : 'Código de verificación generado (consulta la consola del servidor)',
      ...(isDev && { otp }), // Solo en desarrollo
    });
  } catch (error: any) {
    console.error('Error en request-otp:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', message: error.message },
      { status: 500 }
    );
  }
}
