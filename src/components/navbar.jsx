'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFlask,
  faCalendar,
  faArrowRightFromBracket,
  faUser,
  faHome,
} from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import ThemeToggleButton from './ThemeToggleButton';

// Custom Hook for Session Management (ไม่มี Swal)
const useSession = (router, pathname) => {
  const [session, setSession] = useState({
    isAuthenticated: false,
    userRole: null,
    username: '',
    loading: true,
  });

  const redirectingRef = useRef(false);
  const isCheckingRef = useRef(false);
  const abortControllerRef = useRef(null);

  const checkSession = useCallback(async () => {
    if (redirectingRef.current || isCheckingRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    isCheckingRef.current = true;
    setSession((prev) => ({ ...prev, loading: true }));

    try {
      const jwt = sessionStorage.getItem('jwt');
      const storedUserRole = sessionStorage.getItem('userRole');
      const storedUsername = sessionStorage.getItem('username');
      const storedUserId = sessionStorage.getItem('userId');

      if (jwt && storedUserRole && storedUsername && storedUserId && ['admin', 'patient'].includes(storedUserRole)) {
        setSession({
          isAuthenticated: true,
          userRole: storedUserRole,
          username: storedUsername,
          loading: false,
        });

        if (pathname?.startsWith('/login') || pathname?.startsWith('/register')) {
          const destination = storedUserRole === 'admin' ? '/admin/dashboard' : '/welcome';
          redirectingRef.current = true;
          router.push(destination);
          setTimeout(() => (redirectingRef.current = false), 1000);
        }
        return;
      }

      if (!jwt) throw new Error('No JWT found');

      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`, {
        headers: { Authorization: `Bearer ${jwt}` },
        signal,
      });

      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Unauthorized' : `HTTP Error: ${res.status}`);
      }

      const data = await res.json();
      const roleName = data?.role?.name?.toLowerCase() ||
                       data?.data?.attributes?.role?.data?.attributes?.name?.toLowerCase() ||
                       null;
      const userId = data?.id || data?.data?.id;
      const fetchedUsername = data?.username || 'ผู้ใช้';

      if (!roleName || !userId || !['admin', 'patient'].includes(roleName)) {
        throw new Error('Invalid user data');
      }

      sessionStorage.setItem('userRole', roleName);
      sessionStorage.setItem('userId', userId);
      sessionStorage.setItem('username', fetchedUsername);

      setSession({
        isAuthenticated: true,
        userRole: roleName,
        username: fetchedUsername,
        loading: false,
      });

      if (pathname?.startsWith('/login') || pathname?.startsWith('/register')) {
        const destination = roleName === 'admin' ? '/admin/dashboard' : '/welcome';
        redirectingRef.current = true;
        router.push(destination);
        setTimeout(() => (redirectingRef.current = false), 1000);
      }
    } catch (error) {
      if (error.name === 'AbortError') return;

      sessionStorage.clear();
      window.dispatchEvent(new Event('session-updated'));

      setSession({
        isAuthenticated: false,
        userRole: null,
        username: '',
        loading: false,
      });

      if (!pathname?.startsWith('/login') && !pathname?.startsWith('/register')) {
        redirectingRef.current = true;
        router.push('/login');
        setTimeout(() => (redirectingRef.current = false), 1000);
      }
    } finally {
      isCheckingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [router, pathname]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const handleSessionUpdate = () => {
      if (!isCheckingRef.current) {
        checkSession();
      }
    };
    window.addEventListener('session-updated', handleSessionUpdate);
    return () => window.removeEventListener('session-updated', handleSessionUpdate);
  }, [checkSession]);

  return session;
};

// User Dropdown Component – แก้ hover ไม่มีพื้นหลังขาว
function UserDropdown({ username, userRole, onLogout, isMobile }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  const roleLabel = userRole === 'admin' ? 'ผู้ดูแล' : 'ผู้ป่วย';
  const buttonClass = isMobile
    ? 'flex flex-col items-center gap-1 p-3 rounded-[var(--radius)] text-[var(--foreground)]'
    : 'flex items-center gap-3 p-2 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md hover:shadow-lg transition-shadow';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ปุ่มเปิดเมนู – ลบพื้นหลังขาว */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${buttonClass} focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all duration-200 cursor-pointer font-prompt`}
        whileHover={{ scale: isMobile ? 1.1 : 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`เปิดเมนูผู้ใช้ของ ${username}`}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-[var(--secondary)] rounded-full font-bold text-[var(--secondary-foreground)]">
          {username.charAt(0).toUpperCase()}
        </div>
        {isMobile ? (
          <span className="text-xs font-medium">โปรไฟล์</span>
        ) : (
          <span className="hidden md:block text-sm font-medium">โปรไฟล์</span>
        )}
      </motion.button>

      {isOpen && (
        <motion.div
          className={`absolute ${isMobile ? 'top-[-120px] right-0 w-48' : 'right-0 mt-2 w-60'} rounded-[var(--radius)] bg-[var(--background)] shadow-2xl ring-1 ring-[var(--ring)]/10 overflow-hidden z-50 font-prompt`}
          initial={{ opacity: 0, scale: 0.95, y: isMobile ? -10 : 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: isMobile ? -10 : 10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="p-4 flex flex-col gap-3">
            <div className="px-3 py-2 text-sm text-[var(--card-foreground)]">
              <p className="font-semibold text-[var(--foreground)]">โปรไฟล์: {username}</p>
              <p className="text-[var(--muted-foreground)]">บทบาท: {roleLabel}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--destructive)] rounded-[var(--radius)] hover:bg-[var(--accent)]/10 hover:shadow-sm transition-all duration-200 w-full cursor-pointer font-prompt"
              aria-label="ออกจากระบบ"
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="h-5 w-5 text-[var(--destructive)]" />
              ออกจากระบบ
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Navigation Link Component – แก้ hover ไม่มีพื้นหลังขาว
const NavLink = ({ href, icon, label, isActive, isMobile = false }) => (
  <motion.div whileHover={{ scale: isMobile ? 1.15 : 1.05 }} whileTap={{ scale: 0.95 }}>
    <Link
      href={href}
      className={`
        flex ${isMobile ? 'flex-col items-center gap-1 p-3 text-xs' : 'items-center gap-3 px-4 py-2 text-sm font-medium'}
        ${isActive
          ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold shadow-sm'
          : 'text-[var(--foreground)] hover:text-[var(--primary)] hover:shadow-md'}
        rounded-[var(--radius)] transition-all duration-200 cursor-pointer font-prompt
        focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
      `}
      aria-label={`ไปที่${label}`}
    >
      <FontAwesomeIcon
        icon={icon}
        className={`h-${isMobile ? '7' : '5'} w-${isMobile ? '7' : '5'} ${isActive ? 'text-[var(--primary-foreground)] scale-110' : ''}`}
      />
      {label}
    </Link>
  </motion.div>
);

// Main Navbar Component
export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const { isAuthenticated, userRole, username, loading } = useSession(router, pathname);

  const logout = useCallback(() => {
    sessionStorage.clear();
    window.dispatchEvent(new Event('session-updated'));
    router.push('/login');
  }, [router]);

  const getLinkClass = useCallback(
    (href) => pathname === href || (href !== '/' && pathname?.startsWith(href)),
    [pathname]
  );

  const navLinks = useMemo(() => ({
    admin: [{ href: '/admin/dashboard', icon: faUser, label: 'แดชบอร์ดแอดมิน' }],
    patient: [
      { href: '/vaccines', icon: faFlask, label: 'วัคซีน' },
      { href: '/appointment', icon: faCalendar, label: 'ใบนัด' },
    ],
  }), []);

  if (loading) {
    return (
      <motion.div
        className="flex items-center justify-center h-16 bg-[var(--background)] border-b border-[var(--border)]/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="w-8 h-8 border-4 rounded-full border-[var(--border)]/20 border-t-[var(--primary)]"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      </motion.div>
    );
  }

  return (
    <motion.nav
      className="w-full bg-[var(--background)] border-b border-[var(--border)]/10 shadow-sm relative font-prompt"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, #a5f0eb/${resolvedTheme === 'dark' ? '0.05' : '0.1'}, transparent 100%)`,
          transition: 'background 0.3s ease, opacity 0.3s ease',
        }}
      />
      {/* Desktop Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hidden md:flex items-center justify-between h-16 relative z-10">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link href="/vaccines" className="flex items-center gap-3 cursor-pointer" aria-label="ไปที่หน้าแรก">
            <div className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-md">
              <span className="text-xl font-bold text-[var(--primary-foreground)]">V</span>
            </div>
            <span className="text-lg font-semibold text-[var(--foreground)]">Vaccine Booking System</span>
          </Link>
        </motion.div>
        <div className="flex items-center gap-8">
          {isAuthenticated && userRole && navLinks[userRole]?.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              isActive={getLinkClass(link.href)}
            />
          ))}
          {isAuthenticated && userRole === 'admin' && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <ThemeToggleButton />
            </motion.div>
          )}
          {isAuthenticated ? (
            <UserDropdown username={username} userRole={userRole} onLogout={logout} isMobile={false} />
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/login"
                className="flex items-center gap-3 px-4 py-2 text-sm bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] hover:bg-[var(--primary)]/90 shadow-md transition-all duration-200 cursor-pointer font-prompt focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                aria-label="ไปที่หน้าเข้าสู่ระบบ"
              >
                <FontAwesomeIcon icon={faArrowRightFromBracket} className="h-5 w-5" />
                เข้าสู่ระบบ
              </Link>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <motion.div
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)]/10 shadow-lg flex justify-around items-center h-16 px-4 z-10 font-prompt"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <NavLink
          href="/"
          icon={faHome}
          label="หน้าแรก"
          isActive={getLinkClass('/')}
          isMobile
        />
        {isAuthenticated && userRole && navLinks[userRole]?.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            icon={link.icon}
            label={link.label}
            isActive={getLinkClass(link.href)}
            isMobile
          />
        ))}
        {isAuthenticated ? (
          <UserDropdown username={username} userRole={userRole} onLogout={logout} isMobile />
        ) : (
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/login"
              className="flex flex-col items-center gap-1 p-3 text-xs bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] hover:bg-[var(--primary)]/90 transition-all duration-200 cursor-pointer font-prompt focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              aria-label="ไปที่หน้าเข้าสู่ระบบ"
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="h-7 w-7" />
              เข้าสู่ระบบ
            </Link>
          </motion.div>
        )}
      </motion.div>
    </motion.nav>
  );
}