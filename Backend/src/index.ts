import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { nanoid } from 'nanoid';
import { bearerAuth } from 'hono/bearer-auth';

type Bindings = {
  DB: D1Database;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  RESEND_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
  })
);

app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json();
  
  let validPassword = c.env.ADMIN_PASSWORD;
  try {
    const row: any = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('admin_password').first();
    if (row && row.value) validPassword = row.value;
  } catch (e) {} // table might not exist yet

  if (email === c.env.ADMIN_EMAIL && password === validPassword) {
    return c.json({ token: 'static-admin-token' });
  }
  return c.json({ message: 'Unauthorized' }, 401);
});

app.post('/api/settings/password', async (c) => {
  const { oldPassword, newPassword } = await c.req.json();
  
  let validPassword = c.env.ADMIN_PASSWORD;
  try {
    const row: any = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('admin_password').first();
    if (row && row.value) validPassword = row.value;
  } catch (e) {
    await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)').run();
  }

  if (oldPassword !== validPassword) {
    return c.json({ message: 'Incorrect old password' }, 400);
  }
  
  await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)').run();
  await c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('admin_password', newPassword).run();
  
  return c.json({ ok: true });
});

app.post('/api/forgot-password', async (c) => {
  const { email, resetUrlBase } = await c.req.json();
  
  if (email !== c.env.ADMIN_EMAIL) {
    // Return ok anyway to prevent email enumeration
    return c.json({ ok: true });
  }

  const token = nanoid(32);
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS password_resets (token TEXT PRIMARY KEY, expires_at INTEGER)').run();
  await c.env.DB.prepare('INSERT INTO password_resets (token, expires_at) VALUES (?, ?)').bind(token, expiresAt).run();

  const resetLink = `${resetUrlBase}?reset_token=${token}`;

  if (c.env.RESEND_API_KEY) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Bansuri Catering <onboarding@resend.dev>',
          to: [c.env.ADMIN_EMAIL],
          subject: 'Reset Your Admin Password - Bansuri Catering',
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; background-color: #ffffff; border: 1px solid #f0e6ed; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #d62976; margin: 0; font-size: 24px;">Bansuri Catering</h2>
                <p style="color: #666; font-size: 13px; margin-top: 4px;">Admin Portal</p>
              </div>
              <h3 style="color: #1e1f2b; margin-top: 0; font-size: 18px;">Password Reset Request</h3>
              <p style="color: #4a4c58; font-size: 14px; line-height: 1.6;">We received a request to reset the password for your admin account (<strong>${c.env.ADMIN_EMAIL}</strong>).</p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetLink}" style="background-color: #d62976; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #777; font-size: 13px; line-height: 1.5;">If the button above does not work, copy and paste this link into your browser:</p>
              <p style="background: #fdf7fb; padding: 10px 14px; border-radius: 6px; font-size: 12px; word-break: break-all; color: #d62976; border: 1px dashed #f0cbd9;">${resetLink}</p>
              <hr style="border: none; border-top: 1px solid #f0e6ed; margin: 24px 0 16px;" />
              <p style="color: #9aa0a6; font-size: 12px; margin: 0; text-align: center;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
          `
        })
      });
      const resData = await emailRes.json();
      console.log('Resend email response:', resData);
    } catch (err) {
      console.error('Failed to send reset email via Resend:', err);
    }
  } else {
    console.log('RESEND_API_KEY not set. Reset link:', resetLink);
  }

  return c.json({ ok: true });
});

app.post('/api/reset-password', async (c) => {
  const { token, newPassword } = await c.req.json();
  
  try {
    const row: any = await c.env.DB.prepare('SELECT expires_at FROM password_resets WHERE token = ?').bind(token).first();
    if (!row) return c.json({ message: 'Invalid or expired token' }, 400);
    
    const now = Math.floor(Date.now() / 1000);
    if (now > row.expires_at) {
      await c.env.DB.prepare('DELETE FROM password_resets WHERE token = ?').bind(token).run();
      return c.json({ message: 'Token expired' }, 400);
    }

    // Update password
    await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)').run();
    await c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind('admin_password', newPassword).run();
    
    // Delete used token
    await c.env.DB.prepare('DELETE FROM password_resets WHERE token = ?').bind(token).run();

    return c.json({ ok: true });
  } catch (e) {
    return c.json({ message: 'Error processing request' }, 500);
  }
});

// Public lead submission
app.post('/api/leads', async (c) => {
  const body = await c.req.json();
  const id = nanoid();
  await c.env.DB.prepare(
    'INSERT INTO leads (id, name, phone, eventType, eventDate, guests, package, selectedMenu, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
  ).bind(
    id,
    body.name || '',
    body.phone || '',
    body.eventType || '',
    body.eventDate || '',
    body.guests || 0,
    body.package || '',
    body.selectedMenu || '',
    'new'
  ).run();
  return c.json({ id });
});

// Protect everything else
app.use('/api/*', async (c, next) => {
  // allow the public POST we already handled
  if (c.req.method === 'POST' && c.req.path === '/api/leads') return next();
  return bearerAuth({ token: 'static-admin-token' })(c, next);
});

app.get('/api/leads', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  return c.json(results || []);
});

app.patch('/api/leads/:id/status', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();
  await c.env.DB.prepare('UPDATE leads SET status = ? WHERE id = ?').bind(status, id).run();
  return c.json({ ok: true });
});

app.delete('/api/leads/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

app.get('/api/leads/:id/quote', async (c) => {
  const id = c.req.param('id');
  const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  // No remote PDF generation yet; frontend will generate locally.
  return c.json({ lead, pdfUrl: '' });
});

app.get('/api/packages', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM packages ORDER BY created_at DESC').all();
  return c.json(results || []);
});

app.post('/api/packages', async (c) => {
  const payload = await c.req.json();
  const id = nanoid();
  await c.env.DB.prepare('INSERT INTO packages (id, name, tier, price, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
    .bind(id, payload.name, payload.tier, payload.price || 0).run();
  return c.json({ id });
});

app.put('/api/packages/:id', async (c) => {
  const id = c.req.param('id');
  const payload = await c.req.json();
  await c.env.DB.prepare('UPDATE packages SET name = ?, tier = ?, price = ? WHERE id = ?')
    .bind(payload.name, payload.tier, payload.price || 0, id).run();
  return c.json({ ok: true });
});

app.delete('/api/packages/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM packages WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

app.get('/api/menu', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT c.id, c.name, GROUP_CONCAT(i.name, ", ") AS items FROM categories c LEFT JOIN items i ON i.category_id = c.id GROUP BY c.id').all();
  return c.json((results || []).map((row: any) => ({ id: row.id, name: row.name, items: (row.items || '').split(', ').filter(Boolean) })));
});

app.post('/api/menu/categories', async (c) => {
  const payload = await c.req.json();
  const id = nanoid();
  await c.env.DB.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').bind(id, payload.name).run();
  return c.json({ id });
});

app.post('/api/menu/items', async (c) => {
  const payload = await c.req.json();
  const id = nanoid();
  await c.env.DB.prepare('INSERT INTO items (id, category_id, name) VALUES (?, ?, ?)').bind(id, payload.categoryId, payload.name).run();
  return c.json({ id });
});

app.put('/api/menu/categories/:id', async (c) => {
  const id = c.req.param('id');
  const payload = await c.req.json();
  await c.env.DB.prepare('UPDATE categories SET name = ? WHERE id = ?').bind(payload.name, id).run();
  return c.json({ ok: true });
});

app.put('/api/menu/items/:id', async (c) => {
  const id = c.req.param('id');
  const payload = await c.req.json();
  await c.env.DB.prepare('UPDATE items SET name = ?, category_id = ? WHERE id = ?').bind(payload.name, payload.categoryId, id).run();
  return c.json({ ok: true });
});

app.delete('/api/menu/categories/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

app.delete('/api/menu/items/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

app.post('/api/quotes/upload', async (c) => {
  const key = nanoid();
  const array = await c.req.arrayBuffer();
  await c.env.DB.prepare('INSERT INTO quotes (id, pdf) VALUES (?, ?)').bind(key, new Uint8Array(array)).run();
  const url = `${new URL(c.req.url).origin}/api/quotes/${key}`;
  return c.json({ url, key });
});

app.get('/api/quotes/:key', async (c) => {
  const key = c.req.param('key');
  const row: any = await c.env.DB.prepare('SELECT pdf FROM quotes WHERE id = ?').bind(key).first();
  if (!row?.pdf) return c.json({ message: 'Not found' }, 404);
  const bytes = row.pdf instanceof ArrayBuffer ? row.pdf : new Uint8Array(row.pdf);
  const headers = new Headers();
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `inline; filename="${key}.pdf"`);
  return new Response(bytes, { headers });
});

export default app;
