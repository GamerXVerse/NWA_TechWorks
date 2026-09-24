const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/contact.js');

const originalFetch = global.fetch;
const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.CONTACT_FROM_EMAIL;
const message = {
  name: 'Example Visitor',
  email: 'visitor@example.org',
  organization: 'Example Nonprofit',
  message: 'We need help improving our nonprofit website.',
  contact: 'team',
  'bot-field': '',
};

function request(body = message) {
  return {
    method: 'POST',
    headers: {
      host: 'techposure.vercel.app',
      origin: 'https://techposure.vercel.app',
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  };
}

async function call(req) {
  const result = { status: 200 };
  const res = {
    setHeader() {},
    status(code) { result.status = code; return this; },
    json(body) { result.body = body; return this; },
    send(body) { result.body = body; return this; },
    redirect(code, url) { result.status = code; result.url = url; return this; },
  };
  await handler(req, res);
  return result;
}

test.after(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalKey;
  if (originalFrom === undefined) delete process.env.CONTACT_FROM_EMAIL;
  else process.env.CONTACT_FROM_EMAIL = originalFrom;
});

test('validates requests and never reports success without a mail service', async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_FROM_EMAIL;
  assert.equal((await call(request())).status, 503);
  assert.equal((await call({...request(), method: 'GET'})).status, 405);
  assert.equal((await call({...request(), headers: {...request().headers, origin: 'https://attacker.example'}})).status, 403);
  assert.equal((await call(request({...message, email: 'invalid'}))).status, 400);
  assert.equal((await call(request({...message, contact: 'outsider'}))).status, 400);
  assert.equal((await call(request({...message, 'bot-field': 'spam'}))).status, 400);
});

test('routes each person and the team to the intended inboxes', async () => {
  process.env.RESEND_API_KEY = 'mock-key';
  process.env.CONTACT_FROM_EMAIL = 'TechPosure <hello@example.org>';
  const payloads = [];
  global.fetch = async (_url, options) => {
    payloads.push(JSON.parse(options.body));
    return {ok: true};
  };
  for (const person of ['aarush', 'prasen', 'toby', 'team']) {
    assert.equal((await call(request({...message, contact: person}))).body.ok, true);
  }
  assert.deepEqual(payloads.map(p => p.to), [
    ['aarush.divakarla@gmail.com'],
    ['prasen.pani@gmail.com'],
    ['tobyf@bentonvillek12.org'],
    ['aarush.divakarla@gmail.com', 'prasen.pani@gmail.com', 'tobyf@bentonvillek12.org'],
  ]);
  assert.ok(payloads.every(p => p.reply_to === message.email));
});

test('reports a mail provider rejection as an error', async () => {
  process.env.RESEND_API_KEY = 'mock-key';
  process.env.CONTACT_FROM_EMAIL = 'TechPosure <hello@example.org>';
  global.fetch = async () => ({ok: false});
  assert.equal((await call(request())).status, 502);
});
