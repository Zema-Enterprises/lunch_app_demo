import type { InviteEmailPayload } from '../invite.mailer';

const basePayload: InviteEmailPayload = {
  email: 'new-user@example.com',
  inviteLink: 'https://localhost:3000/invite/abc123',
  companyName: 'LunchSync Test Co',
  role: 'USER',
};

const setupMailer = async () => {
  jest.resetModules();

  process.env.NODE_ENV = 'development';
  process.env.INVITE_EMAIL_PROVIDER = 'resend';
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.INVITE_EMAIL_FROM = 'LunchSync Invites <onboarding@resend.dev>';
  process.env.INVITE_EMAIL_REPLY_TO = 'support@zemaenterprises.com';

  const mockSend = jest.fn();

  jest.doMock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockSend,
      },
    })),
  }));

  const module = await import('../invite.mailer');
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
});
