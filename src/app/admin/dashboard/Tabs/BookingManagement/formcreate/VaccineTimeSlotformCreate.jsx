'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const colors = {
  primary: '#F9669D',
  secondary: '#30266D',
  text: '#30266D',
  border: '#30266D',
  bg: '#FFFFFF',
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

function filterAvailableTimes(allTimes, allSlots, selectedVaccineId) {
  if (!allSlots || allSlots.length === 0 || !selectedVaccineId) return allTimes;

  const occupiedIntervals = [];
  allSlots.forEach((slot) => {
    if (slot.attributes.vaccine?.data?.id === selectedVaccineId) {
      const slotStart = slot.attributes?.startTime?.slice(0, 5);
      const slotEnd = slot.attributes?.endTime?.slice(0, 5);
      if (slotStart && slotEnd) {
        const startMinutes = timeToMinutes(slotStart);
        const endMinutes = timeToMinutes(slotEnd);
        occupiedIntervals.push({ start: startMinutes, end: endMinutes });
      }
    }
  });

  return allTimes.filter((time) => {
    const timeMinutes = timeToMinutes(time.value);
    return !occupiedIntervals.some(
      (interval) => timeMinutes >= interval.start && timeMinutes < interval.end
    );
  });
}

function calculateRemainingQuota(allSlots, maxQuota) {
  const usedQuota = allSlots.reduce((sum, slot) => sum + (slot.attributes?.quota || 0), 0);
  return Math.max(0, maxQuota - usedQuota);
}

const customSelectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: `${colors.border}/50`,
    boxShadow: 'none',
    color: colors.text,
    borderRadius: '0.75rem',
    padding: '0.25rem',
    backdropFilter: 'blur(8px)',
    fontSize: '1rem',
    '&:hover': {
      borderColor: colors.primary,
      transform: 'scale(1.02)',
      transition: 'all 0.3s ease',
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    border: `1px solid ${colors.border}/50`,
    borderRadius: '0.75rem',
    fontSize: '1rem',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? colors.primary : 'transparent',
    color: state.isFocused ? 'white' : colors.text,
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    opacity: state.isDisabled ? 0.5 : 1,
    fontSize: '1rem',
    '&:hover': {
      backgroundColor: state.isDisabled ? 'transparent' : colors.primary,
      color: state.isDisabled ? colors.text : 'white',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: colors.text,
    fontSize: '1rem',
  }),
  placeholder: (base) => ({
    ...base,
    color: colors.text,
    fontSize: '1rem',
  }),
};

