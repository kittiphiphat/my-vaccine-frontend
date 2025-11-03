'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSun,
  faMoon,
  faCalendarDay,
  faCalendar,
  faCalendarWeek,
  faCalendarAlt,
  faCalendarCheck,
  faXmark,
  faCheck,
  faSyringe,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { Input } from '@/components/ui/input';

const MySwal = withReactContent(Swal);

const dayOptions = [
  { value: 0, label: 'วันอาทิตย์' },
  { value: 1, label: 'วันจันทร์' },
  { value: 2, label: 'วันอังคาร' },
  { value: 3, label: 'วันพุธ' },
  { value: 4, label: 'วันพฤหัสบดี' },
  { value: 5, label: 'วันศุกร์' },
  { value: 6, label: 'วันเสาร์' },
];

const dayIcons = {
  0: faSun,
  1: faMoon,
  2: faCalendarDay,
  3: faCalendar,
  4: faCalendarWeek,
  5: faCalendarAlt,
  6: faCalendarCheck,
};

function isValidJwt(token) {
  if (!token || typeof token !== 'string') return false;
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
  if (!jwtRegex.test(token)) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !payload.exp || Date.now() < payload.exp * 1000;
  } catch {
    return false;
  }
}

export default function VaccineServiceDayForm({ initialData = {}, onSave = () => {}, onCancel = () => {} }) {
  const router = useRouter();
  const [days, setDays] = useState(initialData.day_of_week || []);
  const [submitting, setSubmitting] = useState(false);

  const vaccineTitle =
    initialData?.vaccine?.data?.attributes?.title ||
    initialData?.vaccine?.attributes?.title ||
    'กรุณาเลือกวัคซีน';
  const vaccineId =
    initialData?.vaccine?.data?.id
      ? String(initialData.vaccine.data.id)
      : initialData?.vaccine?.id
      ? String(initialData.vaccine.id)
      : null;

  useEffect(() => {
    setDays(initialData.day_of_week || []);
  }, [initialData]);

  async function validateAuth() {
    const token = sessionStorage.getItem('jwt');
    if (!token || !isValidJwt(token)) throw new Error('ไม่พบโทเค็น');
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('ไม่พบโทเค็น');
    const data = await res.json();
    const roleName = data?.role?.name?.toLowerCase() || data?.data?.attributes?.role?.data?.attributes?.name?.toLowerCase();
    if (roleName !== 'admin') throw new Error('ต้องเป็น admin');
  }

  const toggleDay = (day) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    if (!vaccineId || days.length === 0) {
      await MySwal.fire({ title: 'แจ้งเตือน', text: 'กรุณาเลือกวัคซีนและวัน', icon: 'warning' });
      setSubmitting(false);
      return;
    }

    const confirm = await MySwal.fire({
      title: initialData.id ? 'ยืนยันการแก้ไข' : 'ยืนยันการสร้าง',
      icon: 'question',
      showCancelButton: true,
    });
    if (!confirm.isConfirmed) {
      setSubmitting(false);
      return;
    }

    try {
      await validateAuth();
      const token = sessionStorage.getItem('jwt');
      const payload = { data: { day_of_week: days, vaccine: vaccineId } };
      const url = initialData.id
        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days/${initialData.id}`
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days`;

      const res = await fetch(url, {
        method: initialData.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('ไม่สามารถบันทึกได้');
      await MySwal.fire({ title: 'สำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
      onSave({ id: initialData.id, attributes: { day_of_week: days, vaccine: { data: { id: vaccineId } } } });
    } catch (error) {
      await MySwal.fire({ title: 'เกิดข้อผิดพลาด', text: error.message, icon: 'error' });
      if (error.message.includes('โทเค็น')) {
        sessionStorage.clear();
        router.replace('/login');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {initialData.id ? 'แก้ไขวันให้บริการ' : 'สร้างวันให้บริการ'}
                  </h1>
                  <p className="text-white/80">กำหนดวันที่ให้บริการ</p>
                </div>
              </div>
              <motion.button
                onClick={onCancel}
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </motion.button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {vaccineTitle && (
              <div>
                <label className="block text-sm font-medium text-[var(--card-foreground)] mb-2">วัคซีน</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faSyringe} className="text-[var(--muted-foreground)]" />
                  </div>
                  <Input
                    value={vaccineTitle}
                    readOnly
                    className="pl-10 pr-4 py-3 w-full border border-[var(--border)] bg-[var(--secondary)] text-[var(--card-foreground)] focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--card-foreground)] mb-2">วันให้บริการ</label>
              <div className="flex flex-wrap gap-3">
                {dayOptions.map(({ value, label }) => (
                  <motion.div key={value} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <label
                      className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        days.includes(value)
                          ? 'border-[var(--primary)] bg-[var(--secondary-light)]'
                          : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/50'
                      } ${!vaccineId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={days.includes(value)}
                        onChange={() => toggleDay(value)}
                        disabled={submitting || !vaccineId}
                        className="sr-only"
                      />
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                          days.includes(value)
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--secondary)] text-[var(--card-foreground)]'
                        }`}
                      >
                        <FontAwesomeIcon icon={dayIcons[value]} />
                      </div>
                      <span className={`text-sm font-medium ${days.includes(value) ? 'text-[var(--primary)]' : 'text-[var(--card-foreground)]'}`}>
                        {label}
                      </span>
                      {days.includes(value) && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center">
                          <FontAwesomeIcon icon={faCheck} className="text-white text-xs" />
                        </div>
                      )}
                    </label>
                  </motion.div>
                ))}
              </div>
              {days.length > 0 && (
                <div className="mt-3 p-3 bg-[var(--secondary)] rounded-lg">
                  <p className="text-sm text-[var(--card-foreground)]">
                    เลือกแล้ว {days.length} วัน: {days.map((d) => dayOptions.find((o) => o.value === d)?.label).join(', ')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <motion.button
                onClick={onCancel}
                disabled={submitting}
                className="px-6 py-3 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-[var(--radius)] font-medium hover:bg-[var(--secondary)]/80 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faXmark} />
                ยกเลิก
              </motion.button>
              <motion.button
                onClick={handleSubmit}
                disabled={submitting || !vaccineId || days.length === 0}
                className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/80 flex items-center gap-2 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faCheck} />
                {submitting ? 'กำลังบันทึก...' : initialData.id ? 'บันทึก' : 'สร้าง'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}