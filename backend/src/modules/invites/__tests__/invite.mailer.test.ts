import type { InviteEmailPayload } from '../invite.mailer';

const basePayload: InviteEmailPayload = {
  email: 'new-user@example.com',
  inviteLink: 'https://localhost:3000/invite/abc123',
  companyName: 'LunchSync Test Co',
  role: 'USER',
};

const setupMailer = async (overrides: Record<string, string> = {}) => {
  jest.resetModules();

  process.env = {
    ...process.env,
    NODE_ENV: 'development',
    INVITE_EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 'test-resend-key',
    INVITE_EMAIL_FROM: 'LunchSync Invites <onboarding@resend.dev>',
    INVITE_EMAIL_REPLY_TO: 'support@zemaenterprises.com',
    ...overrides,
  };

  const mockSend = jest.fn();

  jest.doMock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockSend,
      },
    })),
  }));

  const module = require('../invite.mailer');
  return { sendInviteEmail: module.sendInviteEmail, mockSend };
};

describe('sendInviteEmail', () => {
  afterAll(() => {
    process.env.NODE_ENV = 'test';
  });

  it('propagates Resend API failures', async () => {
    const { sendInviteEmail, mockSend } = await setupMailer();

    mockSend.mockResolvedValue({
      data: null,
      error: {
        message: 'Domain not verified',
        statusCode: 403,
        name: 'validation_error',
      },
      headers: {},
    });

    await expect(sendInviteEmail(basePayload)).rejects.toThrow(/Domain not verified/);
  });

  it('validates the From address format before sending', async () => {
    const { sendInviteEmail, mockSend } = await setupMailer({
      INVITE_EMAIL_FROM: 'invalid-from-value',
    });

    mockSend.mockResolvedValue({
      data: { id: 'test-id' },
      error: null,
      headers: {},
    });

    await expect(sendInviteEmail(basePayload)).rejects.toThrow(/from address/i);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
