import request from 'supertest';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import app from '../../app';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { cleanupTestData } from '../../test/helpers/db.helper';
import { authenticatedRequest } from '../../test/helpers/request.helper';

const UPLOAD_DIR = path.join(process.cwd(), 'storage', 'themes');
const FALLBACK_UPLOAD_DIR = path.join(os.tmpdir(), 'themes');

const DEFAULT_THEME = {
  primaryColor: '#0f172a',
  secondaryColor: '#22c55e',
  backgroundColor: '#f8fafc',
  coverPhotoUrl: null,
  coverPhotoMeta: null,
};

const createImageBuffer = (width: number, height: number, color = '#3366ff') =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();

const removeUploads = async () => {
  try {
    await fs.rm(UPLOAD_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
  try {
    await fs.rm(FALLBACK_UPLOAD_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
};

const resolveCompanyDir = async (companyId: string) => {
  const primary = path.join(UPLOAD_DIR, companyId);
  try {
    await fs.access(primary);
    return primary;
  } catch {
    return path.join(FALLBACK_UPLOAD_DIR, companyId);
  }
};

describe('Company Theme', () => {
  let company1: any;
  let company1Admin: any;
  let company1User: any;
  let company2: any;
  let company2Admin: any;
  let company2User: any;

  beforeEach(async () => {
    company1 = await setupCompanyWithUsers({ employeeCount: 1 });
    company1Admin = company1.admin;
    company1User = company1.employees[0];

    company2 = await setupCompanyWithUsers({ employeeCount: 1 });
    company2Admin = company2.admin;
    company2User = company2.employees[0];
  });

  afterEach(async () => {
    await cleanupTestData(company1.company.id);
    await cleanupTestData(company2.company.id);
    await removeUploads();
  });

  it('returns default theme when none configured', async () => {
    const response = await authenticatedRequest(app, company1Admin.token)
      .get('/api/theme')
      .expect(200);

    expect(response.body.data).toEqual(DEFAULT_THEME);
  });

  it('allows admin to update theme colors for their company', async () => {
    const payload = {
      primaryColor: '#123456',
      secondaryColor: '#abcdef',
      backgroundColor: '#fafafa',
    };

    const updateResponse = await authenticatedRequest(app, company1Admin.token)
      .put('/api/admin/theme')
      .send(payload)
      .expect(200);

    expect(updateResponse.body.data).toMatchObject({
      ...DEFAULT_THEME,
      ...Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [key, value.toLowerCase()])
      ),
    });

    const fetchResponse = await authenticatedRequest(app, company1User.token)
      .get('/api/theme')
      .expect(200);

    expect(fetchResponse.body.data.primaryColor).toBe('#123456');
    expect(fetchResponse.body.data.secondaryColor).toBe('#abcdef');
    expect(fetchResponse.body.data.backgroundColor).toBe('#fafafa');
  });

  it('rejects theme updates from non-admin users', async () => {
    await authenticatedRequest(app, company1User.token)
      .put('/api/admin/theme')
      .send({
        primaryColor: '#111111',
      })
      .expect(403);
  });

  it('keeps themes isolated per company', async () => {
    const payload = {
      primaryColor: '#654321',
      secondaryColor: '#aa00ff',
      backgroundColor: '#ffffff',
    };

    await authenticatedRequest(app, company1Admin.token)
      .put('/api/admin/theme')
      .send(payload)
      .expect(200);

    const otherCompanyTheme = await authenticatedRequest(app, company2Admin.token)
      .get('/api/theme')
      .expect(200);

    expect(otherCompanyTheme.body.data).toEqual(DEFAULT_THEME);
  });

  describe('Cover photo uploads', () => {
    it('accepts a valid cover photo and returns processed metadata', async () => {
      const buffer = await createImageBuffer(1500, 700, '#778899');

      const response = await request(app)
        .post('/api/admin/theme/cover')
        .set('Authorization', `Bearer ${company1Admin.token}`)
        .attach('cover', buffer, { filename: 'cover.png', contentType: 'image/png' })
        .expect(200);

      expect(response.body.data.coverPhotoUrl).toContain('/uploads/themes/');
      expect(response.body.data.coverPhotoMeta).toMatchObject({
        format: 'webp',
      });
      expect(response.body.data.coverPhotoMeta.width).toBeGreaterThanOrEqual(1200);
      expect(response.body.data.coverPhotoMeta.height).toBeGreaterThan(300);
    });

    it('rejects non-image uploads', async () => {
      const response = await request(app)
        .post('/api/admin/theme/cover')
        .set('Authorization', `Bearer ${company1Admin.token}`)
        .attach('cover', Buffer.from('not-an-image'), {
          filename: 'bad.txt',
          contentType: 'text/plain',
        })
        .expect(400);

      expect(response.body.error || response.body.message).toBeTruthy();
    });

    it('clears cover when opting out of cover usage', async () => {
      const buffer = await createImageBuffer(1500, 700, '#778899');

      await request(app)
        .post('/api/admin/theme/cover')
        .set('Authorization', `Bearer ${company1Admin.token}`)
        .attach('cover', buffer, { filename: 'cover.png', contentType: 'image/png' })
        .expect(200);

      const clearResponse = await authenticatedRequest(app, company1Admin.token)
        .put('/api/admin/theme')
        .send({ primaryColor: '#123456', useCover: false })
        .expect(200);

      expect(clearResponse.body.data.coverPhotoUrl).toBeNull();
      expect(clearResponse.body.data.coverPhotoMeta).toBeNull();
    });

    it('replaces previous cover and keeps storage to a single file', async () => {
      const bufferOne = await createImageBuffer(1500, 700, '#112233');
      const firstUpload = await request(app)
        .post('/api/admin/theme/cover')
        .set('Authorization', `Bearer ${company1Admin.token}`)
        .attach('cover', bufferOne, { filename: 'cover-one.png', contentType: 'image/png' })
        .expect(200);

      const companyDir = await resolveCompanyDir(company1.company.id);
      const firstFilename = path.basename(firstUpload.body.data.coverPhotoUrl);
      const filesAfterFirst = (await fs.readdir(companyDir)).filter((file) => file.endsWith('.webp'));

      expect(filesAfterFirst).toContain(firstFilename);

      const bufferTwo = await createImageBuffer(1600, 800, '#445566');
      const secondUpload = await request(app)
        .post('/api/admin/theme/cover')
        .set('Authorization', `Bearer ${company1Admin.token}`)
        .attach('cover', bufferTwo, { filename: 'cover-two.png', contentType: 'image/png' })
        .expect(200);

      const secondFilename = path.basename(secondUpload.body.data.coverPhotoUrl);
      const filesAfterSecond = (await fs.readdir(companyDir)).filter((file) => file.endsWith('.webp'));

      expect(secondFilename).toContain(company1.company.id);
      expect(secondFilename).not.toBe(firstFilename);
      expect(filesAfterSecond).toContain(secondFilename);
      expect(filesAfterSecond).not.toContain(firstFilename);
      expect(filesAfterSecond.length).toBe(1);
    });
  });

  describe('Slug-based routing', () => {
    it('serves theme for the current tenant slug', async () => {
      const response = await authenticatedRequest(app, company1Admin.token)
        .get(`/api/c/${company1.company.slug}/theme`)
        .expect(200);

      expect(response.body.data).toEqual(DEFAULT_THEME);
    });

    it('updates theme colors via slug routes and prevents cross-tenant access', async () => {
      const payload = {
        primaryColor: '#111111',
        secondaryColor: '#222222',
        backgroundColor: '#333333',
      };

      const updateResponse = await authenticatedRequest(app, company1Admin.token)
        .put(`/api/c/${company1.company.slug}/admin/theme`)
        .send(payload)
        .expect(200);

      expect(updateResponse.body.data.primaryColor).toBe('#111111');

      await authenticatedRequest(app, company2User.token)
        .get(`/api/c/${company1.company.slug}/theme`)
        .expect(403);
    });

    it('uploads cover via slug route and stores under slug-based path', async () => {
      const buffer = await createImageBuffer(1500, 700, '#445566');

      const response = await request(app)
        .post(`/api/c/${company1.company.slug}/admin/theme/cover`)
        .set('Authorization', `Bearer ${company1Admin.token}`)
        .attach('cover', buffer, { filename: 'cover.png', contentType: 'image/png' })
        .expect(200);

      expect(response.body.data.coverPhotoUrl).toContain(`/uploads/themes/${company1.company.slug}/`);

      const companyDir = await resolveCompanyDir(company1.company.slug);
      const files = (await fs.readdir(companyDir)).filter((file) => file.endsWith('.webp'));

      expect(files.length).toBe(1);
      expect(files[0]).toContain(company1.company.slug);
    });
  });
});
