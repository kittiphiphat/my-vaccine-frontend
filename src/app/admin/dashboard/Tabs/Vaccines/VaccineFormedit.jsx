'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import dayjs from 'dayjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSyringe, 
  faCalendarAlt, 
  faClock, 
  faUsers, 
  faSave, 
  faTimes, 
  faChevronDown,
  faArrowLeft,
  faArrowRight,
  faCheck,
  faEdit,
  faInfoCircle,
  faCalendarCheck,
  faUser,
  faClipboardList
} from '@fortawesome/free-solid-svg-icons';

const MySwal = withReactContent(Swal);

export default function VaccineFormEdit({ vaccine = {}, onSave, onCancel }) {
  const router = useRouter();

  // Helper Functions
  const formatTimeToHHmm = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0');
    }
    return '';
  };

  const toFullTimeFormat = (timeStr) => {
    if (!timeStr) return null;
    if (/^\d{2}:\d{2}$/.test(timeStr)) return `${timeStr}:00.000`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return `${timeStr}.000`;
    return null;
  };

  const generateTimeOptions = (start = 6, end = 22, intervalMinutes = 15) => {
    const times = [];
    for (let hour = start; hour <= end; hour++) {
      for (let min = 0; min < 60; min += intervalMinutes) {
        if (hour === end && min > 0) break;
        const hh = String(hour).padStart(2, '0');
        const mm = String(min).padStart(2, '0');
        times.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
      }
    }
    return times;
  };

  const extractDateOnly = (dateStr) => (dateStr ? dateStr.split('T')[0] : '');

  const validateAuth = async () => {
    const token = sessionStorage.getItem('jwt');
    if (!token) throw new Error('Unauthorized');

    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : `HTTP Error: ${res.status}`);
    const data = await res.json();
    const roleName = data?.role?.name?.toLowerCase() || data?.data?.attributes?.role?.data?.attributes?.name?.toLowerCase();
    const userId = data?.id || data?.data?.id;

    if (!roleName || !userId || roleName !== 'admin') throw new Error('Forbidden: Admin access required');

    sessionStorage.setItem('userRole', roleName);
    sessionStorage.setItem('userId', userId);
    sessionStorage.setItem('username', data?.username || 'Admin');
  };

  const timeOptions = generateTimeOptions();
  const genderOptions = [
    { value: 'any', label: 'ทุกเพศ' },
    { value: 'male', label: 'ชาย' },
    { value: 'female', label: 'หญิง' },
  ];

  // State
  const [title, setTitle] = useState(vaccine.title || '');
  const [description, setDescription] = useState(vaccine.description || '');
  const [gender, setGender] = useState(genderOptions.find(opt => opt.value === (vaccine.gender || 'any')));
  const [minAge, setMinAge] = useState(vaccine.minAge ?? 0);
  const [maxAge, setMaxAge] = useState(vaccine.maxAge ?? 100);
  const [bookingStartDate, setBookingStartDate] = useState(extractDateOnly(vaccine.bookingStartDate));
  const [bookingEndDate, setBookingEndDate] = useState(extractDateOnly(vaccine.bookingEndDate));
  const [maxQuota, setMaxQuota] = useState(vaccine.maxQuota ?? 0);
  const [useTimeSlots, setUseTimeSlots] = useState(vaccine.useTimeSlots || false);
  const [serviceStartTime, setServiceStartTime] = useState(
    timeOptions.find(opt => opt.value === formatTimeToHHmm(vaccine.serviceStartTime)) || timeOptions[0]
  );
  const [serviceEndTime, setServiceEndTime] = useState(
    timeOptions.find(opt => opt.value === formatTimeToHHmm(vaccine.serviceEndTime)) || timeOptions[timeOptions.length - 1]
  );
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const startTime = timeOptions.find(opt => opt.value === formatTimeToHHmm(vaccine.serviceStartTime)) || timeOptions[0];
    const endTime = timeOptions.find(opt => opt.value === formatTimeToHHmm(vaccine.serviceEndTime)) || timeOptions[timeOptions.length - 1];
    setServiceStartTime(startTime);
    setServiceEndTime(endTime);
  }, [vaccine]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) return showError('กรุณากรอกชื่อวัคซีน');
    if (minAge < 0 || maxAge < minAge) return showError('ช่วงอายุไม่ถูกต้อง', 'กรุณาตรวจสอบช่วงอายุ');
    if (!bookingStartDate || !bookingEndDate) return showError('กรุณากรอกช่วงเวลาการจอง');
    if (!maxQuota || maxQuota <= 0) return showError('กรุณากรอกจำนวนสูงสุด');
    if (useTimeSlots && dayjs(serviceEndTime.value, 'HH:mm').isBefore(dayjs(serviceStartTime.value, 'HH:mm'))) {
      return showError('เวลาสิ้นสุดต้องไม่ก่อนเริ่มต้น');
    }

    try {
      await validateAuth();
      const token = sessionStorage.getItem('jwt');

      const result = await MySwal.fire({
        title: 'ยืนยันการบันทึก',
        text: 'คุณต้องการบันทึกข้อมูลวัคซีนี้หรือไม่?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        customClass: getSwalClasses(),
      });

      if (!result.isConfirmed) return;
      setSubmitting(true);

      const payload = {
        data: {
          title: title.trim(),
          description: description || null,
          gender: gender?.value || 'any',
          minAge: Number(minAge) || 0,
          maxAge: Number(maxAge) || 100,
          bookingStartDate: bookingStartDate || null,
          bookingEndDate: bookingEndDate || null,
          maxQuota: Number(maxQuota) || 0,
          useTimeSlots: !!useTimeSlots,
          serviceStartTime: toFullTimeFormat(serviceStartTime.value) || null,
          serviceEndTime: toFullTimeFormat(serviceEndTime.value) || null,
        },
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines/${vaccine.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(
          res.status === 401 ? 'Unauthorized' :
          res.status === 403 ? `Forbidden: ${errorData?.error?.message || 'Access denied'}` :
          errorData?.error?.message || res.statusText
        );
      }

      const resData = await res.json();
      const vaccineData = resData.data || resData;

      await MySwal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        text: 'ข้อมูลวัคซีนถูกบันทึกเรียบร้อยแล้ว',
        customClass: getSwalClasses('success'),
      });

      onSave({ id: vaccineData.id, attributes: vaccineData.attributes || vaccineData });
    } catch (err) {
      await MySwal.fire({
        icon: 'error',
        title: err.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
        text: err.message.includes('Forbidden') ? 'คุณไม่มีสิทธิ์ในการดำเนินการนี้' :
              err.message === 'Unauthorized' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' :
              `ไม่สามารถบันทึกข้อมูลได้: ${err.message}`,
        customClass: getSwalClasses('error'),
      });

      if (err.message === 'Unauthorized' || err.message.includes('Forbidden')) {
        ['jwt', 'userRole', 'userId', 'username'].forEach(key => sessionStorage.removeItem(key));
        window.dispatchEvent(new Event('session-updated'));
        router.replace('/login', { scroll: false });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (title, text = '') => {
    MySwal.fire({
      icon: 'warning',
      title,
      text,
      customClass: getSwalClasses('warning'),
    });
  };

  const getSwalClasses = (type = 'default') => {
    const base = {
      popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-xl p-6 max-w-sm w-full',
      title: 'text-lg font-semibold text-[var(--card-foreground)]',
      htmlContainer: 'text-base text-[var(--muted-foreground)]',
      confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-medium shadow-md focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
      cancelButton: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-6 py-3 rounded-[var(--radius)] font-medium shadow-md focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
    };

    if (type === 'success') return { ...base, confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)]' };
    if (type === 'error' || type === 'warning') return { ...base, confirmButton: 'bg-[var(--destructive)] text-white' };
    return base;
  };

  // Tab navigation
  const tabs = [
    { id: 'basic', label: 'ข้อมูลพื้นฐาน', icon: faEdit, shortLabel: 'ข้อมูล' },
    { id: 'details', label: 'รายละเอียด', icon: faClipboardList, shortLabel: 'รายละเอียด' },
    { id: 'schedule', label: 'กำหนดการ', icon: faCalendarCheck, shortLabel: 'กำหนดการ' },
  ];

  const currentTab = tabs.find(tab => tab.id === activeSection);
  const currentTabIndex = tabs.findIndex(t => t.id === activeSection);
  const isLastTab = currentTabIndex === tabs.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto px-2 sm:px-4"
    >
      <div className="bg-[var(--card)] rounded-[var(--radius)] shadow-xl border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--primary)] p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faEdit} className="text-white text-xl" />
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">แก้ไขข้อมูลวัคซีน</h2>
              <p className="text-white/80 text-sm sm:text-base">ปรับปรุงข้อมูลวัคซีนและกำหนดการให้บริการ</p>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation - Enhanced */}
        <div className="sm:hidden bg-[var(--card)] border-b border-[var(--border)] sticky top-0 z-10">
          <div className="px-4 py-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[var(--secondary)] rounded-lg text-[var(--card-foreground)] font-medium transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={currentTab?.icon || faEdit} className="text-[var(--primary)]" />
                <span>{currentTab?.label || 'เลือกเมนู'}</span>
              </div>
              <FontAwesomeIcon 
                icon={faChevronDown} 
                className={`transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
            
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden shadow-md"
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
                      {activeSection === tab.id && (
                        <FontAwesomeIcon icon={faCheck} className="ml-auto" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <div className="hidden sm:flex border-b border-[var(--border)]">
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

        {/* Mobile Progress Indicator - Enhanced */}
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
                    <FontAwesomeIcon icon={faCheck} className="text-sm" />
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <AnimatePresence mode="wait">
            {/* Basic Tab */}
            {activeSection === 'basic' && (
              <motion.div key="basic" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4 sm:space-y-5">
                <div className="bg-[var(--card)] rounded-xl p-4 sm:p-0 sm:bg-transparent shadow-sm sm:shadow-none border border-[var(--border)] sm:border-0">
                  <label className="flex items-center gap-2 mb-2 font-medium text-[var(--card-foreground)] text-sm sm:text-base">
                    <FontAwesomeIcon icon={faEdit} className="text-[var(--primary)]" />
                    ชื่อวัคซีน <span className="text-[var(--destructive)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent transition-all placeholder-[var(--muted-foreground)] text-base sm:text-base shadow-sm"
                    placeholder="กรอกชื่อวัคซีน"
                    required
                  />
                </div>

                <div className="bg-[var(--card)] rounded-xl p-4 sm:p-0 sm:bg-transparent shadow-sm sm:shadow-none border border-[var(--border)] sm:border-0">
                  <label className="block mb-2 font-medium text-[var(--card-foreground)] text-sm sm:text-base">คำอธิบาย</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent resize-none transition-all placeholder-[var(--muted-foreground)] text-base sm:text-base shadow-sm"
                    placeholder="กรอกรายละเอียดเกี่ยวกับวัคซีน (ถ้ามี)"
                  />
                </div>

                <div className="bg-[var(--card)] rounded-xl p-4 sm:p-0 sm:bg-transparent shadow-sm sm:shadow-none border border-[var(--border)] sm:border-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block mb-2 font-medium text-[var(--card-foreground)] text-sm sm:text-base">เพศ</label>
                      <Select
                        value={gender}
                        onChange={setGender}
                        options={genderOptions}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            backgroundColor: 'var(--input)',
                            borderColor: 'var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: '0.5rem',
                            minHeight: '48px',
                            boxShadow: 'none',
                            '&:hover': { borderColor: 'var(--ring)' },
                            '&:focus-within': { borderColor: 'var(--ring)', boxShadow: '0 0 0 2px var(--ring)/30' },
                          }),
                          menu: (base) => ({
                            ...base,
                            backgroundColor: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            marginTop: '0.5rem',
                            boxShadow: 'var(--shadow)',
                            zIndex: 10,
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isFocused ? 'var(--primary)/10' : 'var(--card)',
                            color: 'var(--card-foreground)',
                            cursor: 'pointer',
                            padding: '0.75rem 1rem',
                            fontSize: '1rem',
                          }),
                          singleValue: (base) => ({ ...base, color: 'var(--card-foreground)', fontSize: '1rem' }),
                          placeholder: (base) => ({ ...base, color: 'var(--muted-foreground)', fontSize: '1rem' }),
                          dropdownIndicator: (base) => ({ ...base, color: 'var(--muted-foreground)' }),
                          indicatorSeparator: () => ({ display: 'none' }),
                        }}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 font-medium text-[var(--card-foreground)] text-sm sm:text-base">อายุต่ำสุด (ปี)</label>
                      <input
                        type="number"
                        value={minAge}
                        onChange={(e) => setMinAge(Number(e.target.value))}
                        min={0}
                        className="w-full px-4 py-4 rounded-xl border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent transition-all placeholder-[var(--muted-foreground)] text-base sm:text-base shadow-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 font-medium text-[var(--card-foreground)] text-sm sm:text-base">อายุสูงสุด (ปี)</label>
                      <input
                        type="number"
                        value={maxAge}
                        onChange={(e) => setMaxAge(Number(e.target.value))}
                        min={minAge}
                        className="w-full px-4 py-4 rounded-xl border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent transition-all placeholder-[var(--muted-foreground)] text-base sm:text-base shadow-sm"
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Details Tab */}
            {activeSection === 'details' && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4 sm:space-y-5">
                <div className="bg-[var(--card)] rounded-xl p-4 sm:p-0 sm:bg-transparent shadow-sm sm:shadow-none border border-[var(--border)] sm:border-0">
                  <label className="flex items-center gap-2 mb-2 font-medium text-[var(--card-foreground)] text-sm sm:text-base">
                    <FontAwesomeIcon icon={faUser} className="text-[var(--primary)]" />
                    จำนวนสูงสุด <span className="text-[var(--destructive)]">*</span>
                  </label>
                  <input
                    type="number"
                    value={maxQuota}
                    onChange={(e) => setMaxQuota(Number(e.target.value))}
                    min={1}
                    className="w-full px-4 py-4 rounded-xl border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent transition-all placeholder-[var(--muted-foreground)] text-base sm:text-base shadow-sm"
                    placeholder="จำนวนผู้รับบริการสูงสุด"
                    required
                  />
                </div>

                <div className="bg-[var(--primary-foreground)] rounded-xl p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div className="mb-3 sm:mb-0">
                      <h3 className="text-base sm:text-lg font-medium text-[var(--card-foreground)]">ระบบช่วงเวลาการให้บริการ</h3>
                      <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">เปิดใช้งานเพื่อกำหนดช่วงเวลาให้บริการแบบมีกำหนดการ</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseTimeSlots(!useTimeSlots)}
                      className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                      style={{ backgroundColor: useTimeSlots ? 'var(--primary)' : 'var(--secondary)' }}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${useTimeSlots ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {useTimeSlots && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
                      >
                        <div>
                          <label className="flex items-center gap-2 mb-2 font-medium text-[var(--card-foreground)] text-sm sm:text-base">
                            <FontAwesomeIcon icon={faClock} className="text-[var(--primary)]" />
                            เวลาเริ่มต้น
                          </label>
                          <Select
                            value={serviceStartTime}
                            onChange={setServiceStartTime}
                            options={timeOptions}
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={{
                              control: (base) => ({
                                ...base,
                                backgroundColor: 'var(--input)',
                                borderColor: 'var(--border)',
                                borderRadius: 'var(--radius)',
                                padding: '0.5rem',
                                minHeight: '48px',
                                boxShadow: 'none',
                                '&:hover': { borderColor: 'var(--ring)' },
                                '&:focus-within': { borderColor: 'var(--ring)', boxShadow: '0 0 0 2px var(--ring)/30' },
                              }),
                              menu: (base) => ({
                                ...base,
                                backgroundColor: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                marginTop: '0.5rem',
                                boxShadow: 'var(--shadow)',
                                zIndex: 10,
                              }),
                              option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isFocused ? 'var(--primary)/10' : 'var(--card)',
                                color: 'var(--card-foreground)',
                                cursor: 'pointer',
                                padding: '0.75rem 1rem',
                                fontSize: '1rem',
                              }),
                              singleValue: (base) => ({ ...base, color: 'var(--card-foreground)', fontSize: '1rem' }),
                              placeholder: (base) => ({ ...base, color: 'var(--muted-foreground)', fontSize: '1rem' }),
                              dropdownIndicator: (base) => ({ ...base, color: 'var(--muted-foreground)' }),
                              indicatorSeparator: () => ({ display: 'none' }),
                            }}
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 mb-2 font-medium text-[var(--card-foreground)] text-sm sm:text-base">
                            <FontAwesomeIcon icon={faClock} className="text-[var(--primary)]" />
                            เวลาสิ้นสุด
                          </label>
                          <Select
                            value={serviceEndTime}
                            onChange={setServiceEndTime}
                            options={timeOptions}
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={{
                              control: (base) => ({
                                ...base,
                                backgroundColor: 'var(--input)',
                                borderColor: 'var(--border)',
                                borderRadius: 'var(--radius)',
                                padding: '0.5rem',
                                minHeight: '48px',
                                boxShadow: 'none',
                                '&:hover': { borderColor: 'var(--ring)' },
                                '&:focus-within': { borderColor: 'var(--ring)', boxShadow: '0 0 0 2px var(--ring)/30' },
                              }),
                              menu: (base) => ({
                                ...base,
                                backgroundColor: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                marginTop: '0.5rem',
                                boxShadow: 'var(--shadow)',
                                zIndex: 10,
                              }),
                              option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isFocused ? 'var(--primary)/10' : 'var(--card)',
                                color: 'var(--card-foreground)',
                                cursor: 'pointer',
                                padding: '0.75rem 1rem',
                                fontSize: '1rem',
                              }),
                              singleValue: (base) => ({ ...base, color: 'var(--card-foreground)', fontSize: '1rem' }),
                              placeholder: (base) => ({ ...base, color: 'var(--muted-foreground)', fontSize: '1rem' }),
                              dropdownIndicator: (base) => ({ ...base, color: 'var(--muted-foreground)' }),
                              indicatorSeparator: () => ({ display: 'none' }),
                            }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Schedule Tab */}
            {activeSection === 'schedule' && (
              <motion.div key="schedule" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4 sm:space-y-5">
                <div className="bg-[var(--card)] rounded-xl p-4 sm:p-0 sm:bg-transparent shadow-sm sm:shadow-none border border-[var(--border)] sm:border-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="flex items-center gap-2 mb-2 font-medium text-[var(--card-foreground)] text-sm sm:text-base">
                        <FontAwesomeIcon icon={faCalendarCheck} className="text-[var(--primary)]" />
                        วันที่เริ่มเปิดจอง <span className="text-[var(--destructive)]">*</span>
                      </label>
                      <input
                        type="date"
                        value={bookingStartDate}
                        onChange={(e) => setBookingStartDate(e.target.value)}
                        className="w-full px-4 py-4 rounded-xl border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent transition-all text-base sm:text-base shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 mb-2 font-medium text-[var(--card-foreground)] text-sm sm:text-base">
                        <FontAwesomeIcon icon={faCalendarCheck} className="text-[var(--primary)]" />
                        วันที่ปิดจอง <span className="text-[var(--destructive)]">*</span>
                      </label>
                      <input
                        type="date"
                        value={bookingEndDate}
                        onChange={(e) => setBookingEndDate(e.target.value)}
                        className="w-full px-4 py-4 rounded-xl border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent transition-all text-base sm:text-base shadow-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--primary-foreground)] rounded-xl p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-medium text-[var(--card-foreground)] mb-4">ข้อมูลสรุป</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base">
                    <div className="bg-[var(--input)] rounded-xl p-3 sm:p-4 border border-[var(--border)]">
                      <p className="text-[var(--muted-foreground)] mb-1 text-xs sm:text-sm">ชื่อวัคซีน</p>
                      <p className="font-medium text-[var(--card-foreground)] truncate">{title || 'ยังไม่ระบุ'}</p>
                    </div>
                    <div className="bg-[var(--input)] rounded-xl p-3 sm:p-4 border border-[var(--border)]">
                      <p className="text-[var(--muted-foreground)] mb-1 text-xs sm:text-sm">ช่วงอายุ</p>
                      <p className="font-medium text-[var(--card-foreground)]">{minAge} - {maxAge} ปี</p>
                    </div>
                    <div className="bg-[var(--input)] rounded-xl p-3 sm:p-4 border border-[var(--border)]">
                      <p className="text-[var(--muted-foreground)] mb-1 text-xs sm:text-sm">จำนวนสูงสุด</p>
                      <p className="font-medium text-[var(--card-foreground)]">{maxQuota} คน</p>
                    </div>
                    <div className="bg-[var(--input)] rounded-xl p-3 sm:p-4 border border-[var(--border)]">
                      <p className="text-[var(--muted-foreground)] mb-1 text-xs sm:text-sm">ระบบช่วงเวลา</p>
                      <p className="font-medium text-[var(--card-foreground)]">{useTimeSlots ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons - Enhanced Mobile Layout */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-[var(--border)]">
            {/* Mobile Navigation Buttons */}
            <div className="sm:hidden">
              {/* Always show back/next navigation */}
              <div className="flex gap-3 mb-3">
                {currentTabIndex > 0 && (
                  <motion.button
                    type="button"
                    onClick={() => setActiveSection(tabs[currentTabIndex - 1].id)}
                    className="flex-1 px-4 py-3 bg-white border-2 border-[var(--border)] text-[var(--card-foreground)] rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-base shadow-sm"
                    whileHover={{ scale: 1.02, borderColor: 'var(--primary)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="text-base" />
                    ย้อนกลับ
                  </motion.button>
                )}
                
                {!isLastTab && (
                  <motion.button
                    type="button"
                    onClick={() => setActiveSection(tabs[currentTabIndex + 1].id)}
                    className="flex-1 px-4 py-3 bg-[var(--primary)] text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-base shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ถัดไป
                    <FontAwesomeIcon icon={faArrowRight} className="text-base" />
                  </motion.button>
                )}
              </div>
              
              {/* Action buttons - always visible but styled differently based on tab */}
              <div className="flex gap-3">
                <motion.button
                  type="button"
                  onClick={onCancel}
                  disabled={submitting}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-sm ${
                    isLastTab 
                      ? 'bg-[var(--secondary)] text-[var(--secondary-foreground)]' 
                      : 'bg-white border-2 border-[var(--border)] text-[var(--primary)]'
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
                    className="flex-1 px-4 py-3 bg-[var(--primary)] text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-lg"
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
            <div className="hidden sm:flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 w-full sm:w-auto">
              <motion.button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-3 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-[var(--radius)] font-medium hover:bg-opacity-90 transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FontAwesomeIcon icon={faTimes} />
                ยกเลิก
              </motion.button>
              <motion.button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] font-medium hover:bg-opacity-90 transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FontAwesomeIcon icon={faSave} />
                {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
}