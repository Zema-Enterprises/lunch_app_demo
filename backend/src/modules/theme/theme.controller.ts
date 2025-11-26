import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  ThemeError,
  getOrCreateTheme,
  toThemeResponse,
  updateCoverPhoto,
  updateThemeColors,
} from './theme.service';

export const getCompanyTheme = async (req: AuthRequest, res: Response) => {
  try {
    const theme = await getOrCreateTheme(req.user!.companyId);
    return res.json({ data: toThemeResponse(theme) });
  } catch (error) {
    console.error('Get theme error:', error);
    return res.status(500).json({ message: 'Failed to fetch theme' });
  }
};

export const updateCompanyTheme = async (req: AuthRequest, res: Response) => {
  try {
    const theme = await updateThemeColors(req.user!.companyId, req.body);
    return res.json({ data: toThemeResponse(theme) });
  } catch (error) {
    console.error('Update theme error:', error);
    return res.status(500).json({ message: 'Failed to update theme' });
  }
};

export const uploadThemeCover = async (req: AuthRequest, res: Response) => {
  try {
    const theme = await updateCoverPhoto(req.user!.companyId, req.file);
    return res.json({ data: toThemeResponse(theme) });
  } catch (error) {
    if (error instanceof ThemeError) {
      return res.status(400).json({ message: error.message });
    }

    console.error('Upload theme cover error:', error);
    return res.status(500).json({ message: 'Failed to upload cover photo' });
  }
};
