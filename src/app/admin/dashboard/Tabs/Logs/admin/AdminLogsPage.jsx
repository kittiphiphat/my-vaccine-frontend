'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import {
  Bars3Icon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState(null);
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const fetchUser = async () => {
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`,
          { withCredentials: true }
        );
        const user = data || {};
        const roleName = user.role ? (typeof user.role === 'string' ? user.role : user.role?.name || null) : null;
        setUsername(user.username || user.email || '');
        setRole(roleName);
        setIsLoggedIn(true);
        if (pathname === '/login') {
          router.push(roleName?.toLowerCase() === 'admin' ? '/admin/dashboard' : '/welcome');
        }
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
        setIsLoggedIn(false);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
    window.addEventListener('user-logged-in', fetchUser);
    return () => window.removeEventListener('user-logged-in', fetchUser);
  }, [router, pathname]);

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
      setIsLoggedIn(false);
      setRole(null);
      setUsername('');
      setOpen(false);
      router.push('/login');
    } catch (error) {
      setIsLoggedIn(false);
      setRole(null);
      setUsername('');
      setOpen(false);
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getMenuItems = () => {
    if (!isLoggedIn) return [];
    const isVaccineDetailPage = /^\/vaccines\/[^/]+$/.test(pathname);
    const isAppointmentDetailPage = /^\/appointment\/[^/]+$/.test(pathname);

    if (role?.toLowerCase() === 'admin') {
      return [{ href: '/admin/dashboard', label: 'แดชบอร์ด', icon: HomeIcon }];
    }
    if (isVaccineDetailPage) {
      return [{ href: pathname, label: 'จองวัคซีน', icon: CalendarIcon }];
    }
    if (isAppointmentDetailPage) {
      return [{ href: pathname, label: 'รายละเอียดใบนัด', icon: ClipboardDocumentCheckIcon }];
    }
    return [
      { href: '/vaccines', label: 'วัคซีน', icon: CalendarIcon },
      { href: '/appointment', label: 'ใบนัดของฉัน', icon: ClipboardDocumentCheckIcon },
    ];
  };

  if (!mounted || isLoading) {
    return (
      <div
        className="p-6 text-center font-medium"
        style={{
          backgroundColor: theme === 'dark' ? '#2E7D32' : '#A5D6A7',
          color: theme === 'dark' ? '#1C1C18' : '#FFFFFF',
        }}
      >
        กำลังโหลด...
      </div>
    );
  }

  const isActive = (href) => pathname === href;
  const menuItems = getMenuItems();

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative w-full px-6 py-4 shadow-md transition-colors duration-300"
      style={{
        background: theme === 'dark' ? '#2E7D32' : '#A5D6A7',
        color: theme === 'dark' ? '#1C1C18' : '#FFFFFF',
      }}
      role="navigation"
      aria-label="เมนูหลัก"
    >
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3" aria-label="หน้าแรก">
          <Image
            src="/medcmu.png"
            alt="MedCMU Logo"
            width={140}
            height={48}
            quality={100}
            priority
            className="object-contain"
            style={{
              filter: theme === 'dark' ? 'brightness(0.8)' : 'brightness(1.2)',
            }}
          />
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-4">
            {menuItems.map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-base font-semibold transition-all duration-300
                    ${isActive(item.href)
                      ? 'bg-[#1C1C18] text-white shadow-sm'
                      : theme === 'dark'
                        ? 'text-[#000000] hover:bg-[#1C1C18]/20 hover:text-[#1C1C18]'
                        : 'text-[#FFFFFF] hover:bg-[#1C1C18]/20 hover:text-[#1C1C18]'
                    }`}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  aria-label={`ไปที่ ${item.label}`}
                >
                  <item.icon
                    className={`h-5 w-5 ${isActive(item.href) ? 'text-white' : theme === 'dark' ? 'text-[#000000]' : 'text-[#FFFFFF]'}`}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full text-white focus:outline-none focus:ring-2 focus:ring-[#1C1C18] transition-all duration-300"
              style={{ backgroundColor: '#1C1C18' }}
              aria-label={theme === 'dark' ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
            >
              {theme === 'dark' ? (
                <SunIcon className="h-5 w-5 text-white" aria-hidden="true" />
              ) : (
                <MoonIcon className="h-5 w-5 text-white" aria-hidden="true" />
              )}
            </motion.button>

            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div
                  className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-full text-white text-base font-medium max-w-[160px] truncate"
                  style={{ backgroundColor: '#1C1C18' }}
                  aria-label={`ผู้ใช้: ${username}`}
                >
                  <UserIcon className="h-5 w-5 text-white" aria-hidden="true" />
                  <span className="truncate">{username}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={logout}
                  disabled={isLoggingOut}
                  className={`hidden lg:flex px-4 py-2 rounded-full text-base font-semibold text-white shadow-sm transition-all duration-300 items-center gap-2 ${
                    isLoggingOut ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2C2C2A]'
                  }`}
                  style={{ backgroundColor: '#1C1C18' }}
                  aria-label="ออกจากระบบ"
                >
                  <ArrowLeftOnRectangleIcon
                    className="h-5 w-5 text-white"
                    aria-hidden="true"
                  />
                  {isLoggingOut ? 'กำลังออก...' : 'ออกจากระบบ'}
                </motion.button>
              </div>
            ) : (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="hidden lg:block">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-full text-base font-semibold text-white shadow-sm transition-all duration-300 flex items-center gap-2 hover:bg-[#2C2C2A]"
                  style={{ backgroundColor: '#1C1C18' }}
                  aria-label="เข้าสู่ระบบ"
                >
                  <ArrowRightOnRectangleIcon
                    className="h-5 w-5 text-white"
                    aria-hidden="true"
                  />
                  เข้าสู่ระบบ
                </Link>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 rounded-full focus-outline-none focus:ring-2 focus:ring-[#1C1C18] transition-all duration-300"
              style={{ backgroundColor: '#1C1C18' }}
              aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
              aria-expanded={open}
            >
              {open ? (
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              ) : (
                <Bars3Icon className="h-6 w-6 text-white" aria-hidden="true" />
              )}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="lg:hidden fixed inset-0 top-16 z-40 backdrop-blur-lg transition-colors duration-300"
              style={{ backgroundColor: theme === 'dark' ? 'rgba(46, 125, 50, 0.8)' : 'rgba(165, 214, 167, 0.8)' }}
            >
              <div className="flex flex-col h-[calc(100%-64px)] p-6 overflow-y-auto">
                <div className="flex justify-between items-center p-4">
                  <Image
                    src="/medcmu.png"
                    alt="MedCMU Logo"
                    width={120}
                    height={40}
                    quality={100}
                    className="object-contain"
                    style={{
                      filter: theme === 'dark' ? 'brightness(0.8)' : 'brightness(1.2)',
                    }}
                  />
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-full text-white focus:outline-none focus:ring-2 focus:ring-[#1C1C18] transition-all duration-300"
                    style={{ backgroundColor: '#1C1C18' }}
                  >
                    <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex flex-col gap-3 mt-6">
                  {menuItems.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-full text-lg font-medium transition-all duration-300
                          ${isActive(item.href)
                            ? 'bg-[#1C1C18] text-white shadow-sm'
                            : theme === 'dark'
                              ? 'text-[#000000] hover:bg-[#1C1C18]/20 hover:text-[#1C1C18]'
                              : 'text-[#FFFFFF] hover:bg-[#1C1C18]/20 hover:text-[#1C1C18]'
                          }`}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                        aria-label={`ไปที่ ${item.label}`}
                      >
                        <item.icon
                          className={`h-6 w-6 ${isActive(item.href) ? 'text-white' : theme === 'dark' ? 'text-[#000000]' : 'text-[#FFFFFF]'}`}
                          aria-hidden="true"
                        />
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-auto p-4 border-t"
                     style={{ borderColor: '#1C1C1820' }}
                >
                  {isLoggedIn ? (
                    <>
                      <div
                        className="flex items-center gap-3 px-4 py-3 rounded-full text-white text-lg font-medium mb-3"
                        style={{ backgroundColor: '#1C1C18' }}
                        aria-label={`ผู้ใช้: ${username}`}
                      >
                        <UserIcon className="h-6 w-6 text-white" aria-hidden="true" />
                        <span className="truncate">{username}</span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          logout();
                          setOpen(false);
                        }}
                        disabled={isLoggingOut}
                        className={`w-full px-4 py-3 rounded-full text-lg font-semibold text-white shadow-sm transition-all duration-300 ${
                          isLoggingOut ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2C2C2A]'
                        }`}
                        style={{ backgroundColor: '#1C1C18' }}
                        aria-label="ออกจากระบบ"
                      >
                        <ArrowLeftOnRectangleIcon
                          className="h-6 w-6 mr-2 inline text-white"
                          aria-hidden="true"
                        />
                        {isLoggingOut ? 'กำลังออก...' : 'ออกจากระบบ'}
                      </motion.button>
                    </>
                  ) : (
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className="w-full px-4 py-3 rounded-full text-lg font-semibold text-white shadow-sm transition-all duration-300 flex items-center gap-3 hover:bg-[#2C2C2A]"
                        style={{ backgroundColor: '#1C1C18' }}
                        aria-label="เข้าสู่ระบบ"
                      >
                        <ArrowRightOnRectangleIcon
                          className="h-6 w-6 text-white"
                          aria-hidden="true"
                        />
                        เข้าสู่ระบบ
                      </Link>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}