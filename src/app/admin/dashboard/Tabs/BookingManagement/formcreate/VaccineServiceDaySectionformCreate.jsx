'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheck, faCalendarAlt, faSyringe, faClock, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const MySwal = withReactContent(Swal);

const customSelectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: 'var(--card)',
    borderColor: 'var(--border)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    color: 'var(--card-foreground)',
    borderRadius: 'var(--radius)',
    padding: '0.75rem',
    minHeight: '48px',
    fontSize: 'var(--font-size-base)',
    '&:hover': {
      borderColor: 'var(--primary)',
      transform: 'translateY(-1px)',
      transition: 'all 0.2s ease',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    '&:focus-within': {
      borderColor: 'var(--primary)',
      boxShadow: '0 0 0 3px rgba(38, 166, 154, 0.2)',
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    marginTop: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    backdropFilter: 'blur(10px)',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isDisabled ? 'var(--muted)' : state.isFocused ? 'var(--secondary)' : 'transparent',
    color: state.isDisabled ? 'var(--muted-foreground)' : 'var(--card-foreground)',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    opacity: state.isDisabled ? 0.5 : 1,
    padding: '12px 16px',
    '&:hover': {
      backgroundColor: state.isDisabled ? 'var(--muted)' : 'var(--secondary)',
    },
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)',
    borderRadius: '20px',
    padding: '4px 8px',
    margin: '4px',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'var(--primary-foreground)',
    fontWeight: '500',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'var(--primary-foreground)',
    opacity: 0.7,
    ':hover': {
      backgroundColor: 'var(--primary)',
      color: 'var(--primary-foreground)',
      opacity: 1,
      cursor: 'pointer',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--muted-foreground)',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--card-foreground)',
    fontWeight: '500',
  }),
};

const dayOptions = [
  { value: 0, label: 'อาทิตย์' },
  { value: 1, label: 'จันทร์' },
  { value: 2, label: 'อังคาร' },
  { value: 3, label: 'พุธ' },
  { value: 4, label: 'พฤหัสบดี' },
  { value: 5, label: 'ศุกร์' },
  { value: 6, label: 'เสาร์' },
];

