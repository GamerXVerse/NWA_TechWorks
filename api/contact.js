// Vercel only. Netlify uses the HTML form's native Forms integration.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const reply = (status, message) => {
    if (req.headers.accept?.includes('application/json')) return res.status(status).json({ok: status === 200, message});
    if (status === 200) return res.redirect(303, '/thanks.html');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(status).send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Contact TechPosure</title><body><h1>Your inquiry was not sent</h1><p>${message}</p><p>Use your browser’s Back button to return to the form.</p></body></html>`);
  };
  if (req.method !== 'POST') {res.setHeader('Allow', 'POST'); return reply(405, 'Please submit the contact form.');}
  // Do not allow other websites to drive browser submissions to this endpoint.
  if (req.headers.origin) {
    try {if (new URL(req.headers.origin).host !== req.headers.host) return reply(403, 'Please submit from the TechPosure website.');}
    catch {return reply(403, 'Invalid origin.');}
  }
  if (!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) return reply(415, 'Unsupported submission format.');
  if (Number(req.headers['content-length'] || 0) > 24000) return reply(413, 'Your message is too long.');
  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : req.body;
  if (!body || typeof body !== 'object' || Buffer.byteLength(JSON.stringify(body)) > 24000) return reply(400, 'Invalid submission.');
  if (body['bot-field']) return reply(400, 'Unable to accept this submission.');
  const read = key => typeof body[key] === 'string' ? body[key].trim() : '';
  const name=read('name'), email=read('email'), organization=read('organization'), message=read('message'), contact=read('contact');
  if (!name || name.length>100 || !organization || organization.length>160 || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length<20 || message.length>5000 || !['team','aarush','prasen','toby'].includes(contact)) return reply(400, 'Please check the required fields and message length.');
  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL || !process.env.CONTACT_TO_EMAIL) return reply(503, 'The contact service is temporarily unavailable. Please try again later.');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method:'POST', headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({from:process.env.CONTACT_FROM_EMAIL,to:[process.env.CONTACT_TO_EMAIL],reply_to:email,subject:'TechPosure project inquiry',text:`Requested contact: ${contact}\nName: ${name}\nOrganization: ${organization}\nEmail: ${email}\n\n${message}`}),
      signal:AbortSignal.timeout(10000),
    });
    if (!response.ok) return reply(502, 'We couldn’t deliver your message. Please try again later.');
    return reply(200, 'Your inquiry has been received.');
  } catch {return reply(502, 'We couldn’t confirm delivery. Please try again later.');}
};
