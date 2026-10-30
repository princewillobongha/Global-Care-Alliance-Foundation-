import { router, json, error, requireAuth, requireAdminEmailAllowlist, db } from '@appdeploy/sdk';

const ADMIN_EMAILS = ['princewillobongha@gmail.com'];
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function saveEnquiry(table: string, body: unknown) {
  if (!body || typeof body !== 'object') return error('Invalid enquiry', 400);
  const data = body as Record<string, unknown>;
  const name = clean(data.name, 100);
  const email = clean(data.email, 254).toLowerCase();
  const message = clean(data.message, 2000);
  const organization = clean(data.organization, 160);
  const interest = clean(data.interest, 100);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) return error('Please provide a valid name, email, and message.', 400);
  const createdAt = new Date().toISOString();
  const [id] = await db.add(table, [{ name, email, message, organization, interest, createdAt, status: 'new' }]);
  if (!id) return error('Could not save enquiry. Please try again.', 503);
  return json({ received: true, id, createdAt });
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ ok: true })],
  'POST /api/donor-interest': [async ({ body }) => saveEnquiry('donor_interest', body)],
  'POST /api/partnerships': [async ({ body }) => saveEnquiry('partnership_enquiries', body)],
  'GET /api/admin/overview': [
    requireAuth(),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async () => {
      const [donors, partners] = await Promise.all([
        db.list('donor_interest', { limit: 100 }),
        db.list('partnership_enquiries', { limit: 100 })
      ]);
      return json({ donors: donors.items, partners: partners.items });
    }
  ]
});
