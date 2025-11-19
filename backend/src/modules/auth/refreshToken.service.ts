import crypto from 'crypto';
import { Request, Response } from 'express';
import prisma from '../../config/database';
import { env } from '../../config/env';

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const DEFAULT_REFRESH_TTL_DAYS = env.REFRESH_TOKEN_EXPIRES_IN_DAYS ?? 30;
const REFRESH_TOKEN_TTL_MS = DEFAULT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
const COOKIE_SECURE = env.REFRESH_TOKEN_COOKIE_SECURE;
const COOKIE_SAME_SITE: 'none' | 'lax' = COOKIE_SECURE ? 'none' : 'lax';
const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  sameSite: COOKIE_SAME_SITE,
  path: '/',
  secure: COOKIE_SECURE,
};

export class RefreshTokenError extends Error {
  constructor(message = 'Invalid refresh token') {
    super(message);
    this.name = 'RefreshTokenError';
  }
}

const hashRefreshToken = (token: string) => {
  return crypto.createHash('sha512').update(token).digest('hex');
};

const generateRefreshTokenValue = () => {
  return crypto.randomBytes(64).toString('hex');
};

export const issueRefreshToken = async (userId: string, metadata: { userAgent?: string; ipAddress?: string }) => {
  const token = generateRefreshTokenValue();
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    },
  });

  return { token, expiresAt };
};

export const rotateRefreshToken = async (
  tokenValue: string,
  metadata: { userAgent?: string; ipAddress?: string }
) => {
  const tokenHash = hashRefreshToken(tokenValue);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existing || existing.revokedAt || existing.expiresAt <= new Date()) {
    throw new RefreshTokenError();
  }

  const newTokenValue = generateRefreshTokenValue();
  const newTokenHash = hashRefreshToken(newTokenValue);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const [, created] = await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: existing.id },
      data: {
        revokedAt: new Date(),
      },
    }),
    prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      },
    }),
  ]);

  return {
    token: newTokenValue,
    expiresAt: created.expiresAt,
    userId: existing.userId,
  };
};

export const revokeRefreshToken = async (tokenValue: string | null | undefined) => {
  if (!tokenValue) {
    return;
  }
  const tokenHash = hashRefreshToken(tokenValue);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existing || existing.revokedAt) {
    return;
  }

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const setRefreshTokenCookie = (res: Response, token: string, expiresAt: Date) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    ...COOKIE_BASE_OPTIONS,
    expires: expiresAt,
  });
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, '', {
    ...COOKIE_BASE_OPTIONS,
    expires: new Date(0),
    maxAge: 0,
  });
};

const parseCookieHeader = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [name, ...rest] = part.trim().split('=');
    if (!name) {
      return acc;
    }
    acc[name] = decodeURIComponent(rest.join('=').trim());
    return acc;
  }, {});
};

export const extractRefreshTokenFromRequest = (req: Request) => {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[REFRESH_TOKEN_COOKIE_NAME];
};
