'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck, faClock, faSyringe, faCircle, faArrowRight, faEdit, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MySwal = withReactContent(Swal);

// 保留原有的辅助函数...
function generateTimeOptions(serviceStartTime, serviceEndTime, intervalMinutes = 15) {
  const times = [];
  const startHour = parseInt(serviceStartTime?.slice(0, 2), 10) || 8;
  const startMinute = parseInt(serviceStartTime?.slice(3, 5), 10) || 0;
  const endHour = parseInt(serviceEndTime?.slice(0, 2), 10) || 17;
  const endMinute = parseInt(serviceEndTime?.slice(3, 5), 10) || 0;

  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;

  if (endTimeInMinutes <= startTimeInMinutes) return [];

  for (let current = startTimeInMinutes; current <= endTimeInMinutes; current += intervalMinutes) {
    const hour = Math.floor(current / 60);
    const min = current % 60;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    times.push({ value: timeStr, label: timeStr });
  }
  return times;
}

function timeToMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function filterAvailableTimes(allTimes, allSlots, currentId, selectedVaccineId) {
  if (!allSlots || allSlots.length === 0 || !selectedVaccineId) return allTimes;

  return allTimes.filter((time) => {
    const timeMinutes = timeToMinutes(time.value);
    for (const slot of allSlots) {
      if (currentId && slot.id === currentId) continue;
      if (slot.attributes?.vaccine?.data?.id !== selectedVaccineId) continue;
      const slotStartMinutes = timeToMinutes(slot.attributes?.startTime?.slice(0, 5));
      const slotEndMinutes = timeToMinutes(slot.attributes?.endTime?.slice(0, 5));
      if (timeMinutes >= slotStartMinutes && timeMinutes <= slotEndMinutes) {
        return false;
      }
    }
    return true;
  });
}

function checkTimeOverlap(startTime, endTime, allSlots, currentId, vaccineId) {
  const startMinutes = timeToMinutes(startTime?.slice(0, 5));
  const endMinutes = timeToMinutes(endTime?.slice(0, 5));
  const conflicts = allSlots
    .filter((slot) => slot.attributes?.vaccine?.data?.id === vaccineId)
    .filter((slot) => {
      if (currentId && slot.id === currentId) return false;
      const slotStartMinutes = timeToMinutes(slot.attributes?.startTime?.slice(0, 5));
      const slotEndMinutes = timeToMinutes(slot.attributes?.endTime?.slice(0, 5));
      return startMinutes < slotEndMinutes && endMinutes > slotStartMinutes;
    })
    .map((slot) => ({
      startTime: slot.attributes?.startTime?.slice(0, 5),
      endTime: slot.attributes?.endTime?.slice(0, 5),
    }));

  return { isOverlap: conflicts.length > 0, conflicts };
}

function calculateRemainingQuota(allSlots, maxQuota, currentId) {
  const usedQuota = allSlots
    .filter((slot) => !currentId || slot.id !== currentId)
    .reduce((sum, slot) => sum + (slot.attributes?.quota || 0), 0);
  return Math.max(0, maxQuota - usedQuota);
}

