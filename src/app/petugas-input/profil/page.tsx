'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import UserProfileEditor from '@/components/profile/UserProfileEditor';

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-500">Memuat profil...</p>
        </div>
      }
    >
      <UserProfileEditor baseRolePath="/petugas-input" />
    </Suspense>
  );
}
