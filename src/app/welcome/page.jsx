'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartPulse, faPaperPlane, faSyringe, faShieldVirus, faUserCircle } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { cn } from '@/lib/utils';

// Animation Variants
const cardVariants = {
  initial: { opacity: 0, scale: 0.9, y: 30 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.9, y: -30, transition: { duration: 0.3 } },
};

const buttonVariants = {
  hover: { scale: 1.03, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)' },
  tap: { scale: 0.97 },
};

const floatingVariants = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

const textVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const backgroundVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: { duration: 1.5, ease: 'easeInOut' } 
  }
};

export default function Welcome() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [mounted, setMounted] = useState(false);

  const checkLoginAndPatient = useCallback(async () => {
    try {
      const jwt = sessionStorage.getItem('jwt');
      const role = sessionStorage.getItem('userRole');
      const storedUsername = sessionStorage.getItem('username');
      const storedUserId = sessionStorage.getItem('userId');

      if (!jwt || !role || !storedUserId || !['admin', 'patient'].includes(role)) {
        console.warn('Welcome: Invalid or incomplete session, redirecting to login');
        router.replace('/login', { scroll: false });
        setLoading(false);
        return;
      }

      setUserRole(role);
      setUserId(storedUserId);
      setUsername(storedUsername || 'ผู้ใช้');

      if (role === 'patient') {
        const patientRes = await axios.get(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients?filters[user][id][$eq]=${storedUserId}&populate=user`,
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
              Expires: '0',
            },
            timeout: 5000,
          }
        );

        const patientData = patientRes.data;
        const patientList = patientData.data || patientData;
        const hasPatient = Array.isArray(patientList) && patientList.length > 0;

        if (!hasPatient) {
          setShowWelcome(false);
          setTimeout(() => router.replace('/patient', { scroll: false }), 0);
          return;
        }
      }

      setShowWelcome(true);
    } catch (error) {
      console.error('Welcome: Error during patient data check:', error);
      let errorMessage = 'ไม่สามารถตรวจสอบข้อมูลผู้ใช้ได้ กรุณาลองใหม่';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error?.message || error.message;
        if (error.response?.status === 401) {
          sessionStorage.clear();
          window.dispatchEvent(new Event('session-updated'));
          router.replace('/login', { scroll: false });
          return;
        }
      }
      router.replace('/login', { scroll: false });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    checkLoginAndPatient();
  }, [checkLoginAndPatient]);

  const handleEnter = () => {
    setIsEntering(true);
    setTimeout(() => {
      if (userRole === 'admin') router.push('/admin/dashboard');
      else if (userRole === 'patient') router.push('/vaccines');
      else router.push('/login');
    }, 800);
  };

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] font-prompt transition-colors duration-300 overflow-hidden relative">
      {/* Simple Background Pattern */}
      <motion.div
        variants={backgroundVariants}
        initial="initial"
        animate="animate"
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-20 left-20 w-64 h-64 bg-[var(--primary)]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[var(--secondary)]/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[var(--accent)]/5 rounded-full blur-3xl"></div>
      </motion.div>

      <div className="flex-grow flex items-center justify-center px-4 sm:px-6 py-12 relative z-10">
        <AnimatePresence>
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <motion.div
                className="relative w-16 h-16 sm:w-20 sm:h-20"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <div className="absolute inset-0 rounded-full border-4 border-[var(--primary)]/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--primary)] border-r-[var(--primary)]"></div>
                <FontAwesomeIcon
                  icon={faHeartPulse}
                  className="absolute inset-0 m-auto w-8 h-8 sm:w-10 sm:h-10 text-[var(--primary)]"
                />
              </motion.div>
              <p className="mt-6 text-base font-medium text-[var(--primary)]">
                กำลังตรวจสอบข้อมูล...
              </p>
            </motion.div>
          ) : showWelcome ? (
            <motion.div
              key="welcome"
              variants={cardVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative bg-[var(--card)]/80 backdrop-blur-md rounded-[var(--radius)] shadow-xl max-w-[95vw] sm:max-w-md lg:max-w-lg w-full p-6 sm:p-8 lg:p-10 text-center border border-[var(--border)]"
            >
              {/* Simple Top Border */}
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)] rounded-t-[var(--radius)]"></div>
              
              {/* Floating Icons */}
              <div className="absolute -top-8 -left-8 opacity-20">
                <motion.div variants={floatingVariants} initial="initial" animate="animate">
                  <FontAwesomeIcon icon={faSyringe} className="w-12 h-12 text-[var(--primary)]" />
                </motion.div>
              </div>
              <div className="absolute -top-6 -right-6 opacity-20">
                <motion.div 
                  variants={floatingVariants} 
                  initial="initial" 
                  animate="animate" 
                  transition={{ delay: 1 }}
                >
                  <FontAwesomeIcon icon={faShieldVirus} className="w-10 h-10 text-[var(--secondary)]" />
                </motion.div>
              </div>
              <div className="absolute -bottom-6 -left-6 opacity-20">
                <motion.div 
                  variants={floatingVariants} 
                  initial="initial" 
                  animate="animate" 
                  transition={{ delay: 2 }}
                >
                  <FontAwesomeIcon icon={faHeartPulse} className="w-10 h-10 text-[var(--accent)]" />
                </motion.div>
              </div>

              {/* User Avatar */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[var(--primary)] flex items-center justify-center text-3xl font-bold text-[var(--primary-foreground)] shadow-lg">
                    <FontAwesomeIcon icon={faUserCircle} className="w-12 h-12 sm:w-14 sm:h-14" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center shadow-md">
                    <FontAwesomeIcon icon={faHeartPulse} className="w-4 h-4 text-[var(--primary-foreground)]" />
                  </div>
                </div>
              </motion.div>

              {/* Welcome Text */}
              <motion.h1
                variants={textVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.3 }}
                className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--primary)] mb-4"
              >
                ยินดีต้อนรับสู่ระบบจองวัคซีน
              </motion.h1>
              
              <motion.p
                variants={textVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.4 }}
                className="text-base sm:text-lg text-[var(--foreground)]/80 mb-8 leading-relaxed"
              >
                สวัสดี, <span className="font-semibold text-[var(--primary)]">{username}</span>
                <br />
                จองวัคซีนและดูแลสุขภาพของคุณได้อย่างง่ายดาย
              </motion.p>

              {/* Action Button */}
              <motion.button
                onClick={handleEnter}
                disabled={isEntering}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className={cn(
                  'w-full px-6 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-[var(--radius)] transition-all duration-300 flex items-center justify-center gap-3 shadow-lg focus:ring-4 focus:ring-[var(--ring)]/20 focus:ring-offset-2 focus:ring-offset-[var(--background)] min-h-[52px] relative overflow-hidden',
                  isEntering
                    ? 'bg-[var(--muted-foreground)] text-[var(--muted-foreground)] cursor-not-allowed'
                    : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 hover:shadow-xl'
                )}
                aria-label={isEntering ? 'กำลังดำเนินการ' : 'เริ่มจองวัคซีน'}
              >
                {isEntering ? (
                  <span className="flex items-center justify-center gap-3">
                    <motion.div
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-[var(--primary-foreground)]/30 border-t-[var(--primary-foreground)]"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    กำลังดำเนินการ...
                  </span>
                ) : (
                  <>
                    เริ่มจองวัคซีน
                    <FontAwesomeIcon icon={faPaperPlane} className="w-5 h-5" />
                  </>
                )}
              </motion.button>

              {/* Additional Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-8 flex items-center justify-center gap-6 text-xs sm:text-sm text-[var(--muted-foreground)]"
              >
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faShieldVirus} className="w-4 h-4" />
                  <span>ปลอดภัย</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faHeartPulse} className="w-4 h-4" />
                  <span>ดูแลสุขภาพ</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faSyringe} className="w-4 h-4" />
                  <span>ง่ายและสะดวก</span>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}