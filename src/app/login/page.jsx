'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faEye, faEyeSlash, faShieldAlt, faSyringe, faHeartPulse, faUserCircle, faArrowRight } from '@fortawesome/free-solid-svg-icons';

const MySwal = withReactContent(Swal);

// Define button animation variants
const buttonVariants = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const swalThemeProps = {
      customClass: {
        popup: 'shadow-xl rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 max-w-sm w-full',
        title: 'text-xl font-bold text-[var(--card-foreground)] mb-2',
        htmlContainer: 'text-base text-[var(--muted-foreground)] mb-4',
        confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--primary)]/90 transition-all duration-300 transform hover:scale-105',
        cancelButton: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--secondary)]/90 transition-all duration-300 transform hover:scale-105',
        icon: 'border-0',
      },
      background: 'transparent',
      showConfirmButton: true,
      confirmButtonText: 'ตกลง',
    };

    if (!identifier || !password) {
      await MySwal.fire({
        ...swalThemeProps,
        icon: 'warning',
        title: 'ข้อมูลไม่ครบ',
        text: 'กรุณากรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่าน',
      });
      setLoading(false);
      return;
    }

    try {
      const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
      const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password: password.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      const { jwt, user } = data;
      const userRole = user.role.name.toLowerCase();

      sessionStorage.setItem('jwt', jwt);
      sessionStorage.setItem('userRole', userRole);
      sessionStorage.setItem('userId', String(user.id));
      sessionStorage.setItem('username', user.username);

      window.dispatchEvent(new Event('session-updated'));

      await new Promise((resolve) => setTimeout(resolve, 300));

      let destination = '/';
      if (userRole === 'admin') {
        destination = '/admin/dashboard';
      } else if (userRole === 'patient') {
        destination = '/welcome';
      }

      router.push(destination, { scroll: false });
    } catch (err) {
      console.error('Login error:', err.message);
      await MySwal.fire({
        ...swalThemeProps,
        icon: 'error',
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        text: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <motion.div
          className="w-16 h-16 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[var(--background)]">
      {/* Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full opacity-10 bg-[var(--primary)]"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-10 bg-[var(--secondary)]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-10 bg-[var(--secondary)]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-md w-full bg-[var(--card)] rounded-[var(--radius)] shadow-2xl p-8 border border-[var(--border)] relative overflow-hidden z-10"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2326A69A' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
        </div>

        {/* Header Section */}
        <div className="relative z-10 mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg bg-[var(--primary)]">
                <FontAwesomeIcon icon={faUserCircle} className="w-12 h-12 text-[var(--primary-foreground)]" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-[var(--secondary)]">
                <FontAwesomeIcon icon={faShieldAlt} className="w-4 h-4 text-[var(--secondary-foreground)]" />
              </div>
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold text-center mb-2 text-[var(--foreground)]">
            เข้าสู่ระบบ
          </h1>
          <p className="text-center text-[var(--muted-foreground)]">
            กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          {/* Identifier Field */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <FontAwesomeIcon 
                icon={faUser} 
                className="h-5 w-5 transition-colors" 
                style={{ 
                  color: focusedField === 'identifier' ? 'var(--primary)' : 'var(--muted-foreground)' 
                }} 
              />
            </div>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onFocus={() => setFocusedField('identifier')}
              onBlur={() => setFocusedField(null)}
              className={`w-full pl-12 pr-4 py-3 border rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--card)] text-[var(--foreground)] ${
                focusedField === 'identifier' ? 'border-[var(--primary)] ring-[var(--ring)]' : 'border-[var(--border)]'
              }`}
              placeholder="ชื่อผู้ใช้หรืออีเมล"
              disabled={loading}
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <FontAwesomeIcon 
                icon={faLock} 
                className="h-5 w-5 transition-colors" 
                style={{ 
                  color: focusedField === 'password' ? 'var(--primary)' : 'var(--muted-foreground)' 
                }} 
              />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className={`w-full pl-12 pr-12 py-3 border rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--card)] text-[var(--foreground)] ${
                focusedField === 'password' ? 'border-[var(--primary)] ring-[var(--ring)]' : 'border-[var(--border)]'
              }`}
              placeholder="รหัสผ่าน"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--muted-foreground)]"
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-5 w-5" />
            </button>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            variants={buttonVariants}
            whileHover={loading ? {} : "hover"}
            whileTap={loading ? {} : "tap"}
            className={`w-full py-3 font-semibold rounded-[var(--radius)] shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden ${
              loading ? 'bg-[var(--muted-foreground)] text-[var(--foreground)]' : 'bg-[var(--primary)] text-[var(--primary-foreground)]'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--primary-foreground)] border-t-transparent rounded-full animate-spin mr-2"></div>
                  กำลังตรวจสอบ...
                </>
              ) : (
                <>
                  เข้าสู่ระบบ
                  <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5 ml-2" />
                </>
              )}
            </span>
            <motion.div
              className="absolute inset-0 bg-[var(--secondary)]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: loading ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm mt-8 relative z-10 text-[var(--muted-foreground)]">
          <p>
            ยังไม่มีบัญชี?{' '}
            <Link
              href="/register"
              className="font-semibold transition-colors duration-300 text-[var(--primary)]"
            >
              สมัครสมาชิกที่นี่
            </Link>
          </p>
        </div>

        {/* Security Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-6 flex items-center justify-center text-xs relative z-10 text-[var(--muted-foreground)]"
        >
          <FontAwesomeIcon icon={faShieldAlt} className="w-4 h-4 mr-2" />
          <span>ข้อมูลของคุณจะถูกเก็บเป็นความลับและปลอดภัย</span>
        </motion.div>

        {/* Floating Icons */}
        <div className="absolute -top-8 -left-8 opacity-20">
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <FontAwesomeIcon icon={faSyringe} className="w-12 h-12 text-[var(--primary)]" />
          </motion.div>
        </div>
        <div className="absolute -top-6 -right-6 opacity-20">
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          >
            <FontAwesomeIcon icon={faHeartPulse} className="w-10 h-10 text-[var(--secondary)]" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}