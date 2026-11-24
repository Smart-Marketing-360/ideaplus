import React from 'react';
import { brandConfig } from '../../config/brand.config';

interface DiaryPageFrameProps {
  title: string;
  subtitle?: string;
  showDailyTagline?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const DiaryPageFrame: React.FC<DiaryPageFrameProps> = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <div className="w-full max-w-[1200px] mx-auto">
      {/* On-screen view: sits directly on #F7F8FB, no heavy cards or swooshes */}
      <div className="screen-only pb-12">
        {/* Optional Subtitle / context description if provided */}
        {subtitle && (
          <div className="mb-6 -mt-2">
            <p className="text-caption text-slate-500 font-normal">
              {subtitle}
            </p>
          </div>
        )}

        {/* Page Content */}
        <div>{children}</div>
      </div>

      {/* PRINT-ONLY VIEW: Reproduces the physical paper diary page on A4/A5 */}
      <div className="print-only-diary">
        <div className="swoosh-top mb-3" />
        <div className="navy-title-bar px-4 py-2 rounded-sm mb-3 flex items-center justify-between">
          <h1 className="font-bold text-lg uppercase tracking-wider text-white">
            {title}
          </h1>
          <span className="text-xs text-white/80 font-medium">
            {brandConfig.appName} • {brandConfig.dailyTagline}
          </span>
        </div>
        <div className="p-2 min-h-[600px]">{children}</div>
        <div className="swoosh-bottom mt-4" />
      </div>
    </div>
  );
};
