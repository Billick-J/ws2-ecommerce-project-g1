// utils/turnstileVerify.js
// Verifies Cloudflare Turnstile tokens server-side.
// Works with Node 18+ (global fetch) or older Node with node-fetch installed.

let fetchImpl;
if (typeof fetch === 'function') {
  fetchImpl = fetch;
} else {
  try {
    fetchImpl = require('node-fetch');
  } catch (e) {
    throw new Error('No fetch implementation found. Use Node 18+ or install node-fetch: npm install node-fetch@2');
  }
}

const { URLSearchParams } = require('url');

async function verifyTurnstile(token, remoteip) {
  if (!process.env.TURNSTILE_SECRET) {
    throw new Error('TURNSTILE_SECRET is not set in environment variables.');
  }

  const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const params = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET,
    response: token || '',
    remoteip: remoteip || ''
  });

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  // returns object like { success: true/false, ... }
  const json = await res.json();
  return json;
}

module.exports = verifyTurnstile;
