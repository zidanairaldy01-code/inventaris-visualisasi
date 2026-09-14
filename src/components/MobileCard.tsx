'use client';

import React from 'react';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Reusable mobile card component untuk menggantikan table row di mobile
 * Digunakan ketika screen width < 768px (md breakpoint)
 */
export function MobileCard({ children, className = '', onClick }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white border border-slate-200 rounded-xl p-4 shadow-sm
        hover:shadow-md hover:border-slate-300 transition-all duration-200
        ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface MobileCardRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

/**
 * Row dalam mobile card untuk menampilkan label-value pair
 */
export function MobileCardRow({ label, value, className = '' }: MobileCardRowProps) {
  return (
    <div className={`flex justify-between items-start gap-3 ${className}`}>
      <span className="text-xs font-medium text-slate-500 min-w-[80px]">{label}</span>
      <span className="text-xs text-slate-900 text-right flex-1">{value}</span>
    </div>
  );
}

interface MobileCardHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * Header untuk mobile card dengan title, subtitle, dan optional badge
 */
export function MobileCardHeader({ title, subtitle, badge, icon }: MobileCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge && <div className="flex-shrink-0">{badge}</div>}
    </div>
  );
}

interface MobileCardActionsProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Action buttons container untuk mobile card
 */
export function MobileCardActions({ children, className = '' }: MobileCardActionsProps) {
  return (
    <div className={`flex items-center gap-2 pt-3 mt-3 border-t border-slate-100 ${className}`}>
      {children}
    </div>
  );
}

interface MobileCardDividerProps {
  className?: string;
}

/**
 * Divider untuk memisahkan section dalam mobile card
 */
export function MobileCardDivider({ className = '' }: MobileCardDividerProps) {
  return <div className={`border-t border-slate-100 my-3 ${className}`} />;
}
