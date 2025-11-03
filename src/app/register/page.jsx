'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faLock, faCheck, faTimes, faEye, faEyeSlash, faUserPlus, faShieldAlt, faKey } from '@fortawesome/free-solid-svg-icons';

const MySwal = withReactContent(Swal);

// Define button animation variants
const buttonVariants = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('Weak');
  const [passwordScore, setPasswordScore] = useState(0);
  const [error, setError] = useState(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [emailTaken, setEmailTaken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const length = password.length >= 8;
    const uppercase = /[A-Z]/.test(password);
    const lowercase = /[a-z]/.test(password);
    const number = /\d/.test(password);
    const specialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    let score = 0;
    if (length) score += 20;
    if (uppercase) score += 20;
    if (lowercase) score += 20;
    if (number) score += 20;
    if (specialChar) score += 20;

    setPasswordScore(score);
    if (score >= 80) {
      setPasswordStrength('Strong');
    } else if (score >= 40) {
      setPasswordStrength('Medium');
    } else {
      setPasswordStrength('Weak');
    }
  }, [password]);

  const validateUsername = (value) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(value.trim());
  };

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const checkAvailability = async (field, value) => {
    if (!value.trim()) return;
    const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
    try {
      let endpoint = '';
      if (field === 'username') {
        endpoint = `${STRAPI_URL}/api/users?filters[username][$eq]=${value.trim()}`;
      } else if (field === 'email') {
        endpoint = `${STRAPI_URL}/api/users?filters[email][$eq]=${value.trim()}`;
      }
      const res = await fetch(endpoint, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      return (data.data || []).length > 0;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    const checkUsername = async () => {
      if (username.trim() && !validateUsername(username)) {
        setError('ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร a-z, A-Z, ตัวเลข 0-9, และ _ เท่านั้น ความยาว 3-20 ตัวอักษร');
        return;
      }
      if (username.trim()) {
        const isTaken = await checkAvailability('username', username);
        if (isTaken) {
          setError('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
          const baseName = username.trim().replace(/_\d+$/, '');
          const suggestions = [];
          for (let i = 1; i <= 3; i++) {
            suggestions.push(`${baseName}_${i}`);
          }
          setUsernameSuggestions(suggestions);
        } else {
          setError(null);
          setUsernameSuggestions([]);
        }
      }
    };
    checkUsername();
  }, [username]);

  useEffect(() => {
    const checkEmail = async () => {
      if (email.trim() && !validateEmail(email)) {
        setError('อีเมลไม่ถูกต้อง');
        setEmailTaken(false);
        return;
      }
      if (email.trim()) {
        const isTaken = await checkAvailability('email', email);
        setEmailTaken(isTaken);
        if (isTaken) {
          setError('อีเมลนี้ถูกใช้ไปแล้ว');
        } else if (!error || error.includes('ชื่อผู้ใช้')) {
          setError(null);
        }
      }
    };
    checkEmail();
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    const swalThemeProps = {
      customClass: {
        popup: 'shadow-xl rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 max-w-md w-full',
        title: 'text-xl font-bold text-[var(--card-foreground)] mb-2',
        htmlContainer: 'text-base text-[var(--muted-foreground)] mb-4',
        confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--primary)]/90 transition-all duration-300 transform hover:scale-105',
        cancelButton: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--secondary)]/90 transition-all duration-300 transform hover:scale-105',
        icon: 'text-[var(--primary)] border-0',
      },
      background: 'transparent',
    };

    try {
      if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        throw new Error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      }

      if (!validateUsername(username)) {
        throw new Error('ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร a-z, A-Z, ตัวเลข 0-9, และ _ เท่านั้น ความยาว 3-20 ตัวอักษร');
      }

      if (!validateEmail(email)) {
        throw new Error('อีเมลไม่ถูกต้อง');
      }

      if (emailTaken) {
        throw new Error('อีเมลนี้ถูกใช้ไปแล้ว');
      }

      if (await checkAvailability('username', username)) {
        throw new Error('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
      }

      if (passwordStrength !== 'Strong') {
        throw new Error('รหัสผ่านต้องอยู่ในระดับ "รัดกุม" (คะแนน 80% ขึ้นไป)');
      }

      if (password.trim() !== confirmPassword.trim()) {
        throw new Error('รหัสผ่านไม่ตรงกัน');
      }

      const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
      const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'อีเมลหรือชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
      }

      const { jwt, user } = data;
      sessionStorage.setItem('jwt', jwt);
      sessionStorage.setItem('userRole', user.role.name.toLowerCase());
      sessionStorage.setItem('userId', String(user.id));
      sessionStorage.setItem('username', user.username);
      window.dispatchEvent(new Event('session-updated'));

      await MySwal.fire({
        ...swalThemeProps,
        icon: 'success',
        title: 'สมัครสมาชิกสำเร็จ!',
        text: `ยินดีต้อนรับ ${user.username}!`,
        timer: 1000,
        showConfirmButton: false,
      });

      setTimeout(() => {
        router.push('/patient');
      }, 100);
    } catch (err) {
      setError(err.message);
      await MySwal.fire({
        ...swalThemeProps,
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-16 h-16 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[var(--background)]">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-md w-full bg-[var(--card)] rounded-[var(--radius)] shadow-2xl p-8 border border-[var(--border)] relative overflow-hidden"
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
            className="flex justify-center mb-4"
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg bg-[var(--primary)]">
              <FontAwesomeIcon icon={faUserPlus} className="w-10 h-10 text-[var(--primary-foreground)]" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold text-center mb-2 text-[var(--foreground)]">
            สร้างบัญชีผู้ใช้ใหม่
          </h1>
          <p className="text-center text-[var(--muted-foreground)]">
            สมัครสมาชิกเพื่อเริ่มจองวัคซีน
          </p>
        </div>

        {/* Error and Suggestions */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-[var(--radius)] shadow-sm bg-[var(--destructive)]/10 border border-[var(--destructive)]"
            >
              <div className="flex items-start">
                <FontAwesomeIcon icon={faTimes} className="w-5 h-5 mt-0.5 mr-2 text-[var(--destructive)]" />
                <p className="text-[var(--destructive)]">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {usernameSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-[var(--radius)] shadow-sm bg-[var(--secondary)] border border-[var(--border)]"
            >
              <p className="mb-2 text-[var(--foreground)]">
                ชื่อผู้ใช้นี้ถูกใช้แล้ว ลองใช้:
              </p>
              <div className="flex flex-wrap gap-2">
                {usernameSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setUsername(suggestion)}
                    className="px-3 py-1 rounded-[var(--radius)] text-sm font-medium transition-colors bg-[var(--primary)] text-[var(--primary-foreground)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {/* Username Field */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <FontAwesomeIcon 
                icon={faUser} 
                className="h-5 w-5 transition-colors" 
                style={{ 
                  color: focusedField === 'username' ? 'var(--primary)' : 'var(--muted-foreground)' 
                }} 
              />
            </div>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              className={`w-full pl-12 pr-4 py-3 border rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--card)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] ${
                focusedField === 'username' ? 'border-[var(--primary)] ring-[var(--ring)]' : 'border-[var(--border)]'
              }`}
              placeholder="ชื่อผู้ใช้"
              disabled={isLoading}
            />
            {username && validateUsername(username) && !error && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <FontAwesomeIcon icon={faCheck} className="h-5 w-5 text-[var(--primary)]" />
              </div>
            )}
          </div>

          {/* Email Field */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <FontAwesomeIcon 
                icon={faEnvelope} 
                className="h-5 w-5 transition-colors" 
                style={{ 
                  color: focusedField === 'email' ? 'var(--primary)' : 'var(--muted-foreground)' 
                }} 
              />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className={`w-full pl-12 pr-4 py-3 border rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--card)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] ${
                focusedField === 'email' ? 'border-[var(--primary)] ring-[var(--ring)]' : 'border-[var(--border)]'
              }`}
              placeholder="อีเมล"
              disabled={isLoading}
            />
            {email && validateEmail(email) && !emailTaken && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <FontAwesomeIcon icon={faCheck} className="h-5 w-5 text-[var(--primary)]" />
              </div>
            )}
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
              className={`w-full pl-12 pr-12 py-3 border rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--card)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] ${
                focusedField === 'password' ? 'border-[var(--primary)] ring-[var(--ring)]' : 'border-[var(--border)]'
              }`}
              placeholder="รหัสผ่าน"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--muted-foreground)]"
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-5 w-5" />
            </button>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 space-y-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--border)]">
                  <motion.div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${passwordScore}%`,
                      backgroundColor: passwordStrength === 'Weak' ? 'var(--destructive)' : 
                                     passwordStrength === 'Medium' ? '#F59E0B' : // Kept as is since no direct variable match
                                     'var(--primary)'
                    }}
                  ></motion.div>
                </div>
                <span
                  className="text-sm font-semibold w-20 text-right"
                  style={{ 
                    color: passwordStrength === 'Weak' ? 'var(--destructive)' : 
                           passwordStrength === 'Medium' ? '#F59E0B' : 
                           'var(--primary)'
                  }}
                >
                  {passwordStrength === 'Weak' ? 'อ่อน' : 
                   passwordStrength === 'Medium' ? 'ปานกลาง' : 
                   'รัดกุม'}
                </span>
              </div>
              <div className="text-xs space-y-1 text-[var(--muted-foreground)]">
                <p className="font-medium">รหัสผ่านควรประกอบด้วย:</p>
                <ul className="list-disc list-inside pl-3 space-y-1">
                  <li className={password.length >= 8 ? "line-through" : ""}>
                    ความยาวอย่างน้อย 8 ตัวอักษร
                  </li>
                  <li className={/[A-Z]/.test(password) ? "line-through" : ""}>
                    ตัวอักษรพิมพ์ใหญ่ (A-Z)
                  </li>
                  <li className={/[a-z]/.test(password) ? "line-through" : ""}>
                    ตัวอักษรพิมพ์เล็ก (a-z)
                  </li>
                  <li className={/\d/.test(password) ? "line-through" : ""}>
                    ตัวเลข (0-9)
                  </li>
                  <li className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "line-through" : ""}>
                    อักขระพิเศษ (เช่น !@#$)
                  </li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Confirm Password Field */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <FontAwesomeIcon 
                icon={faLock} 
                className="h-5 w-5 transition-colors" 
                style={{ 
                  color: focusedField === 'confirmPassword' ? 'var(--primary)' : 'var(--muted-foreground)' 
                }} 
              />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              className={`w-full pl-12 pr-12 py-3 border rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--card)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] ${
                focusedField === 'confirmPassword' ? 'border-[var(--primary)] ring-[var(--ring)]' : 'border-[var(--border)]'
              }`}
              placeholder="ยืนยันรหัสผ่าน"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--muted-foreground)]"
            >
              <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="h-5 w-5" />
            </button>
            {confirmPassword && password === confirmPassword && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <FontAwesomeIcon icon={faCheck} className="h-5 w-5 text-[var(--primary)]" />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading || passwordStrength !== 'Strong' || error || emailTaken}
            variants={buttonVariants}
            whileHover={isLoading ? {} : "hover"}
            whileTap={isLoading ? {} : "tap"}
            className={`w-full py-3 font-semibold rounded-[var(--radius)] shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden ${
              passwordStrength === 'Strong' && !error && !emailTaken 
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' 
                : 'bg-[var(--muted-foreground)] text-[var(--foreground)]'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center">
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--primary-foreground)] border-t-transparent rounded-full animate-spin mr-2"></div>
                  กำลังสมัคร...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faUserPlus} className="w-5 h-5 mr-2" />
                  สมัครสมาชิก
                </>
              )}
            </span>
            <motion.div
              className="absolute inset-0 bg-[var(--secondary)]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: isLoading ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm mt-8 relative z-10 text-[var(--muted-foreground)]">
          <p>
            มีบัญชีอยู่แล้ว?{' '}
            <Link
              href="/login"
              className="font-semibold transition-colors duration-300 text-[var(--primary)]"
            >
              เข้าสู่ระบบที่นี่
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
      </motion.div>
    </div>
  );
}