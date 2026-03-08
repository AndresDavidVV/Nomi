// Seed conversations via API
const ANDRES_PHONE = '573176677225';
const BASE_URL = 'http://ccc-alb-1053944315.us-east-1.elb.amazonaws.com';

async function seedConversations() {
  try {
    // Step 1: Request OTP
    console.log('Requesting OTP...');
    const otpRes = await fetch(`${BASE_URL}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: ANDRES_PHONE }),
    });
    
    if (!otpRes.ok) {
      throw new Error(`OTP request failed: ${otpRes.status}`);
    }

    console.log('OTP requested. Check logs for code...');
    console.log('Please provide OTP code to continue:');
    
    // For now, we'll just output instructions
    console.log('\nTo complete seeding:');
    console.log('1. Check ECS logs for OTP code');
    console.log('2. Verify OTP and get session cookie');
    console.log('3. Use cookie to create conversations via API');
    
    console.log('\nExample curl commands:');
    console.log(`
# Verify OTP (replace CODE with actual OTP)
curl -c cookies.txt '${BASE_URL}/api/auth/verify-otp' \\
  -H 'Content-Type: application/json' \\
  -d '{"phone":"${ANDRES_PHONE}","otp":"CODE"}'

# Create conversation 1
curl -b cookies.txt -X POST '${BASE_URL}/api/conversations'

# Get conversation ID from response, then add messages
CONV_ID="..."
curl -b cookies.txt -X POST "${BASE_URL}/api/conversations/$CONV_ID/messages" \\
  -H 'Content-Type: application/json' \\
  -d '{"role":"user","content":"Acabo de salir de reunión con TechValle SAS..."}'

curl -b cookies.txt -X POST "${BASE_URL}/api/conversations/$CONV_ID/messages" \\
  -H 'Content-Type: application/json' \\
  -d '{"role":"assistant","content":"He registrado la empresa TechValle SAS..."}'

# Update conversation title
curl -b cookies.txt -X PATCH "${BASE_URL}/api/conversations/$CONV_ID" \\
  -H 'Content-Type: application/json' \\
  -d '{"title":"Registro TechValle SAS"}'
    `);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

seedConversations();
