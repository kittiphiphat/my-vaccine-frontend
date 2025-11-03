'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const cardVariants = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.3 } },
};

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect ทันที (ไม่ใช้ setTimeout)
  const performRedirect = useCallback(
    (path) => {
      setIsRedirecting(true);
      router.replace(path, { scroll: false });
    },
    [router]
  );

  // รอ Strapi พร้อม (retry 10 ครั้ง)
  const waitForStrapi = async () => {
    const jwt = sessionStorage.getItem('jwt');
    if (!jwt) return false;

    for (let i = 0; i < 10; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (res.status !== 500) return true;
      } catch {
        // รอ 1 วินาทีแล้วลองใหม่
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    return false;
  };

  // ตรวจสอบสิทธิ์ผู้ใช้
  const checkAuth = useCallback(async () => {
    if (!mounted) return;

    const jwt = sessionStorage.getItem('jwt');

    // ถ้าไม่มี JWT → ไป login
    if (!jwt) {
      performRedirect('/login');
      return;
    }

    // เก็บ intendedPath ก่อน redirect (ยกเว้นบางหน้า)
    if (
      pathname &&
      pathname !== '/' &&
      pathname !== '/check-server' &&
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/register')
    ) {
      sessionStorage.setItem('intendedPath', pathname);
    }

    const isReady = await waitForStrapi();

    if (!isReady) {
      // Strapi ล่ม → ใช้ cache
      const cachedRole = sessionStorage.getItem('userRole');
      if (cachedRole === 'admin') {
        performRedirect('/admin/dashboard');
      } else {
        performRedirect('/login');
      }
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`, {
        headers: { Authorization: `Bearer ${jwt}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 500) {
        performRedirect('/check-server');
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const role =
        data?.role?.name?.toLowerCase() ||
        data?.data?.attributes?.role?.data?.attributes?.name?.toLowerCase();
      const userId = data?.id || data?.data?.id;

      if (!role || !userId) throw new Error('Invalid user data');

      // เก็บข้อมูล
      sessionStorage.setItem('userRole', role);
      sessionStorage.setItem('userId', userId.toString());

      // ดึง intendedPath และลบออกทันที
      const intended = sessionStorage.getItem('intendedPath');
      sessionStorage.removeItem('intendedPath');

      // กำหนดเส้นทาง
      let redirectPath;

      if (role === 'admin') {
        redirectPath = '/admin/dashboard';
      } else {
        if (intended && intended !== '/' && !intended.startsWith('/admin')) {
          redirectPath = intended;
        } else {
          redirectPath = '/welcome';
        }
      }

      performRedirect(redirectPath);
    } catch (err) {
      console.error('Auth check failed:', err);

      // แสดง error ด้วย SweetAlert2
      await MySwal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถตรวจสอบข้อมูลผู้ใช้ได้ กรุณาลองใหม่',
        confirmButtonColor: '#DC2626',
        customClass: {
          popup: 'rounded-lg shadow-md border border-[#D1D5DB]/50',
          title: 'text-base sm:text-lg font-semibold text-[#1F2937]',
          htmlContainer: 'text-sm sm:text-base text-[#4B5563]',
          confirmButton:
            'bg-[#DC2626] text-white px-5 py-3 rounded-lg font-medium hover:bg-[#DC2626]/90 transition-all duration-300 shadow-sm text-sm sm:text-base',
        },
        background: '#FFFFFF',
        color: '#1F2937',
      });

      // Fallback ด้วย cache
      const cachedRole = sessionStorage.getItem('userRole');
      if (cachedRole === 'admin') {
        performRedirect('/admin/dashboard');
      } else {
        // ล้าง JWT ถ้าไม่ใช่ network error
        if (err.name !== 'AbortError' && navigator.onLine) {
          sessionStorage.removeItem('jwt');
          sessionStorage.removeItem('userRole');
          sessionStorage.removeItem('userId');
        }
        performRedirect('/login');
      }
    }
  }, [mounted, pathname, performRedirect]);

  useEffect(() => {
    if (mounted) {
      checkAuth();
    }
  }, [mounted, checkAuth]);

  // UI ขณะตรวจสอบ
  if (!mounted || isRedirecting) {
    return (
      <motion.main
        className="min-h-screen bg-[var(--background)] flex items-center justify-center text-[var(--foreground)] font-Prompt transition-colors duration-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(circle at 50% 20%, var(--primary)/${
              resolvedTheme === 'dark' ? '0.15' : '0.3'
            } 0%, transparent 50%)`,
            transition: 'background 0.3s ease',
          }}
        />
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex items-center gap-2 bg-[var(--card)]/95 backdrop-blur-xl border border-[var(--border)]/20 shadow-xl rounded-[var(--radius)] p-6"
          role="status"
          aria-live="polite"
        >
          <motion.div
            className="border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full w-6 h-6"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          />
          <span className="text-lg">
            {isRedirecting ? 'กำลังตรวจสอบสิทธิ์ผู้ใช้...' : 'กำลังเปลี่ยนเส้นทาง...'}
          </span>
        </motion.div>
      </motion.main>
    );
  }

  return null;
}