'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const colors = {
  primary: '#F9669D',
  secondary: '#30266D',
  text: '#30266D',
  error: '#F9669D',
  detailsText: '#30266D',
  bg: '#FFFFFF',
  border: '#30266D',
  accent: '#F9669D',
};

function generateTimeOptions(serviceStartTime, serviceEndTime, intervalMinutes = 15) {
  const times = [];
  const startHour = parseInt(serviceStartTime?.slice(0, 2), 10) || 8;
  const startMinute = parseInt(serviceStartTime?.slice(3, 5), 10) || 0;
  const endHour = parseInt(serviceEndTime?.slice(0, 2), 10) || 17;
  const endMinute = parseInt(serviceEndTime?.slice(3, 5), 10) || 0;

  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;

  if (endTimeInMinutes <= startTimeInMinutes) return [];

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let min = (hour === startHour ? startMinute : 0); min < 60; min += intervalMinutes) {
      const currentTimeInMinutes = hour * 60 + min;
      if (
        currentTimeInMinutes >= startTimeInMinutes &&
        currentTimeInMinutes <= endTimeInMinutes
      ) {
        const hh = String(hour).padStart(2, '0');
        const mm = String(min).padStart(2, '0');
        times.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
      }
    }
  }
  return times;
}

function timeToMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    console.warn(`Invalid time for conversion: ${time}`);
    return 0;
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function filterAvailableTimes(allTimes, allSlots, selectedVaccineId) {
  if (!allSlots || allSlots.length === 0) return allTimes;

  const occupiedTimes = new Set();
  allSlots.forEach((slot) => {
    if (slot.attributes.vaccine?.data?.id !== selectedVaccineId) return;
    const slotStart = slot.attributes?.startTime?.slice(0, 5);
    const slotEnd = slot.attributes?.endTime?.slice(0, 5);
    if (slotStart && slotEnd) {
      const startMinutes = timeToMinutes(slotStart);
      const endMinutes = timeToMinutes(slotEnd);
      for (let current = startMinutes; current <= endMinutes; current += 15) {
        const hour = Math.floor(current / 60);
        const min = current % 60;
        const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        occupiedTimes.add(timeStr);
      }
    }
  });

  return allTimes.filter((time) => !occupiedTimes.has(time.value));
}

const customSelectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderColor: colors.border,
    boxShadow: 'none',
    color: colors.text,
    borderRadius: '0.75rem',
    padding: '0.25rem',
    backdropFilter: 'blur(8px)',
    '&:hover': {
      borderColor: colors.primary,
      transform: 'scale(1.02)',
      transition: 'all 0.3s ease',
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    border: `1px solid ${colors.border}`,
    borderRadius: '0.75rem',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? colors.primary : 'transparent',
    color: state.isFocused ? 'white' : colors.text,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: colors.primary,
      color: 'white',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: colors.text,
  }),
  placeholder: (base) => ({
    ...base,
    color: colors.detailsText,
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: colors.accent,
    color: 'white',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'white',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'white',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: colors.error,
    },
  }),
};

