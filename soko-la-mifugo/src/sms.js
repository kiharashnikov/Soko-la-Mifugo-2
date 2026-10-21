'use strict';
// SMS sender. SMS_PROVIDER=console (default, prints to the server log) or africastalking.
const provider = (process.env.SMS_PROVIDER || 'console').toLowerCase();

async function sendSms(to, message) {
  if (provider === 'africastalking') {
    const username = process.env.AT_USERNAME;
    const apiKey = process.env.AT_API_KEY;
    if (!username || !apiKey) throw new Error('AT_USERNAME and AT_API_KEY are required for africastalking');
    const host = username === 'sandbox' ? 'api.sandbox.africastalking.com' : 'api.africastalking.com';
    const body = new URLSearchParams({ username, to, message });
    if (process.env.AT_SENDER_ID) body.set('from', process.env.AT_SENDER_ID);
    const res = await fetch(`https://${host}/version1/messaging`, {
      method: 'POST',
      headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!res.ok) throw new Error(`SMS provider returned ${res.status}`);
    return;
  }
  console.log(`[sms:console] to=${to} message="${message}"`);
}

module.exports = { sendSms, provider };
