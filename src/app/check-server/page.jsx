'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi, faCheck, faRedo, faSignInAlt } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

export default function CheckServerPage() {
  const router = useRouter();
  const [isDown, setIsDown] = useState(true);
  const [progress, setProgress] = useState(0);
  const [lastChecked, setLastChecked] = useState(null);
  const [mounted, setMounted] = useState(false);

  const intervalRef = useRef(null);
  const progressRef = useRef(null);
  const redirectRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // ป้องกันย้อนกลับ
  useEffect(() => {
    const push = () => window.history.pushState(null, '', location.href);
    push();
    window.addEventListener('popstate', push);
    return () => window.removeEventListener('popstate', push);
  }, []);

  // ตรวจสอบเซิร์ฟเวอร์
  const checkHealth = async () => {
    setLastChecked(dayjs());
    const url = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${url}/api/healthz`, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok && isDown) {
        setIsDown(false);
        startProgress();
      }
    } catch {
      setIsDown(true);
      setProgress(0);
      if (progressRef.current) clearInterval(progressRef.current);
    }
  };

  const startProgress = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressRef.current);
          return 100;
        }
        return p + 2;
      });
    }, 30);
  };

  // ตรวจสอบทุก 7 วินาที
  useEffect(() => {
    checkHealth();
    intervalRef.current = setInterval(checkHealth, 7000);
    return () => {
      clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  // Redirect เมื่อเชื่อมต่อสำเร็จ
  useEffect(() => {
    if (progress === 100 && !isDown && !redirectRef.current) {
      redirectRef.current = true;
      setTimeout(() => {
        const jwt = sessionStorage.getItem('jwt');
        if (!jwt) {
          router.replace('/login');
          return;
        }

        // ตรวจสอบ JWT อย่างรวดเร็ว
        fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        })
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(data => {
            const role = (data?.role?.name || data?.data?.attributes?.role?.data?.attributes?.name)?.toLowerCase();
            const lastPath = sessionStorage.getItem('lastVisitedPath');

            const target = role === 'admin'
              ? '/admin/dashboard'
              : lastPath && !['/', '/check-server'].includes(lastPath)
                ? lastPath
                : '/welcome';

            router.replace(target);
          })
          .catch(() => {
            sessionStorage.clear();
            router.replace('/login');
          });
      }, 400);
    }
  }, [progress, isDown, router]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-8 text-center space-y-6">
          <AnimatePresence mode="wait">
            {isDown ? (
              <motion.div
                key="down"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <FontAwesomeIcon
                  icon={faWifi}
                  className="w-14 h-14 text-[var(--destructive)] animate-pulse"
                />
                <div>
                  <h1 className="text-xl font-semibold text-[var(--card-foreground)]">
                    ขาดการเชื่อมต่อ
                  </h1>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    กำลังพยายามเชื่อมต่อใหม่...
                  </p>
                </div>

                <div className="text-xs text-[var(--muted-foreground)]">
                  ตรวจสอบล่าสุด: {lastChecked?.format('HH:mm:ss') || '-'}
                </div>

                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={checkHealth}
                    size="sm"
                    variant="outline"
                    className="text-[var(--primary)] border-[var(--primary)] hover:bg-[var(--primary)]/5"
                  >
                    <FontAwesomeIcon icon={faRedo} className="w-3.5 h-3.5 mr-1.5" />
                    ลองใหม่
                  </Button>
                  <Button
                    onClick={() => router.replace('/login')}
                    size="sm"
                    variant="ghost"
                  >
                    <FontAwesomeIcon icon={faSignInAlt} className="w-3.5 h-3.5 mr-1.5" />
                    ล็อกอิน
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="up"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <FontAwesomeIcon
                  icon={faCheck}
                  className="w-14 h-14 text-[var(--primary)]"
                />
                <div>
                  <h1 className="text-xl font-semibold text-[var(--card-foreground)]">
                    เชื่อมต่อสำเร็จ
                  </h1>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    กำลังนำคุณกลับสู่ระบบ...
                  </p>
                </div>

                {/* Progress Circle */}
                <div className="relative w-20 h-20 mx-auto">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="10"
                    />
                    <motion.circle
                      cx="40" cy="40" r="34"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="10"
                      strokeDasharray="213.6"
                      initial={{ strokeDashoffset: 213.6 }}
                      animate={{ strokeDashoffset: 213.6 - (213.6 * progress) / 100 }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-[var(--card-foreground)]">
                      {progress}%
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  );
}