import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import sharp from 'sharp';
import prisma from '../../config/database';
import { CompanyTheme } from '@prisma/client';

export const DEFAULT_THEME = {
  primaryColor: '#0f172a',
  secondaryColor: '#22c55e',
  backgroundColor: '#f8fafc',
};

const DEFAULT_UPLOAD_ROOT = path.join(process.cwd(), 'storage', 'themes');
const THEME_UPLOAD_ROOT = process.env.THEME_UPLOAD_DIR || DEFAULT_UPLOAD_ROOT;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const MIN_WIDTH = 800;
const MIN_HEIGHT = 400;
const TARGET_WIDTH = 1600;
const TARGET_HEIGHT = 420;

export class ThemeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThemeError';
  }
}

const normalizeColor = (color: string) => color.toLowerCase();

export const toThemeResponse = (theme: CompanyTheme) => ({
  primaryColor: theme.primaryColor,
  secondaryColor: theme.secondaryColor,
  backgroundColor: theme.backgroundColor,
  coverPhotoUrl: theme.coverPhotoUrl,
  coverPhotoMeta: theme.coverPhotoUrl
    ? {
        width: theme.coverPhotoWidth,
        height: theme.coverPhotoHeight,
        format: theme.coverPhotoFormat,
        size: theme.coverPhotoSize,
      }
    : null,
});

export async function getOrCreateTheme(companyId: string) {
  let theme = await prisma.companyTheme.findUnique({
    where: { companyId },
  });

  if (!theme) {
    theme = await prisma.companyTheme.create({
      data: {
        companyId,
        ...DEFAULT_THEME,
      },
    });
  }

  return theme;
}

export async function updateThemeColors(
  companyId: string,
  colors: Partial<Pick<CompanyTheme, 'primaryColor' | 'secondaryColor' | 'backgroundColor'>> & {
    useCover?: boolean;
  }
) {
  const updates: Record<string, string | null> = {};
  if (colors.primaryColor) updates.primaryColor = normalizeColor(colors.primaryColor);
  if (colors.secondaryColor) updates.secondaryColor = normalizeColor(colors.secondaryColor);
  if (colors.backgroundColor) updates.backgroundColor = normalizeColor(colors.backgroundColor);

  if (colors.useCover === false) {
    updates.coverPhotoUrl = null;
    updates.coverPhotoWidth = null;
    updates.coverPhotoHeight = null;
    updates.coverPhotoFormat = null;
    updates.coverPhotoSize = null;
  }

  const theme = await prisma.companyTheme.upsert({
    where: { companyId },
    create: {
      companyId,
      ...DEFAULT_THEME,
      ...updates,
    },
    update: updates,
  });

  return theme;
}

async function ensureUploadDirectory(companyId: string) {
  const directory = path.join(THEME_UPLOAD_ROOT, companyId);
  try {
    await fs.mkdir(directory, { recursive: true });
    return directory;
  } catch (error: any) {
    console.error('Failed to create theme upload directory, falling back to temp:', error?.message);
    const fallback = path.join(os.tmpdir(), 'themes', companyId);
    await fs.mkdir(fallback, { recursive: true });
    return fallback;
  }
}

const validateCoverFile = async (file?: Express.Multer.File) => {
  if (!file) {
    throw new ThemeError('Cover photo is required');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new ThemeError('Only PNG, JPG, or WEBP images are allowed');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ThemeError('Cover photo must be 2MB or smaller');
  }

  const metadata = await sharp(file.buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (!width || !height) {
    throw new ThemeError('Could not read cover photo dimensions');
  }

  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    throw new ThemeError(`Cover photo must be at least ${MIN_WIDTH}x${MIN_HEIGHT}px`);
  }

  return { width, height };
};

export async function updateCoverPhoto(companyId: string, file?: Express.Multer.File) {
  const { width, height } = await validateCoverFile(file);

  const { data, info } = await sharp(file!.buffer)
    .rotate()
    .resize({
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const directory = await ensureUploadDirectory(companyId);
  const filename = `cover-${Date.now()}.webp`;
  const filepath = path.join(directory, filename);

  await fs.writeFile(filepath, data);

  const publicUrl = `/uploads/themes/${companyId}/${filename}`;

  const theme = await prisma.companyTheme.upsert({
    where: { companyId },
    create: {
      companyId,
      ...DEFAULT_THEME,
      coverPhotoUrl: publicUrl,
      coverPhotoWidth: info.width,
      coverPhotoHeight: info.height,
      coverPhotoFormat: info.format,
      coverPhotoSize: data.length,
    },
    update: {
      coverPhotoUrl: publicUrl,
      coverPhotoWidth: info.width,
      coverPhotoHeight: info.height,
      coverPhotoFormat: info.format,
      coverPhotoSize: data.length,
    },
  });

  return theme;
}
