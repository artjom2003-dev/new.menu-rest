'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OwnerPhotosRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/owner/edit'); }, [router]);
  return null;
}
