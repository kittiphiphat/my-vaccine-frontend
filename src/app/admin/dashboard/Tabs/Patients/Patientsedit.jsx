'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendar, faXmark, faChevronLeft, faChevronRight,
  faUser, faPhone, faEnvelope, faMapMarkerAlt, faVenusMars,
  faSave, faTimes, faCheck, faExclamationTriangle, faInfoCircle,
  faMars, faVenus, faGenderless, faArrowRight, faArrowLeft,
  faCheckCircle, faUserCircle, faBirthdayCake, faHome, faBars,
  faMobileScreen
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

const genderOptions = [
  { value: 'male', label: 'ชาย', icon: faMars, color: 'text-blue-500' },
  { value: 'female', label: 'หญิง', icon: faVenus, color: 'text-pink-500' },
];

const buttonVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

const DatePicker = ({ selected, onSelect, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(
    selected && dayjs(selected).isValid() ? dayjs(selected).tz('Asia/Bangkok') : dayjs().tz('Asia/Bangkok')
  );
  const [inputValue, setInputValue] = useState(
    selected && dayjs(selected).isValid() ? dayjs(selected).tz('Asia/Bangkok').format('DD/MM/YYYY') : ''
  );

  const daysInMonth = currentDate.daysInMonth();
  const firstDayOfMonth = currentDate.startOf('month').day();

  const handlePreviousMonth = () => setCurrentDate(prev => prev.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentDate(prev => prev.add(1, 'month'));
  const handleYearChange = (year) => setCurrentDate(prev => prev.year(year - 543));
  const handleMonthChange = (month) => setCurrentDate(prev => prev.month(month));

  const handleDateClick = (day) => {
    const newDate = currentDate.date(day);
    onSelect(newDate.toDate());
    setInputValue(newDate.format('DD/MM/YYYY'));
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    let value = e.target.value.replace(/[^0-9/]/g, '');
    setInputValue(value);

    if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const parsedDate = dayjs(value, 'DD/MM/YYYY', true).tz('Asia/Bangkok');
      if (parsedDate.isValid()) {
        setCurrentDate(parsedDate);
        onSelect(parsedDate.toDate());
      }
    }
  };

  const handleInputBlur = () => {
    if (inputValue && !dayjs(inputValue, 'DD/MM/YYYY', true).isValid()) {
      setInputValue(selected && dayjs(selected).isValid() ? dayjs(selected).tz('Asia/Bangkok').format('DD/MM/YYYY') : '');
      if (!selected) onSelect('');
    }
  };

  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const weekdayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const years = Array.from({ length: 100 }, (_, i) => dayjs().year() + 543 - i);

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <FontAwesomeIcon
          icon={faCalendar}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] z-10"
        />
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => setIsOpen(true)}
          placeholder="DD/MM/YYYY"
          className={cn(
            'pl-10 pr-10 bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]',
            error && 'border-[var(--destructive)] focus:ring-[var(--destructive)]/20'
          )}
        />
        {selected && (
          <motion.button
            onClick={() => {
              onSelect('');
              setInputValue('');
              setIsOpen(false);
            }}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--destructive)] p-1 rounded-full hover:bg-[var(--muted)]/20 transition-all"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </motion.button>
        )}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--primary)] hover:bg-[var(--muted)]/20 p-1 rounded-full transition-all"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <FontAwesomeIcon icon={faCalendar} className="h-4 w-4" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 mt-2 w-full p-4 bg-[var(--card)] rounded-[var(--radius)] shadow-xl border border-[var(--border)]"
          >
            <div className="flex items-center justify-between mb-3">
              <motion.button
                onClick={handlePreviousMonth}
                className="h-8 w-8 rounded-full bg-[var(--muted)]/20 text-[var(--foreground)] hover:bg-[var(--muted)]/30"
                whileHover="hover"
                whileTap="tap"
                variants={buttonVariants}
              >
                <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
              </motion.button>
              <div className="flex gap-2">
                <Select value={currentDate.month().toString()} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-32 text-sm bg-[var(--background)] border-[var(--border)] text-[var(--foreground)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                    {monthNames.map((m, i) => (
                      <SelectItem key={m} value={i.toString()} className="text-[var(--foreground)] hover:bg-[var(--muted)]/20">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={(currentDate.year() + 543).toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-24 text-sm bg-[var(--background)] border-[var(--border)] text-[var(--foreground)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                    {years.map(y => (
                      <SelectItem key={y} value={y.toString()} className="text-[var(--foreground)] hover:bg-[var(--muted)]/20">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <motion.button
                onClick={handleNextMonth}
                className="h-8 w-8 rounded-full bg-[var(--muted)]/20 text-[var(--foreground)] hover:bg-[var(--muted)]/30"
                whileHover="hover"
                whileTap="tap"
                variants={buttonVariants}
              >
                <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
              </motion.button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-medium text-[var(--muted-foreground)] mb-2">
              {weekdayNames.map(d => <div key={d} className="p-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 text-center text-sm gap-1">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const date = currentDate.date(day);
                const isSelected = selected && date.isSame(selected, 'day');
                const isToday = date.isSame(dayjs().tz('Asia/Bangkok'), 'day');
                return (
                  <motion.button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      'h-8 w-8 rounded-full font-medium flex items-center justify-center transition-all',
                      isSelected ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' :
                      isToday ? 'border-2 border-[var(--primary)] text-[var(--primary)]' :
                      'hover:bg-[var(--muted)]/20 text-[var(--foreground)]'
                    )}
                    whileHover="hover"
                    whileTap="tap"
                    variants={buttonVariants}
                  >
                    {day}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-1 text-[var(--destructive)] text-sm"
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="h-3 w-3" />
          <p>{error}</p>
        </motion.div>
      )}
    </div>
  );
};

export default function PatientsEdit({ patient = {}, onSave = () => {}, onCancel = () => {} }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [formData, setFormData] = useState({
    first_name: patient?.attributes?.first_name || patient?.first_name || '',
    last_name: patient?.attributes?.last_name || patient?.last_name || '',
    birth_date: patient?.attributes?.birth_date || patient?.birth_date || '',
    gender: patient?.attributes?.gender || patient?.gender || '',
    phone: patient?.attributes?.phone || patient?.phone || '',
    email: patient?.attributes?.email || patient?.email || '',
    address: patient?.attributes?.address || patient?.address || '',
  });
  const [errors, setErrors] = useState({});
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(!patient?.id);
  const [error, setError] = useState(null);
  const [showMobileSteps, setShowMobileSteps] = useState(false);

  useEffect(() => {
    if (!patient?.id) {
      setError('ไม่พบ ID ผู้ป่วย');
      setLoading(false);
      setMounted(true);
      return;
    }

    async function fetchPatient() {
      try {
        const token = sessionStorage.getItem('jwt');
        if (!token) throw new Error('Unauthorized: No token found');

        const url = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients/${patient.id}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลผู้ป่วยได้');

        const { data } = await res.json();
        setFormData({
          first_name: data.attributes?.first_name || '',
          last_name: data.attributes?.last_name || '',
          birth_date: data.attributes?.birth_date || '',
          gender: data.attributes?.gender || '',
          phone: data.attributes?.phone || '',
          email: data.attributes?.email || '',
          address: data.attributes?.address || '',
        });
      } catch (err) {
        setError(err.message);
        MySwal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: err.message.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถโหลดข้อมูลผู้ป่วยได้: ${err.message}`,
          icon: 'error',
          customClass: {
            popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
            title: 'text-lg font-semibold text-[var(--card-foreground)]',
            htmlContainer: 'text-sm text-[var(--muted-foreground)]',
            confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
          },
        });
        if (err.message.includes('Unauthorized')) router.replace('/login');
      } finally {
        setLoading(false);
        setMounted(true);
      }
    }

    if (!patient.attributes && !patient.first_name) {
      fetchPatient();
    } else {
      setLoading(false);
      setMounted(true);
    }
  }, [patient, router]);

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.first_name.trim()) newErrors.first_name = 'กรุณากรอกชื่อ';
      if (!formData.last_name.trim()) newErrors.last_name = 'กรุณากรอกนามสกุล';
    } else if (step === 2) {
      if (!formData.birth_date || !dayjs(formData.birth_date).isValid()) newErrors.birth_date = 'กรุณากรอกวันเกิดที่ถูกต้อง';
      if (!formData.gender) newErrors.gender = 'กรุณาเลือกเพศ';
    } else if (step === 3) {
      if (formData.phone && !/^\d{10}$/.test(formData.phone)) newErrors.phone = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก';
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'กรุณากรอกอีเมลที่ถูกต้อง';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'กรุณากรอกชื่อ';
    if (!formData.last_name.trim()) newErrors.last_name = 'กรุณากรอกนามสกุล';
    if (!formData.birth_date || !dayjs(formData.birth_date).isValid()) newErrors.birth_date = 'กรุณากรอกวันเกิดที่ถูกต้อง';
    if (!formData.gender) newErrors.gender = 'กรุณาเลือกเพศ';
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) newErrors.phone = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'กรุณากรอกอีเมลที่ถูกต้อง';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleGenderChange = (value) => {
    setFormData(prev => ({ ...prev, gender: value || '' }));
    setErrors(prev => ({ ...prev, gender: '' }));
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      MySwal.fire({
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอกข้อมูลให้ถูกต้องก่อนบันทึก',
        icon: 'warning',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
      });
      return;
    }

    const result = await MySwal.fire({
      title: 'ยืนยันการบันทึก',
      text: 'คุณต้องการบันทึกข้อมูลผู้ป่วยนี้หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
        title: 'text-lg font-semibold text-[var(--card-foreground)]',
        htmlContainer: 'text-sm text-[var(--muted-foreground)]',
        confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        cancelButton: 'bg-[var(--muted)]/20 text-[var(--foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--muted)]/30 transition-all duration-200 shadow-sm',
      },
    });

    if (!result.isConfirmed) return;

    try {
      const token = sessionStorage.getItem('jwt');
      if (!token) throw new Error('Unauthorized: No token found');

      const url = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients/${patient.id}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            ...formData,
            birth_date: formData.birth_date ? dayjs(formData.birth_date).tz('Asia/Bangkok').format('YYYY-MM-DD') : '',
          },
        }),
      });

      if (!res.ok) throw new Error('เกิดข้อผิดพลาด');

      await MySwal.fire({
        title: 'สำเร็จ',
        text: 'ข้อมูลผู้ป่วยถูกบันทึกเรียบร้อยแล้ว',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
        },
      });
      onSave();
    } catch (error) {
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
      });
      if (error.message.includes('Unauthorized')) router.replace('/login');
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <motion.div
          className="w-10 h-10 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      </div>
    );
  }

  if (error || !patient?.id) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <div className="p-8 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] max-w-md w-full text-center">
          <FontAwesomeIcon icon={faInfoCircle} className="w-16 h-16 mx-auto text-[var(--muted-foreground)] mb-4" />
          <p className="text-[var(--foreground)] mb-4">{error || 'ไม่พบข้อมูลผู้ป่วย'}</p>
          <Button onClick={onCancel} className="bg-[var(--primary)] text-[var(--primary-foreground)]">
            กลับ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] font-prompt">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
        {/* Header */}
        <motion.div 
          className="mb-6 sm:mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] mb-4">
            <FontAwesomeIcon icon={faUser} className="text-2xl sm:text-3xl text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-2">แก้ไขข้อมูลผู้ป่วย</h1>
          <p className="text-sm sm:text-base text-[var(--muted-foreground)]">อัปเดตข้อมูลส่วนตัวของผู้ป่วย</p>
        </motion.div>

        {/* Progress Bar - Desktop */}
        <div className="hidden sm:block">
          <motion.div 
            className="mb-6 sm:mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <motion.div
                    className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-medium text-xs sm:text-sm transition-all",
                      currentStep === step 
                        ? "bg-[var(--primary)] text-white shadow-lg" 
                        : currentStep > step 
                          ? "bg-green-500 text-white" 
                          : "bg-[var(--muted)]/30 text-[var(--muted-foreground)]"
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {currentStep > step ? (
                      <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      step
                    )}
                  </motion.div>
                  {step < totalSteps && (
                    <div 
                      className={cn(
                        "flex-1 h-1 mx-2 transition-all",
                        currentStep > step ? "bg-green-500" : "bg-[var(--muted)]/30"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
              <span className="hidden sm:inline">ข้อมูลส่วนตัว</span>
              <span className="sm:hidden">ข้อมูล</span>
              <span className="hidden sm:inline">วันเกิดและเพศ</span>
              <span className="sm:hidden">วันเกิด</span>
              <span className="hidden sm:inline">ข้อมูลติดต่อ</span>
              <span className="sm:hidden">ติดต่อ</span>
            </div>
          </motion.div>
        </div>

        {/* Mobile Progress Indicator */}
        <div className="sm:hidden mb-6">
          <div className="flex items-center justify-between bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
            <span className="text-sm font-medium text-[var(--foreground)]">ขั้นที่ {currentStep} จาก {totalSteps}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileSteps(!showMobileSteps)}
              className="p-1 h-8 w-8"
            >
              <FontAwesomeIcon icon={faMobileScreen} className="h-4 w-4" />
            </Button>
          </div>
          
          <AnimatePresence>
            {showMobileSteps && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]"
              >
                <div className="flex justify-between mb-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center font-medium text-xs transition-all",
                          currentStep === step 
                            ? "bg-[var(--primary)] text-white" 
                            : currentStep > step 
                              ? "bg-green-500 text-white" 
                              : "bg-[var(--muted)]/30 text-[var(--muted-foreground)]"
                        )}
                      >
                        {currentStep > step ? (
                          <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
                        ) : (
                          step
                        )}
                      </div>
                      {step < totalSteps && (
                        <div 
                          className={cn(
                            "flex-1 h-0.5 mx-1 transition-all",
                            currentStep > step ? "bg-green-500" : "bg-[var(--muted)]/30"
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                  <span>ข้อมูล</span>
                  <span>วันเกิด</span>
                  <span>ติดต่อ</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Form Container */}
        <motion.div
          className="bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] p-4 sm:p-6 lg:p-8 shadow-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 sm:space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faUser} className="text-[var(--primary)] text-lg sm:text-xl" />
                  </div>
                  <div className="text-left sm:text-center">
                    <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">ข้อมูลส่วนตัว</h2>
                    <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">กรุณากรอกชื่อและนามสกุลของผู้ป่วย</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {['first_name', 'last_name'].map((field) => (
                    <div key={field}>
                      <Label className="block mb-2 text-sm font-medium text-[var(--foreground)]/80">
                        {field === 'first_name' ? 'ชื่อ' : 'นามสกุล'} <span className="text-[var(--destructive)]">*</span>
                      </Label>
                      <div className="relative">
                        <FontAwesomeIcon 
                          icon={faUser} 
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" 
                        />
                        <Input
                          name={field}
                          value={formData[field]}
                          onChange={handleChange}
                          className="pl-10 bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                        />
                      </div>
                      {errors[field] && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 mt-1 text-[var(--destructive)] text-sm"
                        >
                          <FontAwesomeIcon icon={faExclamationTriangle} className="h-3 w-3" />
                          <p>{errors[field]}</p>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Birth Date and Gender */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 sm:space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faBirthdayCake} className="text-[var(--primary)] text-lg sm:text-xl" />
                  </div>
                  <div className="text-left sm:text-center">
                    <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">วันเกิดและเพศ</h2>
                    <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">กรุณาระบุวันเกิดและเพศของผู้ป่วย</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label className="block mb-2 text-sm font-medium text-[var(--foreground)]/80">
                      วันเกิด <span className="text-[var(--destructive)]">*</span>
                    </Label>
                    <DatePicker 
                      selected={formData.birth_date} 
                      onSelect={v => setFormData(prev => ({ ...prev, birth_date: v }))} 
                      error={errors.birth_date} 
                    />
                  </div>
                  <div>
                    <Label className="block mb-2 text-sm font-medium text-[var(--foreground)]/80">
                      เพศ <span className="text-[var(--destructive)]">*</span>
                    </Label>
                    <div className="relative">
                      <FontAwesomeIcon 
                        icon={faVenusMars} 
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] z-10" 
                      />
                      <Select value={formData.gender} onValueChange={handleGenderChange}>
                        <SelectTrigger className="pl-10 bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]">
                          <SelectValue placeholder="-- กรุณาเลือกเพศ --" />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                          {genderOptions.map(o => (
                            <SelectItem 
                              key={o.value} 
                              value={o.value} 
                              className="text-[var(--foreground)] hover:bg-[var(--muted)]/20 flex items-center gap-2"
                            >
                              <FontAwesomeIcon icon={o.icon} className={cn(o.color, "w-4 h-4")} />
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.gender && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 mt-1 text-[var(--destructive)] text-sm"
                      >
                        <FontAwesomeIcon icon={faExclamationTriangle} className="h-3 w-3" />
                        <p>{errors.gender}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Contact Information */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 sm:space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faEnvelope} className="text-[var(--primary)] text-lg sm:text-xl" />
                  </div>
                  <div className="text-left sm:text-center">
                    <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">ข้อมูลติดต่อ</h2>
                    <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">กรุณากรอกข้อมูลติดต่อของผู้ป่วย</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {['phone', 'email'].map((field) => (
                    <div key={field}>
                      <Label className="block mb-2 text-sm font-medium text-[var(--foreground)]/80">
                        {field === 'phone' ? 'เบอร์โทร' : 'อีเมล'}
                      </Label>
                      <div className="relative">
                        <FontAwesomeIcon 
                          icon={field === 'phone' ? faPhone : faEnvelope} 
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" 
                        />
                        <Input
                          name={field}
                          type={field === 'email' ? 'email' : 'text'}
                          value={formData[field]}
                          onChange={handleChange}
                          className="pl-10 bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                        />
                      </div>
                      {errors[field] && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 mt-1 text-[var(--destructive)] text-sm"
                        >
                          <FontAwesomeIcon icon={faExclamationTriangle} className="h-3 w-3" />
                          <p>{errors[field]}</p>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="block mb-2 text-sm font-medium text-[var(--foreground)]/80">ที่อยู่</Label>
                  <div className="relative">
                    <FontAwesomeIcon 
                      icon={faHome} 
                      className="absolute left-3 top-3 text-[var(--muted-foreground)]" 
                    />
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm resize-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-6 sm:mt-8">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? onCancel : handlePrevStep}
              className="w-full sm:w-auto border-[var(--border)] bg-[var(--muted)]/20 text-[var(--foreground)] hover:bg-[var(--muted)]/30 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={currentStep === 1 ? faTimes : faArrowLeft} className="h-4 w-4" />
              {currentStep === 1 ? 'ยกเลิก' : 'ก่อนหน้า'}
            </Button>
            
            <Button
              onClick={currentStep === totalSteps ? handleSubmit : handleNextStep}
              className="w-full sm:w-auto bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white hover:opacity-90 flex items-center justify-center gap-2 shadow-lg"
            >
              {currentStep === totalSteps ? (
                <>
                  <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
                  บันทึก
                </>
              ) : (
                <>
                  ถัดไป
                  <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  ); 
}