export default function VaccineTimeSlotFormCreate({ onCancel, onSave, allSlots, isTimeOverlap }) {
  const router = useRouter();
  const [vaccines, setVaccines] = useState([]);
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [quota, setQuota] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchVaccines() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?filters[useTimeSlots][$eq]=true&fields[0]=title&fields[1]=serviceStartTime&fields[2]=serviceEndTime&fields[3]=useTimeSlots`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );
        if (!res.ok) throw new Error('Failed to fetch vaccines');
        const data = await res.json();
        const fetchedVaccines = data.data || [];
        setVaccines(
          fetchedVaccines.map((vaccine) => ({
            value: vaccine.id,
            label: vaccine.attributes.title,
            serviceStartTime: vaccine.attributes.serviceStartTime?.slice(0, 5),
            serviceEndTime: vaccine.attributes.serviceEndTime?.slice(0, 5),
          }))
        );

        if (fetchedVaccines.length === 0) {
          MySwal.fire({
            title: 'ไม่มีวัคซีน',
            text: 'ไม่พบวัคซีนที่สามารถกำหนดช่วงเวลาได้ กรุณาตรวจสอบการตั้งค่าวัคซีน',
            icon: 'info',
            customClass: {
              popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
              title: 'text-lg font-bold text-[#30266D] mb-3',
              htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
              confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
            },
            confirmButtonText: 'ตกลง',
          });
        }
      } catch (error) {
        console.error('Error fetching vaccines:', error);
        MySwal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: error.message === 'Failed to fetch vaccines' ? 'ไม่สามารถโหลดข้อมูลวัคซีนได้' : 'กรุณาเข้าสู่ระบบใหม่',
          icon: 'error',
          customClass: {
            popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
            title: 'text-lg font-bold text-[#30266D] mb-3',
            htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
          },
          confirmButtonText: 'ตกลง',
        });
        if (error.message === 'Authentication invalid or expired') {
          router.push('/login');
        }
      }
    }
    fetchVaccines();
  }, [router]);

  const allTimeOptions = useMemo(() => {
    const startTime = selectedVaccine?.serviceStartTime || '08:00';
    const endTime = selectedVaccine?.serviceEndTime || '17:00';
    return generateTimeOptions(startTime, endTime);
  }, [selectedVaccine]);

  const timeOptions = useMemo(() => {
    return filterAvailableTimes(allTimeOptions, allSlots, selectedVaccine?.value);
  }, [allTimeOptions, allSlots, selectedVaccine]);

  const endTimeOptions = useMemo(() => {
    if (!startTime) return timeOptions;
    const startMinutes = timeToMinutes(startTime.value);
    return timeOptions.filter((opt) => {
      const optMinutes = timeToMinutes(opt.value);
      return optMinutes > startMinutes;
    });
  }, [startTime, timeOptions]);

  function formatTimeToStrapi(time) {
    if (!time?.value) return null;
    return `${time.value}:00.000`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    if (!selectedVaccine || !startTime || !endTime) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณาเลือกวัคซีน, เวลาเริ่ม, และเวลาสิ้นสุด',
        icon: 'warning',
        customClass: {
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    if (quota <= 0) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'จำนวนโควต้าต้องมากกว่า 0',
        icon: 'warning',
        customClass: {
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    const startMinutes = timeToMinutes(startTime.value);
    const endMinutes = timeToMinutes(endTime.value);
    const serviceStartMinutes = timeToMinutes(selectedVaccine?.serviceStartTime);
    const serviceEndMinutes = timeToMinutes(selectedVaccine?.serviceEndTime);

    if (startMinutes >= endMinutes) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด',
        icon: 'warning',
        customClass: {
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    if (
      !selectedVaccine?.serviceStartTime ||
      !selectedVaccine?.serviceEndTime ||
      startMinutes < serviceStartMinutes ||
      endMinutes > serviceEndMinutes
    ) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'เวลที่เลือกไม่อยู่ในช่วงเวลาบริการของวัคซีน',
        icon: 'warning',
        customClass: {
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    const allSlotsForVaccine = allSlots.filter(
      (slot) => slot.attributes.vaccine?.data?.id === selectedVaccine.value
    );
    const { isOverlap, conflicts } = isTimeOverlap(
      formatTimeToStrapi(startTime),
      formatTimeToStrapi(endTime),
      allSlotsForVaccine,
      null
    );
    if (isOverlap) {
      const conflictMessage = conflicts
        .map((conflict) => `${conflict.startTime}–${conflict.endTime}`)
        .join(', ');
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: `เกิดข้อผิดพลาด ไม่สามารถเลือกช่วงเวลานี้ได้ มีช่วงเวลา ${conflictMessage} อยู่แล้ว`,
        icon: 'warning',
        customClass: {
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    const confirm = await MySwal.fire({
      title: 'ยืนยันการสร้าง',
      text: 'คุณต้องการสร้างช่วงเวลาให้บริการนี้หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, สร้าง',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
        title: 'text-lg font-bold text-[#30266D] mb-3',
        htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        cancelButton: 'bg-white text-[#30266D] px-4 py-2 rounded-xl font-semibold border border-[#30266D] hover:bg-[#30266D]/30 transition-all',
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
        quota,
        is_enabled: isEnabled,
        vaccine: selectedVaccine.value,
      },
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const result = await res.json();
        if (res.status === 401) throw new Error('Authentication invalid or expired');
        throw new Error(result.error?.message || 'เกิดข้อผิดพลาดในการสร้าง');
      }

      const result = await res.json();
      const newSlot = {
        id: result.data.id,
        attributes: {
          startTime: formatTimeToStrapi(startTime),
          endTime: formatTimeToStrapi(endTime),
          quota,
          is_enabled: isEnabled,
          vaccine: {
            data: {
              id: selectedVaccine.value,
              attributes: {
                title: selectedVaccine.label,
                serviceStartTime: selectedVaccine.serviceStartTime,
                serviceEndTime: selectedVaccine.serviceEndTime,
              },
            },
          },
        },
      };

      await MySwal.fire({
        title: 'สำเร็จ',
        text: 'สร้างช่วงเวลาให้บริการเรียบร้อยแล้ว',
        icon: 'success',
        customClass: {
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
        timer: 1500,
        showConfirmButton: false,
      });
      onSave(newSlot);
    } catch (error) {
      console.error('Error creating time slot:', error);
      await MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message === 'Authentication invalid or expired' ? 'กรุณาเข้าสู่ระบบใหม่' : error.message,
        icon: 'error',
        customClass: {
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      if (error.message === 'Authentication invalid or expired') {
        router.push('/login');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 font-poppins p-6 bg-white/80 backdrop-blur-lg rounded-xl shadow-md border border-[#30266D]/50"
    >
      <h3 className="text-xl font-semibold text-[#30266D]">สร้างช่วงเวลาให้บริการ</h3>

      <div>
        <label className="block mb-1 text-sm font-medium text-[#30266D]" htmlFor="vaccine-select">
          วัคซีน
        </label>
        {vaccines.length > 0 ? (
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
          />
        ) : (
          <p className="text-sm text-[#30266D] italic">ไม่พบวัคซีนที่สามารถกำหนดช่วงเวลาได้</p>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block mb-1 text-sm font-medium text-[#30266D]" htmlFor="start-time">
            เวลาเริ่ม
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
          />
        </div>

        <div className="flex-1">
          <label className="block mb-1 text-sm font-medium text-[#30266D]" htmlFor="end-time">
            เวลาสิ้นสุด
          </label>
          <Select
            id="end-time"
            options={endTimeOptions}
            value={endTime}
            onChange={setEndTime}
            placeholder="-- เลือกเวลาสิ้นสุด --"
            isClearable
            isDisabled={!startTime || submitting || !selectedVaccine}
            styles={customSelectStyles}
            aria-label="เลือกเวลาสิ้นสุดของช่วงเวลาให้บริการ"
          />
        </div>
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium text-[#30266D]" htmlFor="quota">
          จำนวนโควต้า
        </label>
        <input
          id="quota"
          type="number"
          min={0}
          value={quota}
          onChange={(e) => setQuota(Number(e.target.value))}
          disabled={submitting}
          className="w-full border border-[#30266D]/50 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm text-sm text-[#30266D] focus:outline-none focus:ring-2 focus:ring-[#F9669D] transition-all duration-300 hover:scale-[1.02] cursor-pointer disabled:opacity-50"
          aria-label="จำนวนโควต้าสำหรับช่วงเวลาให้บริการ"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is-enabled"
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => setIsEnabled(e.target.checked)}
          disabled={submitting}
          className="h-4 w-4 text-[#F9669D] focus:ring-[#F9669D] border-[#30266D]/50 rounded cursor-pointer transition-all duration-300 disabled:opacity-50"
          aria-label="เปิดใช้งานช่วงเวลาให้บริการ"
        />
        <label className="text-sm font-medium text-[#30266D]" htmlFor="is-enabled">
          เปิดใช้งาน
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-white text-[#30266D] border border-[#30266D] text-sm font-semibold hover:bg-[#30266D]/30 transition-all duration-300 hover:scale-105 cursor-pointer disabled:opacity-50"
          aria-label="ยกเลิกการสร้างช่วงเวลาให้บริการ"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-[#F9669D] text-white text-sm font-semibold hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105 cursor-pointer disabled:opacity-50"
          aria-label="สร้างช่วงเวลาให้บริการ"
        >
          {submitting ? 'กำลังสร้าง...' : 'สร้าง'}
        </button>
      </div>
    </form>
  );
}