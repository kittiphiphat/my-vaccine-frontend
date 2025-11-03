'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSyringe, faCalendarAlt, faClock, faHourglassHalf, 
  faToggleOn, faToggleOff, faSave, faTimes, faInfoCircle,
  faSpinner, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const MySwal = withReactContent(Swal);

const buttonVariants = {
  hover: { scale: 1.05, boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.2)' },
  tap: { scale: 0.95 },
};

const customSelectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: 'var(--card)',
    borderColor: 'var(--border)',
    boxShadow: 'none',
    color: 'var(--card-foreground)',
    borderRadius: '0.75rem',
    padding: '0.5rem',
    '&:hover': {
      borderColor: 'var(--primary)',
      transform: 'scale(1.02)',
      transition: 'all 0.3s ease',
    },
    '&:focus-within': {
      borderColor: 'var(--primary)',
      boxShadow: '0 0 0 2px var(--primary)',
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '0.75rem',
    marginTop: '0.25rem',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? 'var(--primary)/0.1' : 'transparent',
    color: 'var(--card-foreground)',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'var(--primary)/0.1',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--card-foreground)',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--muted-foreground)',
  }),
};

const formVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

export default function BookingSettingFormCreate({ onSave, onCancel }) {
  const router = useRouter();
  const [advance_booking_days, setAdvanceBookingDays] = useState(1);
  const [prevent_last_minute_minutes, setPreventLastMinute] = useState(30);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(10);
  const [is_enabled, setIsEnabled] = useState(true);
  const [vaccine, setVaccine] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

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

      if (!roleName || !userId || roleName !== 'admin') {
        throw new Error('Forbidden: Admin access required');
      }

      sessionStorage.setItem('userRole', roleName);
      sessionStorage.setItem('userId', userId);
      sessionStorage.setItem('username', username);
    } catch (err) {
      throw err;
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        await validateAuth();
        const token = sessionStorage.getItem('jwt');

        const [vaccinesRes, bookingSettingsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?pagination[limit]=-1`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
          }),
          fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings?pagination[limit]=-1&populate[vaccine][fields][0]=title`,
            {
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store',
              signal: AbortSignal.timeout(5000),
            }
          ),
        ]);

        if (!vaccinesRes.ok || !bookingSettingsRes.ok) {
          const errorRes = !vaccinesRes.ok ? vaccinesRes : bookingSettingsRes;
          const errorData = await errorRes.json().catch(() => null);
          const message = errorData?.error?.message || errorRes.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
          throw new Error(errorRes.status === 401 ? 'Unauthorized' : errorRes.status === 403 ? `Forbidden: ${message}` : message);
        }

        const vaccinesData = await vaccinesRes.json();
        const bookingSettingsData = await bookingSettingsRes.json();

        const allVaccines = vaccinesData.data || [];
        const bookingSettings = bookingSettingsData.data || [];

        const usedVaccineIds = bookingSettings
          .map((bs) => bs.attributes.vaccine?.data?.id)
          .filter((id) => id !== undefined);

        const filteredVaccines = allVaccines.filter((v) => !usedVaccineIds.includes(v.id));
        setVaccines(filteredVaccines);
        if (filteredVaccines.length > 0) {
          setVaccine({ value: filteredVaccines[0].id, label: filteredVaccines[0].attributes.title });
        }
      } catch (error) {
        await MySwal.fire({
          title: error.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
          text: error.message.includes('Forbidden')
            ? 'คุณไม่มีสิทธิ์ในการเข้าถึงข้อมูลนี้ กรุณาตรวจสอบบทบาทผู้ใช้'
            : error.message === 'Unauthorized'
            ? 'กรุณาเข้าสู่ระบบใหม่'
            : `ไม่สามารถโหลดข้อมูลวัคซีนได้: ${error.message}`,
          icon: 'error',
          customClass: {
            popup: 'rounded-xl shadow-lg border border-[var(--border)] bg-[var(--card)]/95 dark:bg-[var(--card)]/95 backdrop-blur-xl p-6 max-w-[90vw]',
            title: 'text-lg font-semibold text-[var(--card-foreground)]',
            htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
            confirmButton:
              'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-xl font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
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
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  const vaccineOptions = vaccines.map((v) => ({
    value: v.id,
    label: v.attributes.title,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate vaccine selection
    if (!vaccine || !vaccine.value) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณาเลือกวัคซีนที่ถูกต้อง',
        icon: 'warning',
        customClass: {
          popup: 'rounded-xl shadow-lg border border-[var(--border)] bg-[var(--card)]/95 dark:bg-[var(--card)]/95 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton:
            'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-xl font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    // Validate vaccine ID exists in vaccines
    const isValidVaccine = vaccines.some((v) => v.id === vaccine.value);
    if (!isValidVaccine) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'วัคซีนที่เลือกไม่ถูกต้องหรือไม่มีอยู่ในระบบ',
        icon: 'warning',
        customClass: {
          popup: 'rounded-xl shadow-lg border border-[var(--border)] bg-[var(--card)]/95 dark:bg-[var(--card)]/95 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton:
            'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-xl font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    // Validate no available vaccines
    if (vaccines.length === 0) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'ไม่มีวัคซีนที่สามารถเลือกได้ กรุณาเพิ่มวัคซีนในระบบก่อน',
        icon: 'warning',
        customClass: {
          popup: 'rounded-xl shadow-lg border border-[var(--border)] bg-[var(--card)]/95 dark:bg-[var(--card)]/95 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton:
            'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-xl font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    // Validate numeric inputs
    if (
      advance_booking_days < 0 ||
      prevent_last_minute_minutes < 0 ||
      slotDurationMinutes <= 0
    ) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณากรอกตัวเลขให้ถูกต้อง (ระยะเวลา Slot ต้องมากกว่า 0)',
        icon: 'warning',
        customClass: {
          popup: 'rounded-xl shadow-lg border border-[var(--border)] bg-[var(--card)]/95 dark:bg-[var(--card)]/95 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton:
            'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-xl font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    const confirm = await MySwal.fire({
      title: 'ยืนยันการบันทึก?',
      text: 'คุณต้องการสร้างการตั้งค่านี้หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, บันทึก',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-xl shadow-lg border border-[var(--border)] bg-[var(--card)]/95 dark:bg-[var(--card)]/95 backdrop-blur-xl p-6 max-w-[90vw]',
        title: 'text-lg font-semibold text-[var(--card-foreground)]',
        htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
        confirmButton:
          'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-xl font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
        cancelButton:
          'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-4 py-2 rounded-xl font-semibold hover:bg-[var(--secondary)]/80 transition-all duration-300',
      },
    });

    if (!confirm.isConfirmed) {
      setSubmitting(false);
      return;
    }

    try {
      await validateAuth();
      const token = sessionStorage.getItem('jwt');

      const payload = {
        data: {
          advance_booking_days: Number(advance_booking_days) || 1,
          prevent_last_minute_minutes: Number(prevent_last_minute_minutes) || 30,
          slotDurationMinutes: Number(slotDurationMinutes) || 10,
          is_enabled: !!is_enabled,
          vaccine: vaccine.value,
        },
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings?populate=vaccine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const rawResponseText = await res.text();
      let resData;
      try {
        resData = rawResponseText ? JSON.parse(rawResponseText) : {};
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }

      if (!res.ok) {
        const message = resData?.error?.message || res.statusText || `HTTP Error ${res.status}: ไม่สามารถบันทึกการตั้งค่าการจองได้`;
        throw new Error(
          res.status === 401
            ? 'Unauthorized'
            : res.status === 403
            ? `Forbidden: ${message}`
            : res.status === 400
            ? `Bad Request: ${message}`
            : `Failed to create booking setting: ${message}`
        );
      }

      const isV4Format = resData.data && resData.data.id && resData.data.attributes;
      const responseData = isV4Format ? resData.data : resData;

      if (!responseData || !responseData.id) {
        throw new Error('Invalid response structure from server');
      }

      const attributes = isV4Format
        ? {
            advance_booking_days: responseData.attributes.advance_booking_days ?? 1,
            prevent_last_minute_minutes: responseData.attributes.prevent_last_minute_minutes ?? 30,
            slotDurationMinutes: responseData.attributes.slotDurationMinutes ?? 10,
            is_enabled: responseData.attributes.is_enabled ?? true,
            vaccine: responseData.attributes.vaccine?.data ?? { id: vaccine.value, attributes: { title: vaccine.label } },
          }
        : {
            advance_booking_days: responseData.advance_booking_days ?? 1,
            prevent_last_minute_minutes: responseData.prevent_last_minute_minutes ?? 30,
            slotDurationMinutes: responseData.slot_duration_minutes ?? 10,
            is_enabled: responseData.is_enabled ?? true,
            vaccine: responseData.vaccine ? { data: responseData.vaccine } : { data: { id: vaccine.value, attributes: { title: vaccine.label } } },
          };

      await MySwal.fire({
        title: 'สำเร็จ',
        text: 'เพิ่มการตั้งค่าการจองเรียบร้อยแล้ว',
        icon: 'success',
        customClass: {
          popup: 'rounded-xl shadow-lg border border-[var(--border)] bg-[var(--card)]/95 dark:bg-[var(--card)]/95 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
        },
        confirmButtonText: 'ตกลง',
        timer: 1500,
        showConfirmButton: false,
      });

      onSave({
        id: responseData.id,
        attributes,
      });
    } catch (error) {
      await MySwal.fire({
        title: error.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
        text: error.message.includes('Forbidden')
          ? 'คุณไม่มีสิทธิ์ในการดำเนินการนี้ กรุณาตรวจสอบบทบาทผู้ใช้'
          : error.message === 'Unauthorized'
          ? 'กรุณาเข้าสู่ระบบใหม่'
          : error.message.includes('Invalid JSON response')
          ? 'เซิร์ฟเวอร์ส่งคืนข้อมูลที่ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ'
          : error.message.includes('Invalid response structure')
          ? 'โครงสร้างข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ'
          : error.message.includes('Bad Request')
          ? `ข้อมูลที่ส่งไม่ถูกต้อง: ${error.message}`
          : `ไม่สามารถบันทึกการตั้งค่าการจองได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'rounded-xl shadow-lg border border-[var(--border)] bg-[var(--card)]/95 dark:bg-[var(--card)]/95 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton:
            'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-xl font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
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
    }
  };

  if (loading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-screen bg-[var(--background)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-16 h-16 border-4 rounded-full border-[var(--border)] border-t-[var(--primary)] animate-spin"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
        <p className="mt-4 text-base font-medium text-[var(--muted-foreground)] font-Prompt">
          กำลังโหลดข้อมูล...
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-Prompt bg-[var(--background)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <motion.button
              onClick={onCancel}
              className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </motion.button>
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                สร้างการตั้งค่าการจองใหม่
              </h1>
              <p className="text-[var(--muted-foreground)]">
                กำหนดการตั้งค่าการจองใหม่สำหรับวัคซีน
              </p>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-full"></div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          variants={formVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <div className="bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] overflow-hidden">
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Vaccine Selection */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--card-foreground)]">
                      <FontAwesomeIcon icon={faSyringe} className="text-[var(--primary)]" />
                      วัคซีน
                      <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <Select
                      options={vaccineOptions}
                      value={vaccine}
                      onChange={setVaccine}
                      placeholder="-- เลือกวัคซีน --"
                      noOptionsMessage={() => 'ไม่มีวัคซีนให้เลือก'}
                      isDisabled={submitting}
                      styles={customSelectStyles}
                      aria-label="เลือกวัคซีนสำหรับการตั้งค่าการจอง"
                      required
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      เลือกวัคซีนที่ต้องการตั้งค่าการจอง
                    </p>
                  </motion.div>

                  {/* Advance Booking Days */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--card-foreground)]">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-[var(--primary)]" />
                      จองล่วงหน้า (วัน)
                      <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={advance_booking_days}
                      onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
                      disabled={submitting}
                      className="w-full px-4 py-3 text-base border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--ring)] transition-all duration-300"
                      aria-label="จำนวนวันจองล่วงหน้า"
                      required
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      จำนวนวันสูงสุดที่ผู้ใช้สามารถจองล่วงหน้าได้
                    </p>
                  </motion.div>

                  {/* Prevent Last Minute */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--card-foreground)]">
                      <FontAwesomeIcon icon={faClock} className="text-[var(--primary)]" />
                      เวลากั้นการจอง (นาที)
                      <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={prevent_last_minute_minutes}
                      onChange={(e) => setPreventLastMinute(Number(e.target.value))}
                      disabled={submitting}
                      className="w-full px-4 py-3 text-base border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--ring)] transition-all duration-300"
                      aria-label="เวลากั้นการจอง (นาที)"
                      required
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      ผู้ใช้ต้องจองล่วงหน้าอย่างน้อยกี่นาทีก่อนเวลานัด
                    </p>
                  </motion.div>

                  {/* Slot Duration */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--card-foreground)]">
                      <FontAwesomeIcon icon={faHourglassHalf} className="text-[var(--primary)]" />
                      ระยะเวลา Slot (นาที)
                      <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={slotDurationMinutes}
                      onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                      disabled={submitting}
                      className="w-full px-4 py-3 text-base border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--ring)] transition-all duration-300"
                      aria-label="ระยะเวลาช่วงการจอง (นาที)"
                      required
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      ระยะเวลาสำหรับแต่ละช่วงเวลาการจอง
                    </p>
                  </motion.div>
                      <motion.div
                        variants={itemVariants}
                        className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 shadow-lg"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3 text-sm font-medium text-[var(--card-foreground)] cursor-pointer group">
                            <motion.div
                              animate={{ rotate: is_enabled ? 360 : 0 }}
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                            >
                              <FontAwesomeIcon
                                icon={is_enabled ? faToggleOn : faToggleOff}
                                className={`text-2xl transition-all duration-300 ${
                                  is_enabled
                                    ? "text-[var(--primary)] drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                                    : "text-[var(--muted-foreground)]"
                                } group-hover:scale-110`}
                              />
                            </motion.div>
                            <span className="select-none">{is_enabled ? "เปิดใช้งานแล้ว" : "ปิดใช้งาน"}</span>
                          </label>

                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={is_enabled}
                              onChange={(e) => setIsEnabled(e.target.checked)}
                              disabled={submitting}
                              className="sr-only"
                              aria-label="เปิดใช้งานการตั้งค่าการจอง"
                            />
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
                              {/* เอฟเฟกต์แสงเคลื่อนที่ */}
                              {is_enabled && (
                                <motion.div
                                  className="absolute inset-0 bg-white/20"
                                  initial={{ x: "-100%" }}
                                  animate={{ x: "100%" }}
                                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                                />
                              )}

                              {/* ลูกกลมในสวิตช์ */}
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

                        <motion.p
                          className="text-xs text-[var(--muted-foreground)] pl-11"
                          initial={{ opacity: 0.7 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          {is_enabled ? "การตั้งค่านี้ถูกเปิดใช้งานแล้ว" : "เปิดหรือปิดการใช้งานการตั้งค่านี้"}
                        </motion.p>

                        {/* แสดงสถานะเมื่อกำลังบันทึก */}
                        {submitting && (
                          <motion.div
                            className="flex items-center gap-2 text-xs text-[var(--primary)]"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            <span>กำลังบันทึกการเปลี่ยนแปลง...</span>
                          </motion.div>
                        )}
                      </motion.div>
                  <motion.div
                    className="flex justify-end gap-4 pt-4 border-t border-[var(--border)]"
                    variants={itemVariants}
                  >
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        variant="secondary"
                        className="flex items-center gap-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/90 text-base px-6 py-3 rounded-[var(--radius)] shadow-sm transition-all duration-200"
                        aria-label="ยกเลิกการตั้งค่าการจอง"
                      >
                        <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
                        ยกเลิก
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 text-base px-6 py-3 rounded-[var(--radius)] shadow-sm transition-all duration-200"
                        aria-label="บันทึกการตั้งค่าการจอง"
                      >
                        <FontAwesomeIcon icon={submitting ? faClock : faSave} className="h-5 w-5" />
                        {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                      </Button>
                    </motion.div>
                  </motion.div>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column - Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] h-fit">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-[var(--primary)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">ข้อมูลเพิ่มเติม</h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-[var(--secondary)]/20 rounded-lg">
                    <h4 className="font-medium text-[var(--foreground)] mb-2">จำนวนวันล่วงหน้า</h4>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      กำหนดจำนวนวันสูงสุดที่ผู้ใช้สามารถจองนัดล่วงหน้าได้ เช่น หากตั้งค่าเป็น 7 วัน ผู้ใช้จะสามารถจองนัดได้ล่วงหน้าไม่เกิน 7 วัน
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--secondary)]/20 rounded-lg">
                    <h4 className="font-medium text-[var(--foreground)] mb-2">จำกัดการจองก่อนเวลานัด</h4>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      กำหนดเวลาขั้นต่ำที่ผู้ใช้ต้องจองนัดล่วงหน้าก่อนเวลานัดจริง เช่น หากตั้งค่าเป็น 60 นาที ผู้ใช้ต้องจองนัดล่วงหน้าอย่างน้อย 1 ชั่วโมง
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--secondary)]/20 rounded-lg">
                    <h4 className="font-medium text-[var(--foreground)] mb-2">ระยะเวลา Slot</h4>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      กำหนดระยะเวลาสำหรับแต่ละช่วงเวลาการจอง ซึ่งจะส่งผลต่อจำนวนการจองที่สามารถทำได้ในแต่ละช่วงเวลา
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--secondary)]/20 rounded-lg">
                    <h4 className="font-medium text-[var(--foreground)] mb-2">สถานะการเปิดใช้งาน</h4>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      ควบคุมว่าจะให้ผู้ใช้สามารถจองนัดสำหรับวัคซีนนี้ได้หรือไม่ หากปิดใช้งาน ผู้ใช้จะไม่สามารถจองนัดได้
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}