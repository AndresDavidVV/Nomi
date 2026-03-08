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

    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Archivo de audio requerido' },
        { status: 400 }
      );
    }

    // Convert audio blob to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // Call Gemini API for transcription
    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: 'Transcribe el siguiente audio a texto en español de forma literal y exacta. Devuelve ÚNICAMENTE el texto transcrito, sin comillas, sin explicaciones, sin prefijos como "El audio dice:" ni comentarios adicionales. Si no se entiende el audio, devuelve una cadena vacía.'
            },
            {
              inlineData: {
                mimeType: 'audio/webm',
                data: base64Audio
              }
            }
          ]
        }]
      }),
    });

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini transcription error:', JSON.stringify(data));
      return NextResponse.json(
        { error: 'Error al transcribir audio' },
        { status: 500 }
      );
    }

    const transcript = data.candidates[0].content.parts[0].text;

    return NextResponse.json({ transcript });
  } catch (error: any) {
    console.error('Transcription API error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', message: error.message },
      { status: 500 }
    );
  }
}
