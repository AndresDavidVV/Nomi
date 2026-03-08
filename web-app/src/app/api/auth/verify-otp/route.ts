import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/db';
import { createSessionToken, setSessionCookie, normalizePhone } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, code, name } = await req.json();

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: 'Teléfono y código requeridos' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phoneNumber);

    // Verificar OTP
    const otpRecord = await queryOne(
      `SELECT * FROM "OTPCode" 
       WHERE "phone" = $1 AND "code" = $2 AND "expiresAt" > NOW()
       ORDER BY "createdAt" DESC LIMIT 1`,
      [normalizedPhone, code]
    );

    // If no OTP found, check if user already exists (second call with name after first verify)
    if (!otpRecord) {
      // Check if user already exists from a previous successful verify
      const existingUser = await queryOne(
        `SELECT * FROM "User" WHERE "phone" = $1`,
        [normalizedPhone]
      );
      
      if (existingUser && name) {
        // Update name on existing user (second step of registration)
        await query(
          `UPDATE "User" SET "name" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
          [name, existingUser.id]
        );
        existingUser.name = name;
        
        const token = createSessionToken({
          id: existingUser.id,
          phone: existingUser.phone,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        });
        
        await setSessionCookie(token);
        
        return NextResponse.json({
          success: true,
          user: { id: existingUser.id, phone: existingUser.phone, name: existingUser.name, email: existingUser.email },
          requiresName: false,
          token,
          isNewUser: false,
        });
      }
      
      return NextResponse.json(
        { error: 'Código OTP inválido o expirado' },
        { status: 400 }
      );
    }

    // Eliminar OTPs usados para este teléfono
    await query(`DELETE FROM "OTPCode" WHERE "phone" = $1`, [normalizedPhone]);

    // Buscar o crear usuario
    let user = await queryOne(
      `SELECT * FROM "User" WHERE "phone" = $1`,
      [normalizedPhone]
    );

    let isNewUser = false;

    if (!user) {
      // Crear nuevo usuario
      const result = await queryOne(
        `INSERT INTO "User" ("id", "phone", "name", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
         RETURNING *`,
        [normalizedPhone, name || null]
      );
      user = result;
      isNewUser = true;
    } else if (name && !user.name) {
      // Actualizar nombre si se proporcionó y no existe
      await query(
        `UPDATE "User" SET "name" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
        [name, user.id]
      );
      user.name = name;
    }

    // Crear sesión JWT
    const token = createSessionToken({
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Establecer cookie
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
      },
      requiresName: !user.name,
      token,
      isNewUser,
    });
  } catch (error: any) {
    console.error('Error en verify-otp:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', message: error.message },
      { status: 500 }
    );
  }
}
