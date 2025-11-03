'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';

export default function GlobalErrorChecker() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkServer = async () => {
      if (!process.env.NEXT_PUBLIC_STRAPI_URL) {
        if (pathname !== '/check-server') {
          sessionStorage.setItem('intendedPath', pathname);
          router.replace('/check-server');
        }
        return;
      }

      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/healthz`, {
          timeout: 5000,
        });

        if (res.status === 200) {
          // Server กลับมาแล้ว
          if (pathname === '/check-server') {
            const jwt = sessionStorage.getItem('jwt');
            const intended = sessionStorage.getItem('intendedPath');
            const redirectTo = intended && intended !== '/' ? intended : jwt ? '/' : '/login';
            sessionStorage.removeItem('intendedPath');
            router.replace(redirectTo);
          }
        }
      } catch (error) {
        // Server ล่ม
        if (pathname !== '/check-server') {
          sessionStorage.setItem('intendedPath', pathname);
          router.replace('/check-server');
        }
      }
    };

    const checkAuth = () => {
      const jwt = sessionStorage.getItem('jwt');
      const isAuthPage = ['/login', '/register', '/check-server'].includes(pathname);

      if (!jwt && !isAuthPage) {
        sessionStorage.setItem('intendedPath', pathname);
        router.replace('/login');
      }
    };

    checkServer();
    checkAuth();

    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, [router, pathname]);

  return null;
}