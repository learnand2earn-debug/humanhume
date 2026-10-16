'use client';

import { useEffect } from 'react';
import { installGlobalJsonShield } from '@/lib/utils/safe-json';

export default function ClientShieldProvider() {
  useEffect(() => {
    installGlobalJsonShield();
  }, []);

  return null;
}
