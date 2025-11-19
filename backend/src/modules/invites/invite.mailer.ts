import { Resend } from 'resend';
import { env } from '../../config/env';

export interface InviteEmailPayload {
  email: string;
  inviteLink: string;
  companyName: string;
  role: string;
  note?: string;
  inviterName?: string;
}

const resendClient = env.INVITE_EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY
  ? new Resend(env.RESEND_API_KEY)
  : null;

const formatRole = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'admin';
    case 'MANAGER':
      return 'manager';
    default:
      return 'team member';
  }
};

const buildHtml = (payload: InviteEmailPayload) => {
  const roleLabel = formatRole(payload.role);
  const inviterLabel = payload.inviterName || 'A teammate';

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <p>${inviterLabel} invited you to join <strong>${payload.companyName}</strong> as a ${roleLabel} on LunchSync.</p>
      ${payload.note ? `<blockquote style="margin: 16px 0; padding-left: 12px; border-left: 4px solid #94a3b8; color: #475569;">${payload.note}</blockquote>` : ''}
      <p>
        <a href="${payload.inviteLink}" style="display:inline-block;padding:10px 18px;border-radius:6px;background:#0f172a;color:#fff;text-decoration:none;font-weight:bold;">
          Accept Invite
        </a>
      </p>
      <p style="font-size: 12px; color: #475569;">
        If the button doesn't work, copy and paste this link into your browser:<br />
        <span style="word-break: break-all;">${payload.inviteLink}</span>
      </p>
    </div>
  `;
};

export const sendInviteEmail = async (payload: InviteEmailPayload) => {
  if (env.NODE_ENV === 'test' || env.INVITE_EMAIL_PROVIDER === 'console') {
    console.info('[invite-email]', {
      to: payload.email,
      link: payload.inviteLink,
      role: payload.role,
    });
    return { id: 'console' };
  }

  if (env.INVITE_EMAIL_PROVIDER !== 'resend') {
    throw new Error(`Unsupported invite email provider: ${env.INVITE_EMAIL_PROVIDER}`);
  }

  if (!resendClient) {
    throw new Error('Resend API key is not configured for invite emails.');
  }

  const response = await resendClient.emails.send({
    from: env.INVITE_EMAIL_FROM,
    to: payload.email,
    subject: `You're invited to join ${payload.companyName} on LunchSync`,
    html: buildHtml(payload),
    replyTo: env.INVITE_EMAIL_REPLY_TO,
  });

  if (response.error) {
    const message = response.error.message || 'Unknown Resend error';
    throw new Error(`Resend invite email failed: ${message}`);
  }

  return response;
};
