import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { nanoid } from 'nanoid';
import { bearerAuth } from 'hono/bearer-auth';

type Bindings = {
  DB: D1Database;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use('*', cors());

app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json();
  if (email === c.env.ADMIN_EMAIL && password === c.env.ADMIN_PASSWORD) {
    // simple static token
    return c.json({ token: 'static-admin-token' });
  }
  return c.json({ message: 'Unauthorized' }, 401);
});

app.use('/api/*', bearerAuth({ token: 'static-admin-token' }));

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

app.get('/api/leads/:id/quote', async (c) => {
  const id = c.req.param('id');
  const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  const pdfUrl = `https://example.com/quotes/${id}.pdf`;
  return c.json({ lead, pdfUrl });
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

export default app;
