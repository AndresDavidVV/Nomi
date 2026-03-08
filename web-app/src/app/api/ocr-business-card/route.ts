import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { image } = await req.json();

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Imagen requerida (base64)' },
        { status: 400 }
      );
    }

    // Call Gemini Vision API for OCR
    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `Analiza esta tarjeta de presentación y extrae la siguiente información en formato estructurado:

- Nombre de la empresa
- Nombre del contacto
- Cargo/Rol
- Teléfono
- Email
- Dirección (si está visible)

Formatea la respuesta como texto simple y claro, por ejemplo:
Empresa: [nombre]
Contacto: [nombre]
Cargo: [cargo]
Teléfono: [teléfono]
Email: [email]
Dirección: [dirección]

Si algún campo no está visible en la tarjeta, omítelo.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: image
              }
            }
          ]
        }]
      }),
    });

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini OCR error:', JSON.stringify(data));
      return NextResponse.json(
        { error: 'Error al procesar imagen' },
        { status: 500 }
      );
    }

    const extractedText = data.candidates[0].content.parts[0].text;

    return NextResponse.json({ extractedText });
  } catch (error: any) {
    console.error('OCR API error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', message: error.message },
      { status: 500 }
    );
  }
}
