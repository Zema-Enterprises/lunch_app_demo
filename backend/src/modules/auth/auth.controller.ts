import { Response } from 'express';
import prisma from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/bcrypt';
import { generateToken } from '../../utils/jwt';
import { AuthRequest } from '../../middleware/auth';
import { isPasswordStrong, PASSWORD_REQUIREMENTS_MESSAGE } from '../../utils/password';
import { logger } from '../../utils/logger';
import {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  extractRefreshTokenFromRequest,
  RefreshTokenError,
} from './refreshToken.service';

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, companyName, companyDomain, companySlug, companyId } =
      req.body;

    if (!password || !isPasswordStrong(password)) {
      return res.status(400).json({
        message: PASSWORD_REQUIREMENTS_MESSAGE,
      });
    }

    if (companyId) {
      return res.status(400).json({
        message: 'Direct company registration is disabled. Ask your admin for an invite link.',
      });
    }

    if (!companyName || !companyDomain || !companySlug) {
      return res.status(400).json({
        message: 'Company information required',
      });
    }

    // Check if user already exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: {
          equals: email,
          mode: 'insensitive',
        }
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const normalizedSlug = companySlug.toLowerCase();
    const normalizedDomain = companyDomain.toLowerCase();

    // Check if company slug is taken
    const slugTaken = await prisma.company.findUnique({
      where: { slug: normalizedSlug },
    });

    if (slugTaken) {
      return res.status(400).json({ message: 'Company slug already taken' });
    }

    const domainTaken = await prisma.company.findFirst({
      where: {
        domain: normalizedDomain,
      },
    });

    if (domainTaken) {
      return res.status(400).json({ message: 'Company domain already taken' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          domain: normalizedDomain,
          slug: normalizedSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          role: 'ADMIN',
          companyId: company.id,
        },
      });

      return { company, user };
    });

    const refresh = await issueRefreshToken(result.user.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    setRefreshTokenCookie(res, refresh.token, refresh.expiresAt);

    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      companyId: result.user.companyId,
      role: result.user.role,
    });

    return res.status(201).json({
      data: {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          companyId: result.user.companyId,
        },
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user (case-insensitive email)
    const user = await prisma.user.findFirst({
      where: { 
        email: {
          equals: email,
          mode: 'insensitive',
        }
      },
      include: {
        company: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    });

    const refresh = await issueRefreshToken(user.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    setRefreshTokenCookie(res, refresh.token, refresh.expiresAt);

    return res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
        },
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        company: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      },
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    return res.status(500).json({ message: 'Failed to get user' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = extractRefreshTokenFromRequest(req);
    await revokeRefreshToken(refreshToken);
    clearRefreshTokenCookie(res);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    clearRefreshTokenCookie(res);
    return res.status(200).json({ message: 'Logged out successfully' });
  }
};

export const refreshAccessToken = async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = extractRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }

    const rotation = await rotateRefreshToken(refreshToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    const user = await prisma.user.findUnique({
      where: { id: rotation.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
      },
    });

    if (!user) {
      await revokeRefreshToken(rotation.token);
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Account no longer exists' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    });

    setRefreshTokenCookie(res, rotation.token, rotation.expiresAt);

    return res.status(200).json({
      data: {
        token,
      },
    });
  } catch (error) {
    if (error instanceof RefreshTokenError) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    logger.error('Refresh token error:', error);
    return res.status(500).json({ message: 'Failed to refresh session' });
  }
};