export default function VaccineTimeSlotForm({ initialData = {}, onSave = () => {}, onCancel = () => {}, allSlots = [] }) {
  const router = useRouter();
  const [vaccines, setVaccines] = useState([]);
  const [selectedVaccine, setSelectedVaccine] = useState(
    initialData.vaccine?.data
      ? {
          value: initialData.vaccine.data.id,
          label: initialData.vaccine.data.attributes.title || 'ไม่ระบุชื่อวัคซีน',
          serviceStartTime: initialData.vaccine.data.attributes.serviceStartTime?.slice(0, 5),
          serviceEndTime: initialData.vaccine.data.attributes.serviceEndTime?.slice(0, 5),
          maxQuota: initialData.vaccine.data.attributes.maxQuota ?? 0,
        }
      : null
  );
  const [startTime, setStartTime] = useState(
    initialData.startTime
      ? { value: initialData.startTime.slice(0, 5), label: initialData.startTime.slice(0, 5) }
      : null
  );
  const [endTime, setEndTime] = useState(
    initialData.endTime
      ? { value: initialData.endTime.slice(0, 5), label: initialData.endTime.slice(0, 5) }
      : null
  );
  const [quota, setQuota] = useState(initialData.quota || '');
  const [isEnabled, setIsEnabled] = useState(initialData.is_enabled ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [maxQuota, setMaxQuota] = useState(null);
  const [remainingQuota, setRemainingQuota] = useState(null);
  const [allSlotsState, setAllSlots] = useState(allSlots);
  const [currentStep, setCurrentStep] = useState(1); // 步骤控制
  const isEditMode = !!initialData.id; // 判断是编辑模式还是创建模式

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
        if (!baseUrl) {
          throw new Error('NEXT_PUBLIC_STRAPI_URL is not defined in environment variables');
        }

        const token = sessionStorage.getItem('jwt');
        if (!token) {
          throw new Error('Unauthorized: No JWT token found');
        }

        const [vaccineRes, slotsRes] = await Promise.all([
          fetch(
            `${baseUrl}/api/vaccines?filters[useTimeSlots][$eq]=true&fields[0]=title&fields[1]=serviceStartTime&fields[2]=serviceEndTime&fields[3]=useTimeSlots&fields[4]=maxQuota`,
            {
              headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
            }
          ),
          fetch(
            `${baseUrl}/api/vaccine-time-slots?populate[vaccine][fields][0]=title&populate[vaccine][fields][1]=maxQuota`,
            {
              headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
            }
          ),
        ]);

        if (!vaccineRes.ok || !slotsRes.ok) {
          const errorData = await (vaccineRes.ok ? slotsRes : vaccineRes).json().catch(() => ({}));
          throw new Error(`Failed to fetch data: ${errorData?.error?.message || 'Unknown error'}`);
        }

        const vaccineData = await vaccineRes.json();
        const slotsData = await slotsRes.json();
        const fetchedVaccines = Array.isArray(vaccineData.data) ? vaccineData.data : [];
        const fetchedSlots = Array.isArray(slotsData.data) ? slotsData.data : [];

        const vaccineOptions = fetchedVaccines.map((vaccine) => ({
          value: vaccine.id,
          label: vaccine.attributes?.title || 'Unknown Vaccine',
          serviceStartTime: vaccine.attributes?.serviceStartTime?.slice(0, 5),
          serviceEndTime: vaccine.attributes?.serviceEndTime?.slice(0, 5),
          maxQuota: vaccine.attributes?.maxQuota ?? 0,
        }));
        setVaccines(vaccineOptions);
        setAllSlots(fetchedSlots);

        if (!selectedVaccine && !initialData.id && vaccineOptions.length > 0) {
          setSelectedVaccine(vaccineOptions[0]);
        }

        if (fetchedVaccines.length === 0) {
          setError('ไม่พบวัคซีนที่สามารถกำหนดได้');
        }
      } catch (error) {
        setError(
          error.message.includes('Unauthorized')
            ? 'กรุณาเข้าสู่ระบบใหม่'
            : error.message.includes('NEXT_PUBLIC_STRAPI_URL')
            ? 'URL ของเซิร์ฟเวอร์ Strapi ไม่ได้ถูกกำหนด กรุณาตรวจสอบไฟล์ .env'
            : 'ไม่สามารถโหลดข้อมูลวัคซีนได้ กรุณาลองใหม่'
        );
        if (error.message.includes('Unauthorized')) {
          sessionStorage.removeItem('jwt');
          router.replace('/login', { scroll: false });
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router, initialData.id]);

  useEffect(() => {
    if (selectedVaccine) {
      const vaccine = vaccines.find((v) => v.value === selectedVaccine.value) || {
        maxQuota: initialData.vaccine?.data?.attributes?.maxQuota ?? 0,
      };
      setMaxQuota(vaccine.maxQuota ?? null);
      const filteredSlots = allSlotsState.filter((slot) => slot.attributes?.vaccine?.data?.id === selectedVaccine.value);
      const remaining = calculateRemainingQuota(filteredSlots, vaccine.maxQuota ?? 0, initialData.id);
      setRemainingQuota(remaining);
    } else {
      setMaxQuota(null);
      setRemainingQuota(null);
    }
  }, [selectedVaccine, vaccines, allSlotsState, initialData.id]);

  const allTimeOptions = useMemo(() => {
    const startTime =
      selectedVaccine?.serviceStartTime ||
      initialData.vaccine?.data?.attributes?.serviceStartTime?.slice(0, 5) ||
      '08:00';
    const endTime =
      selectedVaccine?.serviceEndTime ||
      initialData.vaccine?.data?.attributes?.serviceEndTime?.slice(0, 5) ||
      '17:00';
    return generateTimeOptions(startTime, endTime);
  }, [
    selectedVaccine,
    initialData.vaccine?.data?.attributes?.serviceStartTime,
    initialData.vaccine?.data?.attributes?.serviceEndTime,
  ]);

  const timeOptions = useMemo(() => {
    const vaccineId = selectedVaccine?.value || initialData.vaccine?.data?.id;
    return filterAvailableTimes(allTimeOptions, allSlotsState, initialData.id, vaccineId);
  }, [allTimeOptions, allSlotsState, initialData.id, selectedVaccine]);

  const endTimeOptions = useMemo(() => {
    if (!startTime || !selectedVaccine) return [];
    const startMinutes = timeToMinutes(startTime.value);
    const allSlotsForVaccine = allSlotsState.filter(
      (slot) => slot.attributes.vaccine?.data?.id === selectedVaccine.value && (!initialData.id || slot.id !== initialData.id)
    );
    return allTimeOptions
      .filter((opt) => timeToMinutes(opt.value) > startMinutes)
      .filter((time) => {
        const proposedEndMinutes = timeToMinutes(time.value);
        return !allSlotsForVaccine.some((slot) => {
          const slotStart = timeToMinutes(slot.attributes.startTime?.slice(0, 5));
          const slotEnd = timeToMinutes(slot.attributes.endTime?.slice(0, 5));
          return startMinutes < slotEnd && proposedEndMinutes > slotStart;
        });
      });
  }, [startTime, allTimeOptions, allSlotsState, selectedVaccine, initialData.id]);

  function formatTimeToStrapi(time) {
    if (!time?.value) return null;
    return `${time.value}:00.000`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!selectedVaccine || !startTime || !endTime || !quota) {
        throw new Error('กรุณาเลือกวัคซีน, เวลาเริ่ม, เวลาสิ้นสุด, และจำนวนโควต้า');
      }

      if (startTime.value >= endTime.value) {
        throw new Error('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด');
      }

      if (quota <= 0) {
        throw new Error('จำนวนโควต้าต้องมากกว่า 0');
      }

      if (maxQuota === 0) {
        throw new Error('ไม่สามารถเพิ่มโควต้าได้ เนื่องจากโควต้าสูงสุดเป็น 0');
      }

      const filteredSlots = allSlotsState.filter(
        (slot) => slot.attributes?.vaccine?.data?.id === selectedVaccine.value && (!initialData.id || slot.id !== initialData.id)
      );
      const usedQuota = filteredSlots.reduce((sum, slot) => sum + (slot.attributes?.quota || 0), 0);
      const totalQuota = usedQuota + Number(quota);

      if (maxQuota !== null && totalQuota > maxQuota) {
        throw new Error(
          `จำนวนโควต้ารวม (${totalQuota}) เกินโควต้าสูงสุด (${maxQuota}) คงเหลือ: ${remainingQuota}`
        );
      }

      const startMinutes = timeToMinutes(startTime.value);
      const endMinutes = timeToMinutes(endTime.value);
      const serviceStartMinutes = timeToMinutes(selectedVaccine?.serviceStartTime);
      const serviceEndMinutes = timeToMinutes(selectedVaccine?.serviceEndTime);

      if (
        !selectedVaccine?.serviceStartTime ||
        !selectedVaccine?.serviceEndTime ||
        startMinutes < serviceStartMinutes ||
        endMinutes > serviceEndMinutes
      ) {
        throw new Error('เวลาที่เลือกไม่อยู่ในช่วงเวลาบริการของวัคซีน');
      }

      const { isOverlap, conflicts } = checkTimeOverlap(
        formatTimeToStrapi(startTime),
        formatTimeToStrapi(endTime),
        allSlotsState,
        initialData.id,
        selectedVaccine.value
      );
      if (isOverlap) {
        const conflictMessage = conflicts
          .map((conflict) => `${conflict.startTime}–${conflict.endTime}`)
          .join(', ');
        throw new Error(`เวลาที่เลือกซ้อนทับกับช่วงเวลา: ${conflictMessage} กรุณาเลือกช่วงเวลาใหม่`);
      }

      const token = sessionStorage.getItem('jwt');
      if (!token) {
        throw new Error('Unauthorized: No JWT token found');
      }

      const confirm = await MySwal.fire({
        title: isEditMode ? 'ยืนยันการแก้ไข' : 'ยืนยันการสร้าง',
        text: `คุณต้องการ${isEditMode ? 'แก้ไข' : 'สร้าง'}ช่วงเวลา ${startTime.value}–${endTime.value} สำหรับ ${selectedVaccine.label} ด้วยโควต้า ${quota} หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: isEditMode ? 'ใช่, แก้ไข' : 'ใช่, สร้าง',
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
          startTime: formatTimeToStrapi(startTime),
          endTime: formatTimeToStrapi(endTime),
          quota: Number(quota),
          is_enabled: isEnabled,
          vaccine: selectedVaccine.value,
        },
      };

      const url = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots${initialData.id ? `/${initialData.id}` : ''}`;
      const method = initialData.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || errorData?.error?.name || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        throw new Error(res.status === 401 ? 'Unauthorized' : res.status === 403 ? `Forbidden: ${message}` : message);
      }

      const responseData = await res.json();
      const updatedSlot = {
        id: initialData.id || responseData.data.id,
        attributes: {
          startTime: formatTimeToStrapi(startTime),
          endTime: formatTimeToStrapi(endTime),
          quota: Number(quota),
          is_enabled: isEnabled,
          vaccine: {
            data: {
              id: selectedVaccine.value,
              attributes: {
                title: selectedVaccine.label,
                maxQuota: selectedVaccine.maxQuota,
              },
            },
          },
        },
      };

      setAllSlots((prevSlots) =>
        initialData.id
          ? prevSlots.map((slot) => (slot.id === initialData.id ? updatedSlot : slot))
          : [...prevSlots, updatedSlot]
      );

      await MySwal.fire({
        title: 'สำเร็จ',
        text: isEditMode ? 'แก้ไขช่วงเวลาให้บริการเรียบร้อยแล้ว' : 'สร้างช่วงเวลาให้บริการเรียบร้อยแล้ว',
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
      onSave(updatedSlot);
    } catch (error) {
      const errorMessage = error.message.includes('Unauthorized')
        ? 'กรุณาเข้าสู่ระบบใหม่'
        : error.message.includes('Forbidden')
        ? 'คุณไม่มีสิทธิ์ในการดำเนินการนี้ กรุณาตรวจสอบบทบาทผู้ใช้'
        : error.message;

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

      if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('userId');
        router.replace('/login', { scroll: false });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const maxAllowableQuota = initialData.id
    ? (remainingQuota ?? 0) + (initialData.quota || 0)
    : remainingQuota ?? undefined;

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: 'var(--input)',
      borderColor: 'var(--border)',
      boxShadow: 'none',
      borderRadius: 'var(--radius)',
      padding: '0.5rem',
      color: 'var(--foreground)',
      '&:hover': {
        borderColor: 'var(--primary)',
      },
      transition: 'all 0.3s ease',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? 'var(--primary)' : 'var(--card)',
      color: state.isFocused ? 'var(--primary-foreground)' : 'var(--foreground)',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'var(--primary)',
        color: 'var(--primary-foreground)',
      },
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--foreground)',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--muted-foreground)',
    }),
  };

  // 时间线步骤
  const timelineSteps = [
    { id: 1, title: 'เลือกวัคซีน', icon: faSyringe, completed: selectedVaccine !== null },
    { id: 2, title: 'กำหนดเวลา', icon: faClock, completed: startTime !== null && endTime !== null },
    { id: 3, title: 'ตั้งค่าโควต้า', icon: faCircle, completed: quota !== '' },
    { id: 4, title: isEditMode ? 'ยืนยันการแก้ไข' : 'ยืนยันการสร้าง', icon: isEditMode ? faEdit : faCheck, completed: false }
  ];

  if (error) {
    return (
      <motion.div
        className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-Prompt bg-gradient-to-br from-[var(--background)] to-[var(--muted)]/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
              <FontAwesomeIcon icon={faClock} className="text-white text-xl" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] ml-4">
              {isEditMode ? 'แก้ไขช่วงเวลาให้บริการ' : 'สร้างช่วงเวลาให้บริการใหม่'}
            </h1>
          </div>
          
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)]"></div>
            
            <motion.div 
              className="ml-16 p-6 bg-gradient-to-r from-[var(--primary)]/5 to-[var(--secondary)]/5 rounded-2xl border border-[var(--border)]/20 backdrop-blur-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute left-6 w-5 h-5 rounded-full bg-[var(--background)] border-4 border-[var(--destructive)] z-10"></div>
              
              <div className="text-center space-y-6">
                <p className="text-base font-medium text-[var(--destructive)]">{error}</p>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-6 flex justify-center gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 bg-gradient-to-r from-[var(--secondary)] to-[var(--primary)] text-[var(--primary-foreground)] hover:from-[var(--primary)] hover:to-[var(--secondary)] text-sm px-4 py-2 rounded-[var(--radius)] shadow-sm transition-all duration-200"
                  aria-label="ลองโหลดข้อมูลใหม่"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                  ลองใหม่
                </Button>
                <Button
                  onClick={onCancel}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 text-sm px-4 py-2 rounded-[var(--radius)] shadow-sm transition-all duration-200"
                  aria-label="กลับไปยังหน้าก่อนหน้า"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                  ยกเลิก
                </Button>
              </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--muted)]/20 font-Prompt"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="w-8 h-8 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
        <p className="mt-4 text-base font-medium text-[var(--muted-foreground)]">กำลังโหลดข้อมูล...</p>
      </motion.div>
    );
  }

  if (selectedVaccine && remainingQuota === 0 && !initialData.id) {
    return (
      <motion.div
        className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[var(--background)] to-[var(--muted)]/20 font-Prompt"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
              <FontAwesomeIcon icon={faClock} className="text-white text-xl" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] ml-4">
              {isEditMode ? 'แก้ไขช่วงเวลาให้บริการ' : 'สร้างช่วงเวลาให้บริการใหม่'}
            </h1>
          </div>
          
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)]"></div>
            
            <motion.div 
              className="ml-16 p-6 bg-gradient-to-r from-[var(--primary)]/5 to-[var(--secondary)]/5 rounded-2xl border border-[var(--border)]/20 backdrop-blur-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute left-6 w-5 h-5 rounded-full bg-[var(--background)] border-4 border-[var(--destructive)] z-10"></div>
              
              <div className="text-center space-y-6">
                <p className="text-base font-medium text-[var(--destructive)]">
                  โควต้าสำหรับวัคซีน {selectedVaccine.label} เต็มแล้ว
                </p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-6">
                  <Button
                    onClick={onCancel}
                    className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 text-base px-4 py-2 rounded-[var(--radius)] shadow-sm transition-all duration-200"
                    aria-label="กลับไปยังหน้าก่อนหน้า"
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                    กลับ
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-Prompt bg-gradient-to-br from-[var(--background)] to-[var(--muted)]/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="main"
      aria-label={isEditMode ? 'แก้ไขช่วงเวลาให้บริการ' : 'สร้างช่วงเวลาให้บริการใหม่'}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
            <FontAwesomeIcon icon={faClock} className="text-white text-xl" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] ml-4">
            {isEditMode ? 'แก้ไขช่วงเวลาให้บริการ' : 'สร้างช่วงเวลาให้บริการใหม่'}
          </h1>
        </div>
        
        {/* 时间线步骤指示器 */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 h-0.5 bg-[var(--border)] top-5 z-0"></div>
            <div 
              className="absolute left-0 h-0.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] top-5 z-0 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (timelineSteps.length - 1)) * 100}%` }}
            ></div>
            
            {timelineSteps.map((step, index) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <motion.button
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step.completed 
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white' 
                      : currentStep > step.id 
                        ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white'
                        : 'bg-[var(--background)] border-2 border-[var(--border)] text-[var(--muted-foreground)]'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (step.completed || currentStep > step.id) {
                      setCurrentStep(step.id);
                    }
                  }}
                >
                  <FontAwesomeIcon icon={step.icon} className="text-sm" />
                </motion.button>
                <span className={`mt-2 text-xs font-medium ${
                  currentStep >= step.id ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 时间线内容区域 */}
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)]"></div>
          
          <form onSubmit={handleSubmit}>
            {/* 步骤1: 选择疫苗 */}
            <motion.div 
              className="relative mb-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute left-6 w-5 h-5 rounded-full bg-[var(--background)] border-4 border-[var(--primary)] z-10"></div>
              
              <div className="ml-16">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 flex items-center justify-center">
                    <FontAwesomeIcon icon={faSyringe} className="text-[var(--primary)] text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">เลือกวัคซีน</h2>
                    <p className="text-[var(--muted-foreground)]">เลือกวัคซีนที่ต้องการ{isEditMode ? 'แก้ไข' : 'สร้าง'}ช่วงเวลาให้บริการ</p>
                  </div>
                </div>
                
                <AnimatePresence>
                  {currentStep === 1 && (
                    <motion.div 
                      className="p-6 bg-gradient-to-r from-[var(--primary)]/5 to-[var(--secondary)]/5 rounded-2xl border border-[var(--border)]/20 backdrop-blur-sm"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {vaccines.length === 0 ? (
                        <p className="text-sm font-medium text-[var(--destructive)]">
                          ไม่พบวัคซีนที่สามารถกำหนดได้
                        </p>
                      ) : (
                        <div>
                          <label
                            htmlFor="vaccine-select"
                            className="block text-sm font-medium text-[var(--foreground)] mb-2"
                          >
                            วัคซีน *
                          </label>
                          {initialData.id && selectedVaccine ? (
                            <div className="p-3 bg-[var(--card)]/50 rounded-lg">
                              <p className="text-base text-[var(--foreground)]">{selectedVaccine.label}</p>
                            </div>
                          ) : (
                            <Select
                              id="vaccine-select"
                              options={vaccines}
                              value={selectedVaccine}
                              onChange={(selected) => {
                                setSelectedVaccine(selected);
                                setStartTime(null);
                                setEndTime(null);
                              }}
                              placeholder="-- เลือกวัคซีน --"
                              isClearable
                              isDisabled={submitting}
                              styles={customSelectStyles}
                              aria-label="เลือกวัคซีนสำหรับช่วงเวลาให้บริการ"
                              required
                            />
                          )}
                          
                          {selectedVaccine && (
                            <motion.div 
                              className="mt-4 p-4 bg-[var(--card)]/50 rounded-xl"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <p className="text-sm text-[var(--foreground)]">
                                <span className="font-medium">วัคซีน:</span> {selectedVaccine.label}
                              </p>
                              <p className="text-sm text-[var(--foreground)]">
                                <span className="font-medium">ช่วงเวลาบริการ:</span> {selectedVaccine.serviceStartTime} - {selectedVaccine.serviceEndTime}
                              </p>
                              <p className="text-sm text-[var(--foreground)]">
                                <span className="font-medium">โควต้าสูงสุด:</span> {selectedVaccine.maxQuota}
                              </p>
                              <p className="text-sm text-[var(--foreground)]">
                                <span className="font-medium">คงเหลือ:</span> {remainingQuota}
                              </p>
                            </motion.div>
                          )}
                          
                          <div className="flex justify-end mt-4">
                            <motion.button
                              type="button"
                              className="px-4 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-lg font-medium text-sm flex items-center gap-2"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => selectedVaccine && setCurrentStep(2)}
                              disabled={!selectedVaccine}
                            >
                              ถัดไป <FontAwesomeIcon icon={faArrowRight} />
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            
            {/* 步骤2: 设置时间 */}
            <motion.div 
              className="relative mb-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className={`absolute left-6 w-5 h-5 rounded-full bg-[var(--background)] border-4 z-10 ${
                startTime && endTime ? 'border-[var(--primary)]' : 'border-[var(--border)]'
              }`}></div>
              
              <div className="ml-16">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 flex items-center justify-center">
                    <FontAwesomeIcon icon={faClock} className="text-[var(--primary)] text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">กำหนดเวลา</h2>
                    <p className="text-[var(--muted-foreground)]">เลือกช่วงเวลาที่เปิดให้บริการ</p>
                  </div>
                </div>
                
                <AnimatePresence>
                  {currentStep === 2 && (
                    <motion.div 
                      className="p-6 bg-gradient-to-r from-[var(--primary)]/5 to-[var(--secondary)]/5 rounded-2xl border border-[var(--border)]/20 backdrop-blur-sm"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="start-time"
                            className="block text-sm font-medium text-[var(--foreground)] mb-2"
                          >
                            เวลาเริ่ม *
                          </label>
                          <Select
                            id="start-time"
                            options={timeOptions}
                            value={startTime}
                            onChange={(selected) => {
                              setStartTime(selected);
                              if (!selected) setEndTime(null);
                            }}
                            placeholder="-- เลือกเวลาเริ่ม --"
                            isClearable
                            isDisabled={submitting || !selectedVaccine}
                            styles={customSelectStyles}
                            aria-label="เลือกเวลาเริ่มของช่วงเวลาให้บริการ"
                            required
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="end-time"
                            className="block text-sm font-medium text-[var(--foreground)] mb-2"
                          >
                            เวลาสิ้นสุด *
                          </label>
                          <Select
                            id="end-time"
                            options={endTimeOptions}
                            value={endTime}
                            onChange={setEndTime}
                            placeholder="-- เลือกเวลาสิ้นสุด --"
                            isClearable
                            isDisabled={submitting || !selectedVaccine || !startTime}
                            styles={customSelectStyles}
                            aria-label="เลือกเวลาสิ้นสุดของช่วงเวลาให้บริการ"
                            required
                          />
                        </div>
                      </div>
                      
                      {startTime && endTime && (
                        <motion.div 
                          className="mt-4 p-4 bg-[var(--card)]/50 rounded-xl"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p className="text-sm text-[var(--foreground)]">
                            <span className="font-medium">ช่วงเวลาที่เลือก:</span> {startTime.value} - {endTime.value}
                          </p>
                          <p className="text-sm text-[var(--foreground)]">
                            <span className="font-medium">ระยะเวลา:</span> {timeToMinutes(endTime.value) - timeToMinutes(startTime.value)} นาที
                          </p>
                        </motion.div>
                      )}
                      
                      <div className="flex justify-between mt-4">
                        <motion.button
                          type="button"
                          className="px-4 py-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-lg font-medium text-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentStep(1)}
                        >
                          ย้อนกลับ
                        </motion.button>
                        <motion.button
                          type="button"
                          className="px-4 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-lg font-medium text-sm flex items-center gap-2"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => startTime && endTime && setCurrentStep(3)}
                          disabled={!startTime || !endTime}
                        >
                          ถัดไป <FontAwesomeIcon icon={faArrowRight} />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            
            {/* 步骤3: 设置配额 */}
            <motion.div 
              className="relative mb-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className={`absolute left-6 w-5 h-5 rounded-full bg-[var(--background)] border-4 z-10 ${
                quota ? 'border-[var(--primary)]' : 'border-[var(--border)]'
              }`}></div>
              
              <div className="ml-16">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 flex items-center justify-center">
                    <FontAwesomeIcon icon={faCircle} className="text-[var(--primary)] text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">ตั้งค่าโควต้า</h2>
                    <p className="text-[var(--muted-foreground)]">กำหนดจำนวนผู้รับบริการในช่วงเวลานี้</p>
                  </div>
                </div>
                
                <AnimatePresence>
                  {currentStep === 3 && (
                    <motion.div 
                      className="p-6 bg-gradient-to-r from-[var(--primary)]/5 to-[var(--secondary)]/5 rounded-2xl border border-[var(--border)]/20 backdrop-blur-sm"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div>
                        <label
                          htmlFor="quota"
                          className="block text-sm font-medium text-[var(--foreground)] mb-2"
                        >
                          จำนวนโควต้า *
                        </label>
                        <Input
                          id="quota"
                          type="number"
                          min={1}
                          max={maxAllowableQuota}
                          value={quota}
                          onChange={(e) => setQuota(e.target.value)}
                          disabled={submitting || !selectedVaccine || maxQuota === 0}
                          className="w-full px-4 py-2 text-sm border border-[var(--border)] bg-[var(--input)] text-[var(--foreground)] rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--ring)] transition-all duration-300"
                          aria-label="จำนวนโควต้าสำหรับช่วงเวลาให้บริการ"
                          required
                        />
                        
                        {selectedVaccine && maxQuota !== null && (
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-[var(--muted-foreground)]">
                              โควต้าสูงสุด: {maxQuota}, คงเหลือ: {remainingQuota}
                            </p>
                            {maxQuota === 0 && (
                              <p className="text-sm text-[var(--destructive)]">
                                ไม่สามารถเพิ่มโควต้าได้ เนื่องจากโควต้าสูงสุดเป็น 0
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-6">
                        <div className="flex items-center gap-2">
                          <input
                            id="is-enabled"
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => setIsEnabled(e.target.checked)}
                            disabled={submitting}
                            className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--ring)] border-[var(--border)] rounded cursor-pointer transition-all duration-300"
                            aria-label="เปิดใช้งานช่วงเวลาให้บริการ"
                          />
                          <label
                            htmlFor="is-enabled"
                            className="text-sm font-medium text-[var(--foreground)]"
                          >
                            เปิดใช้งานช่วงเวลานี้
                          </label>
                        </div>
                      </div>
                      
                      {quota && (
                        <motion.div 
                          className="mt-4 p-4 bg-[var(--card)]/50 rounded-xl"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p className="text-sm text-[var(--foreground)]">
                            <span className="font-medium">โควต้าที่ตั้ง:</span> {quota} คน
                          </p>
                          <p className="text-sm text-[var(--foreground)]">
                            <span className="font-medium">สถานะ:</span> {isEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </p>
                        </motion.div>
                      )}
                      
                      <div className="flex justify-between mt-4">
                        <motion.button
                          type="button"
                          className="px-4 py-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-lg font-medium text-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentStep(2)}
                        >
                          ย้อนกลับ
                        </motion.button>
                        <motion.button
                          type="button"
                          className="px-4 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-lg font-medium text-sm flex items-center gap-2"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => quota && setCurrentStep(4)}
                          disabled={!quota}
                        >
                          ถัดไป <FontAwesomeIcon icon={faArrowRight} />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            
            {/* 步骤4: 确认编辑/创建 */}
            <motion.div 
              className="relative mb-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="absolute left-6 w-5 h-5 rounded-full bg-[var(--background)] border-4 border-[var(--primary)] z-10"></div>
              
              <div className="ml-16">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 flex items-center justify-center">
                    <FontAwesomeIcon icon={isEditMode ? faEdit : faCheck} className="text-[var(--primary)] text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">
                      {isEditMode ? 'ยืนยันการแก้ไข' : 'ยืนยันการสร้าง'}
                    </h2>
                    <p className="text-[var(--muted-foreground)]">
                      ตรวจสอบข้อมูลและยืนยันการ{isEditMode ? 'แก้ไข' : 'สร้าง'}ช่วงเวลาให้บริการ
                    </p>
                  </div>
                </div>
                
                <AnimatePresence>
                  {currentStep === 4 && (
                    <motion.div 
                      className="p-6 bg-gradient-to-r from-[var(--primary)]/5 to-[var(--secondary)]/5 rounded-2xl border border-[var(--border)]/20 backdrop-blur-sm"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-4">
                        <div className="p-4 bg-[var(--card)]/50 rounded-xl">
                          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">สรุปข้อมูลช่วงเวลาให้บริการ</h3>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-[var(--muted-foreground)]">วัคซีน:</span>
                              <span className="text-sm text-[var(--foreground)] font-medium">{selectedVaccine?.label}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-[var(--muted-foreground)]">ช่วงเวลา:</span>
                              <span className="text-sm text-[var(--foreground)] font-medium">{startTime?.value} - {endTime?.value}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-[var(--muted-foreground)]">โควต้า:</span>
                              <span className="text-sm text-[var(--foreground)] font-medium">{quota} คน</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-[var(--muted-foreground)]">สถานะ:</span>
                              <span className={`text-sm font-medium ${isEnabled ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}`}>
                                {isEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between">
                          <div className="flex gap-2">
                            <motion.button
                              type="button"
                              className="px-4 py-2 bg-gradient-to-r from-[var(--secondary)] to-[var(--primary)] text-[var(--primary-foreground)] rounded-lg font-medium text-sm"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setCurrentStep(3)}
                            >
                              ย้อนกลับ
                            </motion.button>
                            <motion.button
                              type="button"
                              className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-medium text-sm flex items-center gap-2"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={onCancel}
                            >
                              <FontAwesomeIcon icon={faXmark} />
                              ยกเลิก
                            </motion.button>
                          </div>
                          <motion.button
                            type="submit"
                            className="px-4 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-lg font-medium text-sm flex items-center gap-2"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={submitting}
                          >
                            {submitting 
                              ? (isEditMode ? 'กำลังแก้ไข...' : 'กำลังสร้าง...') 
                              : (isEditMode ? 'แก้ไขช่วงเวลา' : 'สร้างช่วงเวลา')
                            }
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}