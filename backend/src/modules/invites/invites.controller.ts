import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  createTenantInvite,
  InviteServiceError,
  presentInvite,
  redeemInviteToken,
  listTenantInvites,
} from './invite.service';
import { generateToken } from '../../utils/jwt';
import {
  issueRefreshToken,
  setRefreshTokenCookie,
} from '../auth/refreshToken.service';
import { CompanyScopedRequest } from '../../middleware/company';

export const createInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { email, role, note } = req.body;
    const { companyId, userId } = req.user!;

    const { invite, token } = await createTenantInvite({
      email,
      role,
      note,
      companyId,
      inviterId: userId,
    });

    return res.status(201).json({
      data: {
        invite: presentInvite(invite),
        token,
      },
    });
  } catch (error) {
    if (error instanceof InviteServiceError) {
      return res.status(error.status).json({
        error: error.code,
        message: error.message,
      });
    }

    console.error('Create invite error:', error);
    return res.status(500).json({ error: 'INVITE_CREATION_FAILED' });
  }
};

export const listInvites = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const invites = await listTenantInvites(companyId);
    return res.json({
      data: invites.map(presentInvite),
    });
  } catch (error) {
    console.error('List invites error:', error);
    return res.status(500).json({ error: 'INVITE_LIST_FAILED' });
  }
};

export const redeemInvite = async (req: Request, res: Response) => {
  try {
    const scopedReq = req as CompanyScopedRequest;
    const { token, password, name } = req.body;
    const companySlug = scopedReq.companyContext?.slug || scopedReq.params?.slug;

    const { user } = await redeemInviteToken({
      token,
      password,
      name,
      companySlug,
    });

    const accessToken = generateToken({
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

    return res.status(201).json({
      data: {
        token: accessToken,
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
    if (error instanceof InviteServiceError) {
      const status = error.status || 400;
      return res.status(status).json({
        error: error.code,
        message: error.message,
      });
    }

    console.error('Redeem invite error:', error);
    return res.status(500).json({
      error: 'INVITE_REDEMPTION_FAILED',
      message: 'Failed to redeem invite',
    });
  }
};
