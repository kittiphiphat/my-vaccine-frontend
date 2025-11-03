'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faXmark, faCalendarAlt, faClock, faToggleOn, 
  faToggleOff, faInfoCircle, faSave, faArrowLeft, faHourglassHalf,
  faExclamationTriangle, faCheckCircle, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const MySwal = withReactContent(Swal);

const buttonVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

const formVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
};

export default function BookingSettingSectionform({ initialData = {}, onSave = () => {}, onCancel = () => {} }) {
  const router = useRouter();
  const [advanceBookingDays, setAdvanceBookingDays] = useState(initialData.advance_booking_days ?? 0);
  const [preventLastMinuteMinutes, setPreventLastMinuteMinutes] = useState(
    initialData.prevent_last_minute_minutes ?? 0
  );
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(initialData.slot_duration_minutes ?? 30);
  const [is_enabled, setIsEnabled] = useState(initialData.is_enabled ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const vaccineTitle = initialData.vaccine?.data?.attributes?.title || 'ไม่ระบุชื่อวัคซีน';

  useEffect(() => {
    setAdvanceBookingDays(initialData.advance_booking_days ?? 0);
    setPreventLastMinuteMinutes(initialData.prevent_last_minute_minutes ?? 0);
    setSlotDurationMinutes(initialData.slot_duration_minutes ?? 30);
    setIsEnabled(initialData.is_enabled ?? true);
    setLoading(false);
  }, [initialData]);

  function handleNumberChange(setter) {
    return (e) => {
      const val = e.target.value;
      if (val === '') {
        setter(0);
        return;
      }
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0) {
        setter(num);
      }
    };
  }

  async function validateAuth() {
    const token = sessionStorage.getItem('jwt');
    if (!token) throw new Error('Unauthorized');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`, {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : `HTTP Error: ${res.status}`);
      const data = await res.json();
      const roleName = data?.role?.name?.toLowerCase() || data?.data?.attributes?.role?.data?.attributes?.name?.toLowerCase() || null;
      const userId = data?.id || data?.data?.id;
      const username = data?.username || 'Admin';

      if (!roleName || !userId || roleName !== 'admin') {
        throw new Error('Forbidden: Admin access required');
      }

      sessionStorage.setItem('userRole', roleName);
      sessionStorage.setItem('userId', userId);
      sessionStorage.setItem('username', username);
    } catch (err) {
      throw new Error(err.message === 'Unauthorized' ? 'Unauthorized' : 'Forbidden: Admin access required');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (initialData.id && !Number.isInteger(initialData.id)) {
        throw new Error('ข้อมูลการตั้งค่าไม่ถูกต้องหรือไม่พบ ID');
      }

      if (slotDurationMinutes <= 0) {
        throw new Error('ระยะเวลา Slot ต้องมากกว่า 0 นาที');
      }

      if (initialData.id && !initialData.vaccine?.data?.id) {
        throw new Error('ไม่พบข้อมูลวัคซีนสำหรับการตั้งค่านี้');
      }

      const confirm = await MySwal.fire({
        title: initialData.id ? 'ยืนยันการแก้ไข' : 'ยืนยันการสร้าง',
        text: `คุณต้องการ${initialData.id ? 'แก้ไข' : 'สร้าง'}การตั้งค่าสำหรับวัคซีน "${vaccineTitle}" ด้วยจำนวนวันล่วงหน้า ${advanceBookingDays} วัน, จำกัดการจองล่วงหน้า ${preventLastMinuteMinutes} นาที, และระยะเวลา Slot ${slotDurationMinutes} นาที หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ใช่, บันทึก',
        cancelButtonText: 'ยกเลิก',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
          cancelButton: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--secondary)]/90 transition-all duration-200 shadow-sm',
        },
      });

      if (!confirm.isConfirmed) {
        setSubmitting(false);
        return;
      }

      const payload = {
        data: {
          advance_booking_days: Number(advanceBookingDays) || 0,
          prevent_last_minute_minutes: Number(preventLastMinuteMinutes) || 0,
          slot_duration_minutes: Number(slotDurationMinutes) || 30,
          is_enabled: !!is_enabled,
          ...(initialData.vaccine?.data?.id && { vaccine: initialData.vaccine.data.id }),
        },
      };

      await validateAuth();
      const token = sessionStorage.getItem('jwt');

      const url = initialData.id
        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings/${initialData.id}?populate=vaccine`
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings?populate=vaccine`;

      const res = await fetch(url, {
        method: initialData.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      let resData;
      try {
        const rawResponseText = await res.text();
        resData = rawResponseText ? JSON.parse(rawResponseText) : {};
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }

      if (!res.ok) {
        const message = resData?.error?.message || res.statusText || `HTTP Error ${res.status}: ไม่สามารถบันทึกการตั้งค่าการจองได้`;
        throw new Error(
          res.status === 401 ? 'Unauthorized' :
          res.status === 403 ? `Forbidden: ${message}` :
          res.status === 400 ? `Bad Request: ${message}` :
          `Failed to ${initialData.id ? 'update' : 'create'} booking setting: ${message}`
        );
      }

      const isV4Format = resData.data && resData.data.id && resData.data.attributes;
      const responseData = isV4Format ? resData.data : resData;

      if (!responseData || !responseData.id) {
        throw new Error('Invalid response structure from server');
      }

      const attributes = isV4Format
        ? {
            advance_booking_days: responseData.attributes.advance_booking_days ?? 0,
            prevent_last_minute_minutes: responseData.attributes.prevent_last_minute_minutes ?? 0,
            slot_duration_minutes: responseData.attributes.slot_duration_minutes ?? 30,
            is_enabled: responseData.attributes.is_enabled ?? true,
            vaccine: responseData.attributes.vaccine?.data ?? initialData.vaccine?.data ?? null,
          }
        : {
            advance_booking_days: responseData.advance_booking_days ?? 0,
            prevent_last_minute_minutes: responseData.prevent_last_minute_minutes ?? 0,
            slot_duration_minutes: responseData.slot_duration_minutes ?? 30,
            is_enabled: responseData.is_enabled ?? true,
            vaccine: responseData.vaccine ? { data: responseData.vaccine } : initialData.vaccine?.data ?? null,
          };

      await MySwal.fire({
        title: 'สำเร็จ',
        text: initialData.id ? 'บันทึกการตั้งค่าเรียบร้อย' : 'สร้างการตั้งค่าใหม่สำเร็จ',
        icon: 'success',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
        confirmButtonText: 'ตกลง',
        timer: 1500,
        showConfirmButton: false,
      });

      onSave({
        id: responseData.id,
        attributes: {
          advance_booking_days: Number(attributes.advance_booking_days) || 0,
          prevent_last_minute_minutes: Number(attributes.prevent_last_minute_minutes) || 0,
          slot_duration_minutes: Number(attributes.slot_duration_minutes) || 30,
          is_enabled: !!attributes.is_enabled,
          vaccine: attributes.vaccine?.data || null,
        },
      });
    } catch (error) {
      console.error('BookingSettingSectionform - Submit Error:', error.message);
      let errorMessage = error.message;
      if (errorMessage.includes('Cannot read properties of undefined')) {
        errorMessage = 'ไม่สามารถบันทึกข้อมูลได้: ข้อมูลวัคซีนหรือโครงสร้างการตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง';
      } else if (errorMessage.includes('Invalid response structure')) {
        errorMessage = 'โครงสร้างข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ';
      } else if (errorMessage.includes('Forbidden')) {
        errorMessage = 'คุณไม่มีสิทธิ์ในการดำเนินการนี้ กรุณาตรวจสอบบทบาทผู้ใช้';
      } else if (errorMessage.includes('Bad Request')) {
        errorMessage = `ข้อมูลที่ส่งไม่ถูกต้อง: ${error.message}`;
      } else if (errorMessage === 'Unauthorized') {
        errorMessage = 'กรุณาเข้าสู่ระบบใหม่';
      } else {
        errorMessage = `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`;
      }

      await MySwal.fire({
        title: error.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
        text: errorMessage,
        icon: 'error',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
        confirmButtonText: 'ตกลง',
      });

      if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('username');
        window.dispatchEvent(new Event('session-updated'));
        router.replace('/login', { scroll: false });
      }
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }

  if (error) {
    return (
      <motion.div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-[var(--background)] font-Prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-[var(--destructive)]/20 to-[var(--destructive)]/10 h-2 rounded-t-[var(--radius)]"></div>
          <Card className="p-6 rounded-[var(--radius)] shadow-lg border border-[var(--border)] bg-[var(--card)]">
            <CardContent className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[var(--destructive)]/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-[var(--destructive)]" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-[var(--foreground)]">เกิดข้อผิดพลาด</h3>
              <p className="text-base text-[var(--muted-foreground)]">{error}</p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-6">
                <Button onClick={onCancel} className="flex items-center gap-2 bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 text-base px-6 py-3 rounded-[var(--radius)] shadow-sm transition-all duration-200">
                  <FontAwesomeIcon icon={faArrowLeft} className="h-5 w-5" />
                  กลับ
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-Prompt bg-[var(--background)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} role="main" aria-label={initialData.id ? 'แก้ไขการตั้งค่าการจอง' : 'สร้างการตั้งค่าการจองใหม่'}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-4 mb-4">
            <motion.button onClick={onCancel} className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <FontAwesomeIcon icon={faArrowLeft} />
            </motion.button>
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                {initialData.id ? 'แก้ไขการตั้งค่าการจอง' : 'สร้างการตั้งค่าการจองใหม่'}
              </h1>
              <p className="text-[var(--muted-foreground)]">
                {initialData.id ? 'อัปเดตการตั้งค่าการจองสำหรับวัคซีน' : 'กำหนดการตั้งค่าการจองใหม่สำหรับวัคซีน'}
              </p>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-full"></div>
        </motion.div>

        {/* Main Content */}
        <motion.div variants={formVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <Card className="rounded-[var(--radius)] shadow-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Vaccine Info */}
                  {vaccineTitle && (
                    <motion.div variants={itemVariants} className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--card-foreground)]">ชื่อวัคซีน</label>
                      <div className="relative">
                        <Input type="text" value={vaccineTitle} readOnly className="w-full px-4 py-3 text-base border border-[var(--border)] bg-[var(--input)]/50 text-[var(--card-foreground)] rounded-[var(--radius)] focus:ring-0 cursor-not-allowed pr-10" aria-label="ชื่อวัคซีน" />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <FontAwesomeIcon icon={faCheckCircle} className="text-[var(--success)]" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Advance Booking Days */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <label htmlFor="advance-booking-days" className="flex items-center gap-2 text-sm font-medium text-[var(--card-foreground)]">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-[var(--primary)]" />
                      จำนวนวันล่วงหน้าที่ให้จอง
                      <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <Input id="advance-booking-days" type="number" min={0} value={advanceBookingDays} onChange={handleNumberChange(setAdvanceBookingDays)} disabled={submitting} className="w-full px-4 py-3 text-base border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--ring)] transition-all duration-300" aria-label="จำนวนวันล่วงหน้าที่ให้จอง" required />
                    <p className="text-xs text-[var(--muted-foreground)]">จำนวนวันสูงสุดที่ผู้ใช้สามารถจองล่วงหน้าได้</p>
                  </motion.div>

                  {/* Prevent Last Minute */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <label htmlFor="prevent-last-minute" className="flex items-center gap-2 text-sm font-medium text-[var(--card-foreground)]">
                      <FontAwesomeIcon icon={faClock} className="text-[var(--primary)]" />
                      จำกัดการจองก่อนเวลานัด (นาที)
                      <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <Input id="prevent-last-minute" type="number" min={0} value={preventLastMinuteMinutes} onChange={handleNumberChange(setPreventLastMinuteMinutes)} disabled={submitting} className="w-full px-4 py-3 text-base border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--ring)] transition-all duration-300" aria-label="จำกัดการจองก่อนเวลานัด (นาที)" required />
                    <p className="text-xs text-[var(--muted-foreground)]">ผู้ใช้ต้องจองล่วงหน้าอย่างน้อยกี่นาทีก่อนเวลานัด</p>
                  </motion.div>

                  {/* Slot Duration */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <label htmlFor="slot-duration" className="flex items-center gap-2 text-sm font-medium text-[var(--card-foreground)]">
                      <FontAwesomeIcon icon={faHourglassHalf} className="text-[var(--primary)]" />
                      ระยะเวลา Slot (นาที)
                      <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <Input id="slot-duration" type="number" min={1} value={slotDurationMinutes} onChange={handleNumberChange(setSlotDurationMinutes)} disabled={submitting} className="w-full px-4 py-3 text-base border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--ring)] transition-all duration-300" aria-label="ระยะเวลาช่วงการจอง (นาที)" required />
                    <p className="text-xs text-[var(--muted-foreground)]">ระยะเวลาสำหรับแต่ละช่วงเวลาการจอง</p>
                  </motion.div>

                  {/* Toggle Switch */}
                  <motion.div 
                    variants={itemVariants} 
                    className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 text-sm font-medium text-[var(--card-foreground)] cursor-pointer group">
                        <motion.div animate={{ rotate: is_enabled ? 360 : 0 }} transition={{ duration: 0.5, ease: "easeInOut" }}>
                          <FontAwesomeIcon 
                            icon={is_enabled ? faToggleOn : faToggleOff} 
                            className={`text-2xl transition-all duration-300 ${
                              is_enabled ? "text-[var(--primary)] drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" : "text-[var(--muted-foreground)]"
                            } group-hover:scale-110`} 
                          />
                        </motion.div>
                        <span className="select-none">{is_enabled ? "เปิดใช้งานแล้ว" : "ปิดใช้งาน"}</span>
                      </label>
                      
                      <div className="relative">
                        <input type="checkbox" checked={is_enabled} onChange={(e) => setIsEnabled(e.target.checked)} disabled={submitting} className="sr-only" aria-label="เปิดใช้งานการตั้งค่าการจอง" />
                        <motion.div
                          onClick={() => !submitting && setIsEnabled(!is_enabled)}
                          className={`relative w-14 h-7 rounded-full transition-all duration-500 cursor-pointer overflow-hidden ${
                            is_enabled 
                              ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] shadow-lg shadow-[var(--primary)]/30' 
                              : 'bg-gradient-to-r from-gray-400 to-gray-500'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {is_enabled && (
                            <motion.div 
                              className="absolute inset-0 bg-white/20"
                              initial={{ x: "-100%" }}
                              animate={{ x: "100%" }}
                              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                            />
                          )}
                          <motion.div
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center ${
                              is_enabled ? 'left-8' : 'left-1'
                            }`}
                            layout
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </motion.div>
                      </div>
                    </div>
                    
                    <motion.p className="text-xs text-[var(--muted-foreground)] pl-11" initial={{ opacity: 0.7 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                      {is_enabled ? "การตั้งค่านี้ถูกเปิดใช้งานแล้ว" : "เปิดหรือปิดการใช้งานการตั้งค่านี้"}
                    </motion.p>
                    
                    {submitting && (
                      <motion.div className="flex items-center gap-2 text-xs text-[var(--primary)]" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        <span>กำลังบันทึกการเปลี่ยนแปลง...</span>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div className="flex justify-end gap-4 pt-4 border-t border-[var(--border)]" variants={itemVariants}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button type="button" onClick={onCancel} disabled={submitting} className="flex items-center gap-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/90 text-base px-6 py-3 rounded-[var(--radius)] shadow-sm transition-all duration-200">
                        <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                        ยกเลิก
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button type="submit" disabled={submitting} className="flex items-center gap-2 bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 text-base px-6 py-3 rounded-[var(--radius)] shadow-sm transition-all duration-200">
                        <FontAwesomeIcon icon={submitting ? faSpinner : faSave} className="h-5 w-5" />
                        {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                      </Button>
                    </motion.div>
                  </motion.div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Info */}
          <div className="lg:col-span-1">
            <Card className="rounded-[var(--radius)] shadow-lg border border-[var(--border)] bg-[var(--card)] h-fit">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-[var(--primary)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">ข้อมูลเพิ่มเติม</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--secondary)]/20 rounded-lg">
                    <h4 className="font-medium text-[var(--foreground)] mb-2">จำนวนวันล่วงหน้า</h4>
                    <p className="text-sm text-[var(--muted-foreground)]">กำหนดจำนวนวันสูงสุดที่ผู้ใช้สามารถจองนัดล่วงหน้าได้</p>
                  </div>
                  <div className="p-4 bg-[var(--secondary)]/20 rounded-lg">
                    <h4 className="font-medium text-[var(--foreground)] mb-2">จำกัดการจองก่อนเวลานัด</h4>
                    <p className="text-sm text-[var(--muted-foreground)]">กำหนดเวลาขั้นต่ำที่ผู้ใช้ต้องจองนัดล่วงหน้าก่อนเวลานัดจริง</p>
                  </div>
                  <div className="p-4 bg-[var(--secondary)]/20 rounded-lg">
                    <h4 className="font-medium text-[var(--foreground)] mb-2">ระยะเวลา Slot</h4>
                    <p className="text-sm text-[var(--muted-foreground)]">กำหนดระยะเวลาสำหรับแต่ละช่วงเวลาการจอง</p>
                  </div>
                  <div className="p-4 bg-[var(--secondary)]/20 rounded-lg">
                    <h4 className="font-medium text-[var(--foreground)] mb-2">สถานะการเปิดใช้งาน</h4>
                    <p className="text-sm text-[var(--muted-foreground)]">ควบคุมการใช้ระบบช่วงเวลา หากปิดใช้งาน ระบบจะไม่ใช้ระบบช่วงเวลา</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}