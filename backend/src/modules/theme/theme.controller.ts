import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  ThemeError,
  getOrCreateTheme,
  toThemeResponse,
  updateCoverPhoto,
  updateThemeColors,
} from './theme.service';
import { CompanyScopedRequest } from '../../middleware/company';

export const getCompanyTheme = async (req: AuthRequest, res: Response) => {
  try {
    const scopedReq = req as CompanyScopedRequest;
    const companyId = scopedReq.companyContext?.id || req.user!.companyId;
    const theme = await getOrCreateTheme(companyId);
    return res.json({ data: toThemeResponse(theme) });
  } catch (error) {
    console.error('Get theme error:', error);
    return res.status(500).json({ message: 'Failed to fetch theme' });
  }
};

export const updateCompanyTheme = async (req: AuthRequest, res: Response) => {
  try {
    const scopedReq = req as CompanyScopedRequest;
    const companyId = scopedReq.companyContext?.id || req.user!.companyId;
    const theme = await updateThemeColors(companyId, req.body);
    return res.json({ data: toThemeResponse(theme) });
  } catch (error) {
    console.error('Update theme error:', error);
    return res.status(500).json({ message: 'Failed to update theme' });
  }
};

export const uploadThemeCover = async (req: AuthRequest, res: Response) => {
  try {
    const scopedReq = req as CompanyScopedRequest;
    const companyId = scopedReq.companyContext?.id || req.user!.companyId;
    const companySlug = scopedReq.companyContext?.slug;
    const theme = await updateCoverPhoto(
      { id: companyId, slug: companySlug },
      req.file
    );
    return res.json({ data: toThemeResponse(theme) });
  } catch (error) {
    if (error instanceof ThemeError) {
      return res.status(400).json({ message: error.message });
    }

    console.error('Upload theme cover error:', error);
    return res.status(500).json({ message: 'Failed to upload cover photo' });
  }
};
