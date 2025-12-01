import { NextFunction, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from './auth';

export interface CompanyScopedRequest extends AuthRequest {
  companyContext?: {
    id: string;
    slug: string;
  };
}

/**
 * Resolve company by :slug param and enforce tenant isolation when a user is present.
 * - 404 when slug is unknown
 * - 403 when slug does not match authenticated user's company
 */
export const resolveCompanyFromSlug = async (
  req: CompanyScopedRequest,
  res: Response,
  next: NextFunction
) => {
  const { slug } = req.params;
  if (!slug) return next();

  const company = await prisma.company.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });

  if (!company) {
    return res.status(404).json({ message: 'Company not found' });
  }

  if (req.user && company.id !== req.user.companyId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  req.companyContext = { id: company.id, slug: company.slug };
  return next();
};
