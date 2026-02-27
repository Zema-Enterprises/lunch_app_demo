import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Bell, LogOut, User } from 'lucide-react';

interface ThemePreviewProps {
  themeForm: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
  };
  coverActive: boolean;
  resolvedPreviewCoverUrl: string | null;
  previewUsesInvertedTone: boolean;
  previewBrandColor: string;
  previewCompanyColor: string;
  previewTextColor: string;
  previewNavBackground: string;
  previewNavBorder: string;
  previewSecondaryDark: boolean;
  companyName: string;
  userName: string;
  userRole: string;
}

export function ThemePreview({
  themeForm,
  coverActive,
  resolvedPreviewCoverUrl,
  previewUsesInvertedTone,
  previewBrandColor,
  previewCompanyColor,
  previewTextColor,
  previewNavBackground,
  previewNavBorder,
  previewSecondaryDark,
  companyName,
  userName,
  userRole,
}: ThemePreviewProps) {
  const containerStyle = useMemo(
    () => ({
      backgroundImage:
        coverActive && resolvedPreviewCoverUrl
          ? `linear-gradient(120deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.55) 45%, rgba(15,23,42,0.3) 100%), url(${resolvedPreviewCoverUrl})`
          : undefined,
      backgroundColor: coverActive ? undefined : themeForm.backgroundColor,
      backgroundSize: coverActive ? ('cover' as const) : undefined,
      backgroundRepeat: coverActive ? ('no-repeat' as const) : undefined,
      backgroundPosition: coverActive ? ('center' as const) : undefined,
      height: '72px',
      position: 'relative' as const,
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      borderColor: previewUsesInvertedTone
        ? 'rgba(255,255,255,0.18)'
        : themeForm.primaryColor,
    }),
    [coverActive, resolvedPreviewCoverUrl, themeForm.backgroundColor, themeForm.primaryColor, previewUsesInvertedTone],
  );

  const overlayStyle = useMemo(
    () => ({
      background: coverActive
        ? 'linear-gradient(120deg, rgba(15,23,42,0.65) 0%, rgba(15,23,42,0.45) 55%, rgba(15,23,42,0.35) 100%)'
        : previewUsesInvertedTone
          ? 'linear-gradient(120deg, rgba(15,23,42,0.22) 0%, rgba(15,23,42,0.14) 65%, rgba(15,23,42,0.1) 100%)'
          : 'transparent',
      backdropFilter: coverActive ? 'blur(4px)' : undefined,
    }),
    [coverActive, previewUsesInvertedTone],
  );

  const brandTextStyle = useMemo(
    () => ({
      color: previewBrandColor,
      textShadow: previewUsesInvertedTone
        ? '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)'
        : '0 1px 3px rgba(0, 0, 0, 0.1)',
    }),
    [previewBrandColor, previewUsesInvertedTone],
  );

  const separatorStyle = useMemo(
    () => ({
      backgroundColor: previewUsesInvertedTone
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(15, 23, 42, 0.2)',
    }),
    [previewUsesInvertedTone],
  );

  const companyBadgeStyle = useMemo(
    () => ({
      backgroundColor: previewUsesInvertedTone
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(15, 23, 42, 0.06)',
      backdropFilter: 'blur(8px)',
      border: `1px solid ${
        previewUsesInvertedTone
          ? 'rgba(255, 255, 255, 0.25)'
          : 'rgba(15, 23, 42, 0.12)'
      }`,
      boxShadow: previewUsesInvertedTone
        ? '0 2px 8px rgba(0, 0, 0, 0.15)'
        : '0 1px 3px rgba(0, 0, 0, 0.08)',
    }),
    [previewUsesInvertedTone],
  );

  const companyLabelStyle = useMemo(
    () => ({
      color: previewUsesInvertedTone
        ? 'rgba(255, 255, 255, 0.7)'
        : 'rgba(15, 23, 42, 0.6)',
      textShadow: previewUsesInvertedTone
        ? '0 1px 2px rgba(0, 0, 0, 0.2)'
        : 'none',
    }),
    [previewUsesInvertedTone],
  );

  const companyNameStyle = useMemo(
    () => ({
      color: previewCompanyColor,
      textShadow: previewUsesInvertedTone
        ? '0 1px 3px rgba(0, 0, 0, 0.25)'
        : '0 1px 2px rgba(0, 0, 0, 0.08)',
    }),
    [previewCompanyColor, previewUsesInvertedTone],
  );

  const navStyle = useMemo(
    () => ({
      background: previewNavBackground,
      border: previewNavBorder,
      backdropFilter: coverActive ? 'blur(8px)' : undefined,
    }),
    [previewNavBackground, previewNavBorder, coverActive],
  );

  return (
    <div
      className="rounded-xl border overflow-hidden shadow-sm"
      data-testid="theme-preview"
      style={containerStyle}
    >
      <div className="absolute inset-0" style={overlayStyle} />
      <div className="relative flex items-center gap-3 w-full justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <span className="text-2xl font-bold" style={brandTextStyle}>
            LunchSync
          </span>
          {/* Visual separator */}
          <div
            className="hidden sm:block w-px h-6"
            style={separatorStyle}
            aria-hidden="true"
          />
          {/* Company name badge */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={companyBadgeStyle}
          >
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={companyLabelStyle}
            >
              Company
            </span>
            <span className="text-sm font-semibold" style={companyNameStyle}>
              {companyName}
            </span>
          </div>
        </div>
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-full"
          style={navStyle}
        >
          <span
            className="text-sm font-medium flex items-center gap-2"
            style={{ color: previewTextColor }}
          >
            <User
              className={cn(
                'w-4 h-4',
                previewUsesInvertedTone ? 'text-slate-200' : 'text-slate-500',
              )}
            />
            {userName}
          </span>
          {userRole === 'ADMIN' && (
            <span
              className={cn(
                'px-2 py-1 text-xs rounded-full',
                previewSecondaryDark ? 'text-slate-50' : 'text-slate-900',
              )}
              style={{ background: themeForm.secondaryColor }}
            >
              Admin
            </span>
          )}
          <Bell
            className={cn(
              'w-5 h-5',
              previewUsesInvertedTone ? 'text-slate-50' : 'text-slate-900',
            )}
          />
          <LogOut
            className={cn(
              'w-4 h-4',
              previewUsesInvertedTone ? 'text-slate-50' : 'text-slate-900',
            )}
          />
        </div>
      </div>
    </div>
  );
}