// Simple JWT validation function
function isValidJwt(token) {
  if (!token || typeof token !== 'string') return false;
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
  if (!jwtRegex.test(token)) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

export default function VaccineServiceDayFormCreate({ onSave, onCancel }) {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [usedDays, setUsedDays] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch vaccines and existing service days
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const token = sessionStorage.getItem('jwt');
        const userRole = sessionStorage.getItem('userRole');
        if (!token || !isValidJwt(token)) throw new Error('Unauthorized: Invalid or missing token');
        if (!userRole || userRole.toLowerCase() !== 'admin') throw new Error('Forbidden: Admin access required');

        const [vaccineRes, dayRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?pagination[limit]=-1`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }),
          fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days?pagination[limit]=-1&populate[vaccine][fields][0]=id&populate[vaccine][fields][1]=title`,
            {
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store',
            }
          ),
        ]);

        if (!vaccineRes.ok || !dayRes.ok) {
          const errorRes = !vaccineRes.ok ? vaccineRes : dayRes;
          const errorData = await errorRes.json().catch(() => null);
          const message = errorData?.error?.message || errorRes.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
          throw new Error(errorRes.status === 401 ? 'Unauthorized: Invalid token' : errorRes.status === 403 ? `Forbidden: ${message}` : message);
        }

        const vaccineJson = await vaccineRes.json();
        const dayJson = await dayRes.json();

        const allVaccines = vaccineJson.data ? vaccineJson.data : vaccineJson;
        const serviceDays = dayJson.data ? dayJson.data : dayJson;

        const usedVaccineIds = new Set(
          serviceDays
            .map((d) => (d.attributes?.vaccine?.data?.id || d.vaccine?.id))
            .filter(Boolean)
        );

        const availableVaccines = allVaccines.filter((v) => {
          const vaccineId = v.id || v.attributes?.id;
          return !usedVaccineIds.has(vaccineId);
        });

        const vaccineOptions = availableVaccines.length > 0
          ? availableVaccines.map((v) => ({
              value: v.id || v.attributes?.id,
              label: v.attributes?.title || v.title || `วัคซีน ID: ${v.id || v.attributes?.id}`,
            }))
          : allVaccines.map((v) => ({
              value: v.id || v.attributes?.id,
              label: v.attributes?.title || v.title || `วัคซีน ID: ${v.id || v.attributes?.id}`,
              isDisabled: true,
            }));

        setVaccines(vaccineOptions);

        if (vaccineOptions.every((v) => v.isDisabled)) {
          await MySwal.fire({
            title: 'คำเตือน',
            text: 'ไม่มีวัคซีนที่ยังไม่กำหนดวันให้บริการ วัคซีนทั้งหมดจะแสดงในโหมดปิดใช้งาน',
            icon: 'warning',
            customClass: {
              popup: 'rounded-[var(--radius)] shadow-xl border border-[var(--border)] p-6 max-w-md',
              title: 'text-xl font-bold text-[var(--card-foreground)]',
              htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
              confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-opacity-90 transition-all duration-300',
            },
            confirmButtonText: 'ตกลง',
          });
        }
      } catch (err) {
        await MySwal.fire({
          title: err.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
          text: err.message.includes('Forbidden') ? 'คุณไม่มีสิทธิ์ในการเข้าถึงข้อมูลนี้ กรุณาตรวจสอบบทบาทผู้ใช้' :
                err.message.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' :
                `ไม่สามารถโหลดข้อมูลวัคซีนได้: ${err.message}`,
          icon: 'error',
          customClass: {
            popup: 'rounded-[var(--radius)] shadow-xl border border-[var(--border)] p-6 max-w-md',
            title: 'text-xl font-bold text-[var(--card-foreground)]',
            htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
            confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-opacity-90 transition-all duration-300',
          },
          confirmButtonText: 'ตกลง',
        });
        if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
          sessionStorage.removeItem('jwt');
          sessionStorage.removeItem('userRole');
          router.replace('/login');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  // Fetch used days when vaccine changes
  useEffect(() => {
    async function fetchUsedDays() {
      if (!selectedVaccine) {
        setUsedDays(new Set());
        setSelectedDays([]);
        return;
      }

      try {
        const token = sessionStorage.getItem('jwt');
        if (!token || !isValidJwt(token)) throw new Error('Unauthorized: Invalid or missing token');

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days?filters[vaccine][id][$eq]=${selectedVaccine.value}&pagination[limit]=-1`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          const message = errorData?.error?.message || 'ไม่สามารถโหลดข้อมูลวันซ้ำได้';
          throw new Error(res.status === 401 ? 'Unauthorized: Invalid token' : res.status === 403 ? `Forbidden: ${message}` : message);
        }

        const json = await res.json();
        const existing = json.data ? json.data : json;
        const used = new Set();
        existing.forEach((item) => {
          const days = item.attributes?.day_of_week || item.day_of_week || [];
          days.forEach((d) => used.add(d));
        });

        setUsedDays(used);
        setSelectedDays((prev) => prev.filter((d) => !used.has(d.value)));
      } catch (err) {
        await MySwal.fire({
          title: err.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
          text: err.message.includes('Forbidden') ? 'คุณไม่มีสิทธิ์ในการเข้าถึงข้อมูลนี้ กรุณาตรวจสอบบทบาทผู้ใช้' :
                err.message.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' :
                `ไม่สามารถโหลดข้อมูลวันซ้ำได้: ${err.message}`,
          icon: 'error',
          customClass: {
            popup: 'rounded-[var(--radius)] shadow-xl border border-[var(--border)] p-6 max-w-md',
            title: 'text-xl font-bold text-[var(--card-foreground)]',
            htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
            confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-opacity-90 transition-all duration-300',
          },
          confirmButtonText: 'ตกลง',
        });
        if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
          sessionStorage.removeItem('jwt');
          sessionStorage.removeItem('userRole');
          router.replace('/login');
        }
      }
    }
    fetchUsedDays();
  }, [selectedVaccine, router]);

  const updatedDayOptions = dayOptions.map((day) => ({
    ...day,
    isDisabled: usedDays.has(day.value),
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!selectedDays.length) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณาเลือกวันให้บริการ',
        icon: 'warning',
        customClass: {
          popup: 'rounded-[var(--radius)] shadow-xl border border-[var(--border)] p-6 max-w-md',
          title: 'text-xl font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-opacity-90 transition-all duration-300',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    if (!selectedVaccine) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณาเลือกวัคซีน',
        icon: 'warning',
        customClass: {
          popup: 'rounded-[var(--radius)] shadow-xl border border-[var(--border)] p-6 max-w-md',
          title: 'text-xl font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-opacity-90 transition-all duration-300',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    const confirm = await MySwal.fire({
      title: 'ยืนยันการสร้างวันให้บริการ?',
      text: `คุณต้องการสร้างวันให้บริการ ${selectedDays.map((d) => d.label).join(', ')} สำหรับ ${selectedVaccine.label} หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, บันทึก',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[var(--radius)] shadow-xl border border-[var(--border)] p-6 max-w-md',
        title: 'text-xl font-bold text-[var(--card-foreground)]',
        htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
        confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-opacity-90 transition-all duration-300',
        cancelButton: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-opacity-90 transition-all duration-300',
      },
    });

    if (!confirm.isConfirmed) {
      setSubmitting(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const token = sessionStorage.getItem('jwt');
      const userRole = sessionStorage.getItem('userRole');
      if (!token || !isValidJwt(token)) throw new Error('Unauthorized: Invalid or missing token');
      if (!userRole || userRole.toLowerCase() !== 'admin') throw new Error('Forbidden: Admin access required');

      const payload = {
        data: {
          day_of_week: selectedDays.map((d) => d.value),
          vaccine: selectedVaccine.value,
        },
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || 'ไม่สามารถบันทึกวันให้บริการได้';
        throw new Error(res.status === 401 ? 'Unauthorized: Invalid token' : res.status === 403 ? `Forbidden: ${message}` : message);
      }

      await res.json();

      await MySwal.fire({
        title: 'สำเร็จ',
        text: 'เพิ่มวันให้บริการเรียบร้อยแล้ว',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-[var(--radius)] shadow-xl border border-[var(--border)] p-6 max-w-md',
          title: 'text-xl font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
        },
      });
      onSave();
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      await MySwal.fire({
        title: isTimeout ? 'หมดเวลา' : err.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
        text: isTimeout ? 'การเชื่อมต่อใช้เวลานานเกินไป' :
              err.message.includes('Forbidden') ? 'คุณไม่มีสิทธิ์ในการดำเนินการนี้ กรุณาตรวจสอบบทบาทผู้ใช้' :
              err.message.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' :
              `ไม่สามารถบันทึกข้อมูลได้: ${err.message}`,
        icon: 'error',
        customClass: {
          popup: 'rounded-[var(--radius)] shadow-xl border border-[var(--border)] p-6 max-w-md',
          title: 'text-xl font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-opacity-90 transition-all duration-300',
        },
        confirmButtonText: 'ตกลง',
      });
      if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('userRole');
        router.replace('/login');
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
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon icon={faSyringe} className="text-[var(--primary)] text-xl" />
          </div>
        </motion.div>
        <p className="mt-6 text-lg font-medium text-[var(--muted-foreground)]">
          กำลังโหลดข้อมูล...
        </p>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-[var(--card)] rounded-[var(--radius)] shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-[var(--primary)] p-6 md:p-8">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-[var(--primary-foreground)] text-xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--primary-foreground)]">สร้างวันให้บริการวัคซีน</h1>
                <p className="text-white/80 mt-1">กำหนดวันที่สามารถให้บริการวัคซีนแต่ละชนิด</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Vaccine Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center space-x-2 mb-3">
                <FontAwesomeIcon icon={faSyringe} className="text-[var(--primary)]" />
                <label className="text-lg font-semibold text-[var(--card-foreground)]">
                  เลือกวัคซีน
                </label>
              </div>
              {vaccines.length > 0 ? (
                <Select
                  options={vaccines}
                  value={selectedVaccine}
                  onChange={setSelectedVaccine}
                  placeholder="-- เลือกวัคซีน --"
                  noOptionsMessage={() => 'ไม่พบวัคซีน'}
                  isClearable
                  isDisabled={submitting}
                  styles={customSelectStyles}
                  aria-label="เลือกวัคซีนสำหรับวันให้บริการ"
                />
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-[var(--radius)] p-4">
                  <div className="flex items-center space-x-2">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600 dark:text-amber-400" />
                    <p className="text-amber-800 dark:text-amber-200 font-medium">
                      ไม่พบวัคซีนที่สามารถกำหนดวันให้บริการได้
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Days Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center space-x-2 mb-3">
                <FontAwesomeIcon icon={faClock} className="text-[var(--primary)]" />
                <label className="text-lg font-semibold text-[var(--card-foreground)]">
                  เลือกวันที่ให้บริการ
                </label>
              </div>
              <Select
                options={updatedDayOptions}
                isMulti
                value={selectedDays}
                onChange={setSelectedDays}
                placeholder="-- เลือกวัน --"
                noOptionsMessage={() => 'ไม่มีวันให้เลือก'}
                isDisabled={submitting || !selectedVaccine}
                styles={customSelectStyles}
                aria-label="เลือกวันในสัปดาห์สำหรับให้บริการ"
              />
              {selectedVaccine && (
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  วันที่ถูกใช้งานแล้วจะแสดงเป็นสีเทา
                </p>
              )}
            </motion.div>

            {/* Selected Days Preview */}
            {selectedDays.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[var(--secondary)] rounded-[var(--radius)] p-4"
              >
                <p className="text-sm font-medium text-[var(--card-foreground)] mb-2">วันที่เลือก:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDays.map((day) => (
                    <div
                      key={day.value}
                      className="bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {day.label}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 pt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-[var(--radius)] font-medium hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FontAwesomeIcon icon={faTimes} />
                ยกเลิก
              </motion.button>
              <motion.button
                type="submit"
                disabled={submitting || !selectedVaccine || selectedDays.length === 0}
                className="flex-1 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] font-medium hover:bg-opacity-90 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FontAwesomeIcon icon={faCheck} />
                {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </motion.button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}