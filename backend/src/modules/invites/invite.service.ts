import crypto from 'crypto';
import { TenantInvite, UserRole } from '@prisma/client';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { sendInviteEmail } from './invite.mailer';
import { hashPassword } from '../../utils/bcrypt';
import { logger } from '../../utils/logger';

export type InviteStatus = 'PENDING' | 'REDEEMED' | 'REVOKED' | 'EXPIRED';

const INVITE_TOKEN_BYTES = 32;
const NORMALIZED_DATE_MS = 24 * 60 * 60 * 1000;

export class InviteServiceError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');
const generateToken = () => crypto.randomBytes(INVITE_TOKEN_BYTES).toString('hex');

export const getInviteStatus = (invite: Pick<TenantInvite, 'redeemedAt' | 'revokedAt' | 'expiresAt'>): InviteStatus => {
  if (invite.revokedAt) return 'REVOKED';
  if (invite.redeemedAt) return 'REDEEMED';
  if (invite.expiresAt.getTime() < Date.now()) return 'EXPIRED';
  return 'PENDING';
};

export const presentInvite = (invite: TenantInvite) => ({
  id: invite.id,
  companyId: invite.companyId,
  email: invite.email,
  role: invite.role,
  note: invite.note,
  expiresAt: invite.expiresAt,
  redeemedAt: invite.redeemedAt,
  revokedAt: invite.revokedAt,
  createdAt: invite.createdAt,
  updatedAt: invite.updatedAt,
  status: getInviteStatus(invite),
});

interface CreateInviteParams {
  companyId: string;
  inviterId: string;
  email: string;
  role: UserRole;
  note?: string;
}

export const createTenantInvite = async (params: CreateInviteParams) => {
  const normalizedEmail = normalizeEmail(params.email);
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
  });

  if (!company) {
    throw new InviteServiceError('COMPANY_NOT_FOUND', 'Company not found', 404);
  }

  const inviter = await prisma.user.findUnique({
    where: { id: params.inviterId },
    select: { name: true, email: true },
  });

  if (!inviter) {
    throw new InviteServiceError('INVITER_NOT_FOUND', 'Inviter not found', 404);
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: 'insensitive',
      },
    },
  });

  if (existingUser) {
    throw new InviteServiceError(
      'USER_ALREADY_EXISTS',
      'A user with this email already exists',
      409
    );
  }

  const pendingInvite = await prisma.tenantInvite.findFirst({
    where: {
      companyId: params.companyId,
      email: normalizedEmail,
      redeemedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (pendingInvite) {
    throw new InviteServiceError(
      'INVITE_ALREADY_EXISTS',
      'An active invite already exists for this email',
      409
    );
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + env.INVITE_TTL_DAYS * NORMALIZED_DATE_MS);

  const invite = await prisma.tenantInvite.create({
    data: {
      companyId: params.companyId,
      inviterId: params.inviterId,
      email: normalizedEmail,
      role: params.role,
      note: params.note,
      tokenHash,
      expiresAt,
      metadata: {
        provider: env.INVITE_EMAIL_PROVIDER,
      },
    },
  });

  const baseUrl = env.FRONTEND_APP_URL.replace(/\/$/, '');
  const inviteLink = company.slug
    ? `${baseUrl}/c/${company.slug}/invite/${token}`
    : `${baseUrl}/invite/${token}`;

  try {
    await sendInviteEmail({
      email: normalizedEmail,
      inviteLink,
      companyName: company.name,
      role: params.role,
      note: params.note,
      inviterName: inviter.name || inviter.email,
    });
  } catch (error) {
    logger.error('Failed to deliver invite email', error);
    await prisma.tenantInvite.delete({ where: { id: invite.id } });
    throw new InviteServiceError(
      'INVITE_DELIVERY_FAILED',
      'Failed to deliver invite email',
      502
    );
  }

  return {
    invite,
    token,
  };
};

interface RedeemInviteParams {
  token: string;
  name: string;
  password: string;
  companySlug?: string;
}

export const redeemInviteToken = async (params: RedeemInviteParams) => {
  const tokenHash = hashToken(params.token);

  const invite = await prisma.tenantInvite.findUnique({
    where: { tokenHash },
  });

  if (!invite) {
    throw new InviteServiceError('INVITE_NOT_FOUND', 'Invite not found', 404);
  }

  if (params.companySlug) {
    const company = await prisma.company.findUnique({
      where: { slug: params.companySlug },
      select: { id: true },
    });

    if (!company || company.id !== invite.companyId) {
      throw new InviteServiceError('INVITE_NOT_FOUND', 'Invite not found', 404);
    }
  }

  if (invite.revokedAt) {
    throw new InviteServiceError('INVITE_REVOKED', 'Invite has been revoked', 410);
  }

  if (invite.redeemedAt) {
    throw new InviteServiceError('INVITE_ALREADY_REDEEMED', 'Invite already redeemed', 409);
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    throw new InviteServiceError('INVITE_EXPIRED', 'Invite has expired', 410);
  }

  const normalizedEmail = normalizeEmail(invite.email);
  const existingUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: 'insensitive',
      },
    },
  });

  if (existingUser) {
    throw new InviteServiceError(
      'USER_ALREADY_EXISTS',
      'A user with this email already exists',
      409
    );
  }

  const hashedPassword = await hashPassword(params.password);
  const now = new Date();

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: params.name,
        role: invite.role,
        companyId: invite.companyId,
      },
    });

    await tx.tenantInvite.update({
      where: { id: invite.id },
      data: {
        redeemedAt: now,
        redeemedById: user.id,
      },
    });

    return user;
  });

  return {
    user: createdUser,
    invite,
  };
};

export const listTenantInvites = async (companyId: string) => {
  const invites = await prisma.tenantInvite.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  });

  return invites;
};
