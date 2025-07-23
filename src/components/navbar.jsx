'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  LogIn,
  LogOut,
  Syringe,
  ClipboardPlus,
  Menu,
  X,
  UserRound
} from 'lucide-react';

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const fetchUser = async () => {
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`,
          { withCredentials: true }
        );

        const user = data || {};
        const roleName =
          typeof user.role === 'string' ? user.role : user.role?.name || null;

        setUsername(user.username || user.email || '');
        setRole(roleName);
        setIsLoggedIn(true);

        if (window.location.pathname === '/login') {
          router.push(roleName === 'Admin' ? '/admin/dashboard' : '/welcome');
        }
      } catch {
        setIsLoggedIn(false);
      }
    };

    fetchUser();
    window.addEventListener('user-logged-in', fetchUser);
    return () => window.removeEventListener('user-logged-in', fetchUser);
  }, [router]);

  const logout = async () => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
      setIsLoggedIn(false);
      setOpen(false);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!mounted) return null;

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (isLoggedIn && role === 'Admin') {
      router.push('/admin/dashboard');
    } else if (isLoggedIn) {
      router.push('/vaccines');
    } else {
      router.push('/welcome');
    }
  };

  return (
    <nav className="bg-[#30266D] sticky top-0 z-50 shadow-md border-b border-[#1f1b47]">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <a href="#" onClick={handleLogoClick} className="flex items-center">
          <Image
            src="https://res.cloudinary.com/dksk7exum/image/upload/v1753158107/medcmu_25ea52b67a.png"
            width={160}
            height={80}
            quality={100}
            alt="Logo"
            className="transition-transform duration-300 transform hover:scale-110"
          />
        </a>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-white font-medium">
          {isLoggedIn && role === 'Admin' ? (
            <Link
              href="/admin/dashboard"
              className="hover:text-[#F9669D] transition duration-200"
            >
              แดชบอร์ด Admin
            </Link>
          ) : (
            <>
              <Link
                href="/vaccines"
                className="flex items-center gap-1 hover:text-[#F9669D] transition"
              >
                <Syringe size={20} /> วัคซีน
              </Link>
              <Link
                href="/appointment"
                className="flex items-center gap-1 hover:text-[#F9669D] transition"
              >
                <ClipboardPlus size={20} /> ใบนัดของฉัน
              </Link>
            </>
          )}

          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 flex items-center justify-center bg-[#F9669D] text-white rounded-full shadow-md">
                  <UserRound size={20} />
                </div>
                <span className="text-base">{username}</span>
              </div>
              <button
                onClick={logout}
                className="bg-[#F9669D] text-white px-4 py-2 rounded-full font-semibold hover:bg-[#e65f87] transition flex items-center gap-2"
              >
                <LogOut size={18} /> ออกจากระบบ
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-[#F9669D] text-white px-5 py-2 rounded-full font-bold shadow hover:bg-[#e65f87] transition flex items-center gap-1"
            >
              <LogIn size={18} /> เข้าสู่ระบบ
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button onClick={() => setOpen(!open)} className="text-white">
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#30266D] text-white px-6 py-6 space-y-6 font-medium border-t border-[#1f1b47] rounded-b-xl">
          {isLoggedIn && role !== 'Admin' && (
            <>
              <Link
                href="/vaccines"
                onClick={() => setOpen(false)}
                className="block py-2 px-4 rounded hover:bg-[#F9669D]/30"
              >
                วัคซีน
              </Link>
              <Link
                href="/appointment"
                onClick={() => setOpen(false)}
                className="block py-2 px-4 rounded hover:bg-[#F9669D]/30"
              >
                ใบนัดของฉัน
              </Link>
            </>
          )}
          {isLoggedIn ? (
            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="w-full bg-[#F9669D] text-[#30266D] py-3 rounded-full font-bold flex justify-center items-center gap-2"
            >
              <LogOut size={20} /> ออกจากระบบ
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="w-full bg-[#F9669D] text-[#30266D] py-3 rounded-full font-bold flex justify-center items-center gap-2"
            >
              <LogIn size={20} /> เข้าสู่ระบบ
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}