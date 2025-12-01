import request from 'supertest';
import app from '../../app';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { cleanupTestData } from '../../test/helpers/db.helper';
import { authenticatedRequest, assertForbidden } from '../../test/helpers/request.helper';

describe('Tenant Invite Flow', () => {
  let companyId: string;
  let companySlug: string;
  let adminToken: string;
  let userToken: string;
  let otherCompany: any;

  beforeAll(async () => {
    const setup = await setupCompanyWithUsers({ employeeCount: 1 });
    companyId = setup.companyId;
    companySlug = setup.company.slug;
    adminToken = setup.admin.token;

    if (!setup.employees || setup.employees.length === 0) {
      throw new Error('Failed to seed employee user for invite tests');
    }

    userToken = setup.employees[0].token;

    otherCompany = await setupCompanyWithUsers({ employeeCount: 0 });
  });

  afterAll(async () => {
    await cleanupTestData(companyId);
    await cleanupTestData(otherCompany.companyId);
  });

  describe('Invite issuance', () => {
    it('allows tenant admins to create invites with 7-day expiration windows', async () => {
      const inviteEmail = 'invited.user@example.com';

      const response = await authenticatedRequest(app, adminToken)
        .post('/api/admin/invites')
        .send({
          email: inviteEmail,
          role: 'USER',
          note: 'Welcome aboard!',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('invite');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.invite).toMatchObject({
        email: inviteEmail.toLowerCase(),
        role: 'USER',
        status: 'PENDING',
      });

      const expiresAt = new Date(response.body.data.invite.expiresAt).getTime();
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const toleranceMs = 15 * 60 * 1000; // 15 minutes tolerance

      expect(expiresAt).toBeGreaterThanOrEqual(now + sevenDaysMs - toleranceMs);
      expect(expiresAt).toBeLessThanOrEqual(now + sevenDaysMs + toleranceMs);
    });

    it('rejects invite creation for non-admin users', async () => {
      const response = await authenticatedRequest(app, userToken)
        .post('/api/admin/invites')
        .send({
          email: 'not.allowed@example.com',
          role: 'USER',
        });

      assertForbidden(response);
    });

    it('returns invite listings for admins', async () => {
      const inviteEmail = `list.user+${Date.now()}@example.com`;

      await authenticatedRequest(app, adminToken)
        .post('/api/admin/invites')
        .send({
          email: inviteEmail,
          role: 'USER',
        });

      const listResponse = await authenticatedRequest(app, adminToken)
        .get('/api/admin/invites');

      expect(listResponse.status).toBe(200);
      expect(Array.isArray(listResponse.body.data)).toBe(true);
      expect(listResponse.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: inviteEmail.toLowerCase(),
            status: 'PENDING',
          }),
        ])
      );
    });
  });

  describe('Invite redemption', () => {
    it('redeems invite tokens and blocks legacy companyId registration', async () => {
      const inviteEmail = 'redeemed.user@example.com';

      const createResponse = await authenticatedRequest(app, adminToken)
        .post('/api/admin/invites')
        .send({
          email: inviteEmail,
          role: 'MANAGER',
        });

      expect(createResponse.status).toBe(201);
      const inviteToken = createResponse.body.data.token;
      expect(inviteToken).toBeTruthy();

      const redeemResponse = await request(app)
        .post('/api/auth/invites/redeem')
        .send({
          token: inviteToken,
          password: 'StrongPass123!',
          name: 'Invited Manager',
        });

      expect(redeemResponse.status).toBe(201);
      expect(redeemResponse.body.data.user.email).toBe(inviteEmail);
      expect(redeemResponse.body.data.user.role).toBe('MANAGER');
      expect(redeemResponse.body.data.user.companyId).toBe(companyId);

      const legacyRegistrationResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'legacy-flow@example.com',
          password: 'StrongPass123!',
          name: 'Legacy Flow',
          companyId,
          companyName: 'Legacy Co',
          companyDomain: `legacy-${Date.now()}.com`,
          companySlug: `legacy-${Date.now()}`,
        });

      expect(legacyRegistrationResponse.status).toBe(400);
      expect(
        legacyRegistrationResponse.body.error ||
        legacyRegistrationResponse.body.message
      ).toMatch(/invite/i);
    });

    it('redeems invite tokens via slugged route and blocks cross-tenant slugs', async () => {
      const inviteEmail = `slug.user+${Date.now()}@example.com`;

      const createResponse = await authenticatedRequest(app, adminToken)
        .post('/api/admin/invites')
        .send({
          email: inviteEmail,
          role: 'USER',
        })
        .expect(201);

      const inviteToken = createResponse.body.data.token;

      const redeemResponse = await request(app)
        .post(`/api/auth/invites/${companySlug}/redeem`)
        .send({
          token: inviteToken,
          password: 'SlugPass123!',
          name: 'Slug User',
        })
        .expect(201);

      expect(redeemResponse.body.data.user.email).toBe(inviteEmail);
      expect(redeemResponse.body.data.user.companyId).toBe(companyId);

      await request(app)
        .post(`/api/auth/invites/${otherCompany.company.slug}/redeem`)
        .send({
          token: inviteToken,
          password: 'SlugPass123!',
          name: 'Slug User',
        })
        .expect(404);
    });
  });
});
