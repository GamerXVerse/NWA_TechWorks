const RECIPIENTS = Object.freeze({
  aarush: 'aarush.divakarla@gmail.com',
  prasen: 'prasen.pani@gmail.com',
  toby: 'tobyf@bentonvillek12.org',
});

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const reply = (status, message) => {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(status).json({ ok: status === 200, message });
    }
    if (status === 200) return res.redirect(303, '/thanks.html');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(status).send(message);
  };

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(405, 'Please submit the contact form.');
  }
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return reply(403, 'Please submit from the TechPosure website.');
    } catch {
      return reply(403, 'Invalid origin.');
    }
  }
  if (!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) {
    return reply(415, 'Unsupported submission format.');
  }
  if (Number(req.headers['content-length'] || 0) > 24000) return reply(413, 'Your message is too long.');

  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : req.body;
  if (!body || typeof body !== 'object' || Buffer.byteLength(JSON.stringify(body)) > 24000) {
    return reply(400, 'Invalid submission.');
  }
  if (body['bot-field']) return reply(400, 'Unable to accept this submission.');
  const read = key => typeof body[key] === 'string' ? body[key].trim() : '';
  const name = read('name');
  const email = read('email');
  const organization = read('organization');
  const message = read('message');
  const contact = read('contact');
  if (
    !name || name.length > 100 || !organization || organization.length > 160 ||
    email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    message.length < 20 || message.length > 5000 ||
    !['team', ...Object.keys(RECIPIENTS)].includes(contact)
  ) return reply(400, 'Please check the required fields and message length.');

  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL) {
    return reply(503, 'The contact form is temporarily unavailable. Please use a direct email link below.');
  }
  const to = contact === 'team' ? Object.values(RECIPIENTS) : [RECIPIENTS[contact]];
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL,
        to,
        reply_to: email,
        subject: `TechPosure inquiry for ${contact === 'team' ? 'the team' : contact}`,
        text: `Name: ${name}\nOrganization: ${organization}\nEmail: ${email}\n\n${message}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return reply(502, 'Your message could not be delivered. Please try a direct email link below.');
    return reply(200, 'Your inquiry has been sent.');
  } catch {
    return reply(502, 'Your message could not be delivered. Please try a direct email link below.');
  }
};
