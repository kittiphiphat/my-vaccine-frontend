'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faHospital, faPhone, faGlobe, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const MySwal = withReactContent(Swal);

const buttonVariants = {
  hover: { scale: 1.02, boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)' },
  tap: { scale: 0.98 },
};

export default function HospitelEdit({ hospitel, onSave, onCancel, isNew = false }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    website: '',
    warningtext: '',
    subwarningtext: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (hospitel && !isNew) {
      setForm({
        name: hospitel.name || '',
        phone: hospitel.phone || '',
        website: hospitel.website || '',
        warningtext: hospitel.warningtext || '',
        subwarningtext: hospitel.subwarningtext || '',
      });
    }
  }, [hospitel, isNew]);

  async function validateAuth() {
    const token = sessionStorage.getItem('jwt');
    if (!token) {
      throw new Error('Unauthorized');
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Unauthorized' : `HTTP Error: ${res.status}`);
      }
      const data = await res.json();
      const roleName =
        data?.role?.name?.toLowerCase() || data?.data?.attributes?.role?.data?.attributes?.name?.toLowerCase() || null;
      const userId = data?.id || data?.data?.id;
      const username = data?.username || 'Admin';

      if (!roleName || !userId) {
        throw new Error('Invalid user data');
      }

      if (roleName !== 'admin') {
        throw new Error('Forbidden: Admin access required');
      }

      sessionStorage.setItem('userRole', roleName);
      sessionStorage.setItem('userId', userId);
      sessionStorage.setItem('username', username);
    } catch (err) {
      console.error('HospitelEdit - Validate Auth Error:', err.message, err.stack);
      throw new Error(err.message === 'Unauthorized' ? 'Unauthorized' : 'Forbidden: Admin access required');
    }
  }

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'กรุณากรอกชื่อโรงพยาบาล';
    if (form.phone && !/^\+?\d[\d\s-]{8,12}\d$/.test(form.phone.replace(/\s+/g, ' '))) {
      newErrors.phone = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก (เช่น 0123456789, 012-345-6789, +66 234 567 890)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!validateForm()) {
      await MySwal.fire({
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอกข้อมูลให้ถูกต้องก่อนบันทึก',
        icon: 'warning',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-lg p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/90 transition-all duration-200',
        },
      });
      setSubmitting(false);
      return;
    }

    const payload = { data: { ...form } };

    try {
      await validateAuth();
      const token = sessionStorage.getItem('jwt');

      const url = isNew
        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/hospitels`
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/hospitels/${hospitel.id}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาด';
        throw new Error(res.status === 401 ? 'Unauthorized' : res.status === 403 ? `Forbidden: ${message}` : message);
      }

      const responseData = await res.json();

      await MySwal.fire({
        title: 'สำเร็จ',
        text: isNew ? 'สร้างข้อมูลโรงพยาบาลเรียบร้อยแล้ว' : 'บันทึกข้อมูลโรงพยาบาลเรียบร้อยแล้ว',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-lg p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)]',
        },
      });

      onSave(responseData.data);
    } catch (error) {
      console.error('HospitelEdit - Error:', error.message, error.stack);
      await MySwal.fire({
        title: error.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
        text: error.message.includes('Forbidden')
          ? 'คุณไม่มีสิทธิ์ในการดำเนินการนี้ กรุณาตรวจสอบบทบาทผู้ใช้'
          : error.message === 'Unauthorized'
          ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'
          : `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-lg p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--destructive)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/90 transition-all duration-200',
        },
      });
      if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('username');
        window.dispatchEvent(new Event('session-updated'));
        router.replace('/login?error=SessionExpired', { scroll: false });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Tab navigation
  const tabs = [
    { id: 'basic', label: 'ข้อมูลพื้นฐาน', icon: faHospital, shortLabel: 'ข้อมูล' },
    { id: 'contact', label: 'ข้อมูลติดต่อ', icon: faPhone, shortLabel: 'ติดต่อ' },
    { id: 'warning', label: 'ข้อความเตือน', icon: faExclamationTriangle, shortLabel: 'เตือน' },
  ];

  const currentTab = tabs.find(tab => tab.id === activeSection);
  const currentTabIndex = tabs.findIndex(t => t.id === activeSection);
  const isLastTab = currentTabIndex === tabs.length - 1;

  if (!mounted) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen bg-[var(--background)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-12 h-12 border-4 rounded-full border-[var(--border)]/20 border-t-[var(--primary)] animate-spin"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-[var(--background)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      role="main"
      aria-label={isNew ? 'สร้างข้อมูลโรงพยาบาล' : 'แก้ไขข้อมูลโรงพยาบาล'}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-[var(--card)] rounded-[var(--radius)] shadow-sm border border-[var(--border)] p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--primary)]/20 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faHospital} className="text-[var(--primary)] text-xl" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--card-foreground)]">
                {isNew ? 'เพิ่มโรงพยาบาลใหม่' : 'แก้ไขข้อมูลโรงพยาบาล'}
              </h1>
              <p className="text-[var(--muted-foreground)] text-sm sm:text-base">
                {isNew ? 'กรอกข้อมูลเพื่อเพิ่มโรงพยาบาลใหม่' : 'ปรับปรุงข้อมูลโรงพยาบาล'}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="sm:hidden bg-[var(--card)] border-b border-[var(--border)] sticky top-0 z-10">
          <div className="px-4 py-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[var(--secondary)] rounded-lg text-[var(--card-foreground)] font-medium transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={currentTab?.icon || faHospital} className="text-[var(--primary)]" />
                <span>{currentTab?.label || 'เลือกเมนู'}</span>
              </div>
              <svg 
                className={`w-5 h-5 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden"
                >
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveSection(tab.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${
                        activeSection === tab.id
                          ? 'bg-[var(--primary)] text-white'
                          : 'text-[var(--card-foreground)] hover:bg-[var(--secondary)]'
                      }`}
                    >
                      <FontAwesomeIcon icon={tab.icon} />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <div className="hidden sm:flex border-b border-[var(--border)] bg-[var(--card)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeSection === tab.id
                  ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] bg-[var(--secondary-light)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--card-foreground)] hover:bg-[var(--secondary)]/50'
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} className="text-base" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Mobile Progress Indicator */}
        <div className="sm:hidden px-4 py-4 bg-[var(--secondary-light)] border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            {tabs.map((tab, index) => (
              <div key={tab.id} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 shadow-sm ${
                    activeSection === tab.id
                      ? 'bg-[var(--primary)] text-white scale-110'
                      : index < currentTabIndex
                      ? 'bg-[var(--success)] text-white'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                  }`}
                >
                  {index < currentTabIndex ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < tabs.length - 1 && (
                  <div
                    className={`flex-1 h-1.5 mx-2 rounded-full transition-all duration-200 ${
                      index < currentTabIndex
                        ? 'bg-[var(--success)]'
                        : 'bg-[var(--muted)]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <span className="text-sm font-medium text-[var(--card-foreground)]">
              ขั้นตอนที่ {currentTabIndex + 1} จาก {tabs.length}: {currentTab?.shortLabel}
            </span>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-[var(--card)] rounded-[var(--radius)] shadow-sm border border-[var(--border)] p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Basic Information Tab */}
              {activeSection === 'basic' && (
                <motion.div
                  key="basic"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <label className="block mb-2 text-base font-medium text-[var(--card-foreground)]" htmlFor="name">
                      ชื่อโรงพยาบาล <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      disabled={submitting}
                      className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] px-4 py-3 text-base focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200 hover:border-[var(--ring)]/50 disabled:opacity-50"
                      placeholder="กรอกชื่อโรงพยาบาล"
                      aria-label="ชื่อโรงพยาบาล"
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                    />
                    {errors.name && (
                      <motion.p
                        id="name-error"
                        className="text-[var(--destructive)] text-sm mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {errors.name}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Contact Information Tab */}
              {activeSection === 'contact' && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <label className="block mb-2 text-base font-medium text-[var(--card-foreground)]" htmlFor="phone">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      disabled={submitting}
                      className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] px-4 py-3 text-base focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200 hover:border-[var(--ring)]/50 disabled:opacity-50"
                      placeholder="เช่น 0123456789 หรือ 012-345-6789"
                      aria-label="เบอร์โทรศัพท์"
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? 'phone-error' : undefined}
                    />
                    {errors.phone && (
                      <motion.p
                        id="phone-error"
                        className="text-[var(--destructive)] text-sm mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {errors.phone}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className="block mb-2 text-base font-medium text-[var(--card-foreground)]" htmlFor="website">
                      เว็บไซต์
                    </label>
                    <input
                      id="website"
                      type="text"
                      name="website"
                      value={form.website}
                      onChange={handleChange}
                      disabled={submitting}
                      className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] px-4 py-3 text-base focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200 hover:border-[var(--ring)]/50 disabled:opacity-50"
                      placeholder="เช่น https://example.com"
                      aria-label="เว็บไซต์"
                    />
                  </div>
                </motion.div>
              )}

              {/* Warning Messages Tab */}
              {activeSection === 'warning' && (
                <motion.div
                  key="warning"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <label className="block mb-2 text-base font-medium text-[var(--card-foreground)]" htmlFor="warningtext">
                      ข้อความเตือน
                    </label>
                    <input
                      id="warningtext"
                      type="text"
                      name="warningtext"
                      value={form.warningtext}
                      onChange={handleChange}
                      disabled={submitting}
                      className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] px-4 py-3 text-base focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200 hover:border-[var(--ring)]/50 disabled:opacity-50"
                      placeholder="กรอกข้อความเตือน"
                      aria-label="ข้อความเตือน"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-base font-medium text-[var(--card-foreground)]" htmlFor="subwarningtext">
                      คำเตือนย่อย
                    </label>
                    <input
                      id="subwarningtext"
                      type="text"
                      name="subwarningtext"
                      value={form.subwarningtext}
                      onChange={handleChange}
                      disabled={submitting}
                      className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] px-4 py-3 text-base focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200 hover:border-[var(--ring)]/50 disabled:opacity-50"
                      placeholder="กรอกคำเตือนย่อย"
                      aria-label="คำเตือนย่อย"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-[var(--border)]">
              {/* Mobile Navigation Buttons */}
              <div className="sm:hidden">
                {/* Always show back/next navigation */}
                <div className="flex gap-3 mb-3">
                  {currentTabIndex > 0 && (
                    <motion.button
                      type="button"
                      onClick={() => setActiveSection(tabs[currentTabIndex - 1].id)}
                      className="flex-1 px-4 py-3 bg-white border-2 border-[var(--border)] text-[var(--card-foreground)] rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-base"
                      whileHover={{ scale: 1.02, borderColor: 'var(--primary)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      ย้อนกลับ
                    </motion.button>
                  )}
                  
                  {!isLastTab && (
                    <motion.button
                      type="button"
                      onClick={() => setActiveSection(tabs[currentTabIndex + 1].id)}
                      className="flex-1 px-4 py-3 bg-[var(--primary)] text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-base"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      ถัดไป
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  )}
                </div>
                
                {/* Action buttons - always visible but styled differently based on tab */}
                <div className="flex gap-3">
                  <motion.button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base ${
                      isLastTab 
                        ? 'bg-[var(--secondary)] text-[var(--secondary-foreground)]' 
                        : 'bg-white border-2 border-[var(--border)] text-[var(--card-foreground)]'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-base" />
                    ยกเลิก
                  </motion.button>
                  
                  {isLastTab && (
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-3 bg-[var(--primary)] text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FontAwesomeIcon icon={faSave} className="text-base" />
                      {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Desktop Action Buttons */}
              <div className="hidden sm:flex gap-3">
                <motion.button
                  type="button"
                  onClick={onCancel}
                  disabled={submitting}
                  className="px-6 py-3 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-[var(--radius)] font-semibold text-base hover:bg-[var(--secondary)]/80 transition-all duration-300 disabled:opacity-50"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  aria-label="ยกเลิก"
                >
                  ยกเลิก
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] font-semibold text-base hover:bg-[var(--primary)]/80 transition-all duration-300 disabled:opacity-50"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  aria-label="บันทึก"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </motion.button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}