export default function VaccineTimeSlotFormCreate({ onSave, onCancel }) {
  const router = useRouter();
  const [vaccines, setVaccines] = useState([]);
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [quota, setQuota] = useState(1);
  const [isEnabled, setIsEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeOptions, setTimeOptions] = useState([]);
  const [endTimeOptions, setEndTimeOptions] = useState([]);
  const [maxQuota, setMaxQuota] = useState(null);
  const [remainingQuota, setRemainingQuota] = useState(null);
  const [vaccineQuotas, setVaccineQuotas] = useState({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [vaccineRes, slotsRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?filters[useTimeSlots][$eq]=true&fields[0]=title&fields[1]=serviceStartTime&fields[2]=serviceEndTime&fields[3]=maxQuota&fields[4]=useTimeSlots`,
            { credentials: 'include', cache: 'no-store' }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots?populate[vaccine][fields][0]=title`,
            { credentials: 'include', cache: 'no-store' }
          ),
        ]);

        if (!vaccineRes.ok || !slotsRes.ok) {
          const errorData = await (vaccineRes.ok ? slotsRes : vaccineRes).json();
          throw new Error(errorData.error?.message || `HTTP ${vaccineRes.status || slotsRes.status}`);
        }

        const vaccineData = await vaccineRes.json();
        const slotsData = await slotsRes.json();
        const fetchedVaccines = vaccineData.data || [];
        setVaccines(fetchedVaccines);
        setTimeSlots(slotsData.data || []);

        const quotas = {};
        fetchedVaccines.forEach((vaccine) => {
          const allSlotsForVaccine = (slotsData.data || []).filter(
            (slot) => slot.attributes.vaccine?.data?.id === vaccine.id
          );
          const remaining = calculateRemainingQuota(allSlotsForVaccine, vaccine.attributes?.maxQuota || 0);
          quotas[vaccine.id] = remaining;
        });
        setVaccineQuotas(quotas);

        if (fetchedVaccines.length === 0) {
          MySwal.fire({
            title: 'ไม่มีวัคซีน',
            text: 'ไม่พบวัคซีนที่สามารถกำหนดช่วงเวลาได้ กรุณาตรวจสอบการตั้งค่าวัคซีน',
            icon: 'info',
            customClass: {
              popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
              title: 'text-xl font-bold text-[#30266D] mb-3',
              htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
              confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
            },
            confirmButtonText: 'ตกลง',
          });
        }
      } catch (error) {
        MySwal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : 'ไม่สามารถโหลดข้อมูลได้',
          icon: 'error',
          customClass: {
            popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
            title: 'text-xl font-bold text-[#30266D] mb-3',
            htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
          },
          confirmButtonText: 'ตกลง',
        });
        if (error.message === 'Unauthorized') {
          router.push('/login');
        }
      }
    }
    fetchData();
  }, [router]);

  useEffect(() => {
    if (selectedVaccine) {
      const vaccine = vaccines.find((v) => v.id === selectedVaccine.value);
      const serviceStartTime = vaccine?.attributes?.serviceStartTime?.slice(0, 5);
      const serviceEndTime = vaccine?.attributes?.serviceEndTime?.slice(0, 5);
      const allTimes = generateTimeOptions(serviceStartTime, serviceEndTime);
      const availableTimes = filterAvailableTimes(allTimes, timeSlots, selectedVaccine.value);
      console.log('Available times:', availableTimes.map(t => t.value)); // Debug
      setTimeOptions(availableTimes);
      setStartTime(null);
      setEndTime(null);
      setEndTimeOptions(availableTimes);
      setMaxQuota(vaccine?.attributes?.maxQuota || null);
      setRemainingQuota(calculateRemainingQuota(
        timeSlots.filter((slot) => slot.attributes.vaccine?.data?.id === selectedVaccine.value),
        vaccine?.attributes?.maxQuota || 0
      ));
    } else {
      setTimeOptions([]);
      setStartTime(null);
      setEndTime(null);
      setEndTimeOptions([]);
      setMaxQuota(null);
      setRemainingQuota(null);
    }
  }, [selectedVaccine, vaccines, timeSlots]);

  useMemo(() => {
    if (startTime && selectedVaccine) {
      const startMinutes = timeToMinutes(startTime.value);
      const allSlotsForVaccine = timeSlots.filter((slot) => slot.attributes.vaccine?.data?.id === selectedVaccine.value);
      const filteredEndTimes = timeOptions.filter((opt) => {
        const optMinutes = timeToMinutes(opt.value);
        if (optMinutes <= startMinutes) return false;
        return !allSlotsForVaccine.some((slot) => {
          const slotStart = timeToMinutes(slot.attributes.startTime?.slice(0, 5));
          const slotEnd = timeToMinutes(slot.attributes.endTime?.slice(0, 5));
          return optMinutes > startMinutes && optMinutes <= slotEnd;
        });
      });
      console.log('Filtered end times:', filteredEndTimes.map(t => t.value)); // Debug
      setEndTimeOptions(filteredEndTimes);
      setEndTime(null);
    } else {
      setEndTimeOptions(timeOptions);
    }
  }, [startTime, timeOptions, timeSlots, selectedVaccine]);

  function formatTimeToStrapi(time) {
    if (!time?.value) return null;
    return `${time.value}:00.000`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    if (!selectedVaccine || !startTime || !endTime || !quota) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณาเลือกวัคซีน, เวลาเริ่ม, เวลาสิ้นสุด, และจำนวนโควต้า',
        icon: 'warning',
        customClass: {
          popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    if (startTime.value >= endTime.value) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด',
        icon: 'warning',
        customClass: {
          popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    const vaccine = vaccines.find((v) => v.id === selectedVaccine.value);
    const serviceStartTime = vaccine?.attributes?.serviceStartTime?.slice(0, 5);
    const serviceEndTime = vaccine?.attributes?.serviceEndTime?.slice(0, 5);
    const startMinutes = timeToMinutes(startTime.value);
    const endMinutes = timeToMinutes(endTime.value);
    const serviceStartMinutes = timeToMinutes(serviceStartTime);
    const serviceEndMinutes = timeToMinutes(serviceEndTime);

    if (
      !serviceStartTime ||
      !serviceEndTime ||
      startMinutes < serviceStartMinutes ||
      endMinutes > serviceEndMinutes
    ) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'เวลาที่เลือกไม่อยู่ในช่วงเวลาบริการของวัคซีน',
        icon: 'warning',
        customClass: {
          popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    if (maxQuota !== null && (quota > maxQuota || quota > remainingQuota)) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: `จำนวนโควต้าต้องไม่เกิน ${maxQuota} และโควต้าที่เหลืออยู่ (${remainingQuota})`,
        icon: 'warning',
        customClass: {
          popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    const allSlotsForVaccine = timeSlots.filter(
      (slot) => slot.attributes.vaccine?.data?.id === selectedVaccine.value
    );
    const { isOverlap, conflicts } = (function (startTime, endTime, allSlots) {
      if (!startTime || !endTime) return { isOverlap: false, conflicts: [] };
      const startMinutes = timeToMinutes(startTime.slice(0, 5));
      const endMinutes = timeToMinutes(endTime.slice(0, 5));
      const conflicts = [];

      allSlots.forEach((slot) => {
        const slotStart = timeToMinutes(slot.attributes.startTime?.slice(0, 5) || '00:00');
        const slotEnd = timeToMinutes(slot.attributes.endTime?.slice(0, 5) || '00:00');
        if (
          (startMinutes < slotEnd && endMinutes > slotStart) &&
          !(startMinutes === slotEnd || endMinutes === slotStart)
        ) {
          conflicts.push({
            startTime: slot.attributes.startTime?.slice(0, 5) || '-',
            endTime: slot.attributes.endTime?.slice(0, 5) || '-',
          });
        }
      });

      return { isOverlap: conflicts.length > 0, conflicts };
    })(startTime.value, endTime.value, allSlotsForVaccine);

    if (isOverlap) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: `เวลาที่เลือกซ้อนทับกับช่วงเวลา: ${conflicts
          .map((conflict) => `${conflict.startTime}–${conflict.endTime}`)
          .join(', ')} กรุณาเลือกช่วงเวลาใหม่`,
        icon: 'warning',
        customClass: {
          popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    const confirm = await MySwal.fire({
      title: 'ยืนยันการสร้าง',
      text: `คุณต้องการสร้างช่วงเวลา ${startTime.value}–${endTime.value} สำหรับ ${selectedVaccine.label} ด้วยโควต้า ${quota} หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, สร้าง',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
        title: 'text-xl font-bold text-[#30266D] mb-3',
        htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        cancelButton: 'bg-white text-[#30266D] px-4 py-2 rounded-xl font-semibold text-base border border-[#30266D]/50 hover:bg-[#30266D]/30 transition-all duration-300 transform hover:scale-105',
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
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(result.error?.message || 'เกิดข้อผิดพลาด');
      }

      await MySwal.fire({
        title: 'สำเร็จ',
        text: 'สร้างช่วงเวลาให้บริการเรียบร้อยแล้ว',
        icon: 'success',
        customClass: {
          popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        timer: 1500,
        showConfirmButton: false,
      });
      onSave();
    } catch (error) {
      await MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : 'ไม่สามารถสร้างช่วงเวลาได้',
        icon: 'error',
        customClass: {
          popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      if (error.message === 'Unauthorized') {
        router.push('/login');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const vaccineOptions = vaccines
    .filter((vaccine) => vaccine.attributes?.useTimeSlots && vaccineQuotas[vaccine.id] > 0)
    .map((vaccine) => ({
      value: vaccine.id,
      label: vaccine.attributes.title,
    }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-poppins p-6 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg border border-[#30266D]/50">
      <h3 className="text-2xl font-semibold text-[#30266D]">สร้างช่วงเวลาให้บริการใหม่</h3>
      <div>
        <label className="block mb-1 text-base font-medium text-[#30266D]" htmlFor="vaccine">วัคซีน</label>
        {vaccines.length > 0 ? (
          <Select
            id="vaccine"
            options={vaccineOptions}
            value={selectedVaccine}
            onChange={setSelectedVaccine}
            placeholder="-- เลือกวัคซีน --"
            noOptionsMessage={() => 'ไม่พบวัคซีน'}
            isClearable
            isDisabled={submitting}
            styles={customSelectStyles}
            aria-label="เลือกวัคซีนสำหรับช่วงเวลาให้บริการ"
          />
        ) : (
          <p className="text-base text-[#30266D] italic">ไม่พบวัคซีนที่สามารถกำหนดช่วงเวลาได้</p>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block mb-1 text-base font-medium text-[#30266D]" htmlFor="start-time">เวลาเริ่ม</label>
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
          <label className="block mb-1 text-base font-medium text-[#30266D]" htmlFor="end-time">เวลาสิ้นสุด</label>
          <Select
            id="end-time"
            options={endTimeOptions}
            value={endTime}
            onChange={setEndTime}
            placeholder="-- เลือกเวลาสิ้นสุด --"
            isClearable
            isDisabled={submitting || !startTime}
            styles={customSelectStyles}
            aria-label="เลือกเวลาสิ้นสุดของช่วงเวลาให้บริการ"
          />
        </div>
      </div>

      <div>
        <label className="block mb-1 text-base font-medium text-[#30266D]" htmlFor="quota">จำนวนโควต้า</label>
        <input
          id="quota"
          type="number"
          min={1}
          max={remainingQuota !== null ? remainingQuota : undefined}
          value={quota}
          onChange={(e) => setQuota(Number(e.target.value))}
          disabled={submitting || !selectedVaccine}
          className="w-full border border-[#30266D]/50 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-sm text-base text-[#30266D] focus:outline-none focus:ring-2 focus:ring-[#F9669D] transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
          aria-label="จำนวนโควต้าสำหรับช่วงเวลาให้บริการ"
        />
        {selectedVaccine && maxQuota !== null && (
          <p className="mt-1 text-sm text-[#30266D]">
            โควต้าสูงสุด: {maxQuota}, คงเหลือ: {remainingQuota}
          </p>
        )}
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
        <label className="text-base font-medium text-[#30266D]" htmlFor="is-enabled">เปิดใช้งาน</label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-white text-[#30266D] border border-[#30266D]/50 text-base font-semibold hover:bg-[#30266D]/30 transition-all duration-300 hover:scale-105 disabled:opacity-50"
          aria-label="ยกเลิกการสร้างช่วงเวลาให้บริการ"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-[#F9669D] text-white text-base font-semibold hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105 disabled:opacity-50"
          aria-label="สร้างช่วงเวลาให้บริการ"
        >
          {submitting ? 'กำลังสร้าง...' : 'สร้าง'}
        </button>
      </div>
    </form>
  );
}