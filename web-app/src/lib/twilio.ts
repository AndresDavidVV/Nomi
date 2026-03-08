import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+14066597179';

export async function sendOTPViaWhatsApp(phoneNumber: string, otp: string): Promise<boolean> {
  try {
    // Si no hay configuración de Twilio, usar modo desarrollo
    if (!accountSid || !authToken) {
      console.log(`[MODO DESARROLLO] OTP para ${phoneNumber}: ${otp}`);
      return false;
    }

    const client = twilio(accountSid, authToken);

    // Formatear número de destino para WhatsApp
    let cleanToNumber = phoneNumber.trim();
    
    // Si ya tiene el prefijo whatsapp:, removerlo
    if (cleanToNumber.toLowerCase().startsWith('whatsapp:')) {
      cleanToNumber = cleanToNumber.substring(9);
    }
    
    // Asegurar que tenga el prefijo +
    if (!cleanToNumber.startsWith('+')) {
      cleanToNumber = `+${cleanToNumber}`;
    }
    
    const whatsappToNumber = `whatsapp:${cleanToNumber}`;
    
    // Formatear número de origen
    let cleanFromNumber = twilioPhoneNumber.trim();
    if (cleanFromNumber.toLowerCase().startsWith('whatsapp:')) {
      cleanFromNumber = cleanFromNumber.substring(9);
    }
    if (!cleanFromNumber.startsWith('+')) {
      cleanFromNumber = `+${cleanFromNumber}`;
    }
    const whatsappFromNumber = `whatsapp:${cleanFromNumber}`;

    console.log(`[TWILIO] Enviando WhatsApp desde ${whatsappFromNumber} a ${whatsappToNumber}`);

    // Usar WhatsApp Template (requerido para mensajes fuera de ventana de 24h)
    const templateSid = process.env.TWILIO_VERIFICATION_TEMPLATE_SID || 'HX382f1d78eade3dc8a9e1bfe2bdf9e409';
    const contentVariables = JSON.stringify({ 1: otp });
    
    console.log(`[TWILIO] Usando template SID: ${templateSid}`);

    const message = await client.messages.create({
      contentSid: templateSid,
      contentVariables: contentVariables,
      from: whatsappFromNumber,
      to: whatsappToNumber,
    });

    console.log(`[TWILIO] WhatsApp enviado - Status: ${message.status}, SID: ${message.sid}`);

    if (message.errorCode) {
      console.warn(`[TWILIO] Error: ${message.errorCode} - ${message.errorMessage}`);
      return false;
    }

    return ['queued', 'sent', 'accepted', 'sending'].includes(message.status);
  } catch (error: any) {
    console.error('[TWILIO] Error enviando WhatsApp:', error.message);
    
    // En modo desarrollo sin configuración, imprimir OTP
    if (!accountSid) {
      console.log(`[MODO DESARROLLO] OTP para ${phoneNumber}: ${otp}`);
    }
    
    return false;
  }
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
