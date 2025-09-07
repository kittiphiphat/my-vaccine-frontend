
'use client';

import { useState, useMemo, useEffect } from 'react';
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
  if (!allSlots || allSlots.length === 0) return allTimes;

  return allTimes.filter((time) => {
    const timeMinutes = timeToMinutes(time.value);
    for (const slot of allSlots) {
      if (currentId && slot.id === currentId) continue;
      if (slot.attributes.vaccine?.data?.id !== selectedVaccineId) continue;
      const slotStartMinutes = timeToMinutes(slot.attributes.startTime?.slice(0, 5));
      const slotEndMinutes = timeToMinutes(slot.attributes.endTime?.slice(0, 5));
      // Exclude times within or at the boundaries of an existing slot
      if (timeMinutes >= slotStartMinutes && timeMinutes <= slotEndMinutes) {
        console.log(`Time ${time.value} excluded: within or at boundary of slot ${slot.attributes.startTime.slice(0, 5)}–${slot.attributes.endTime.slice(0, 5)}`);
        return false;
      }
    }
    console.log(`Time ${time.value} is available`);
    return true;
  });
}

function checkTimeOverlap(startTime, endTime, allSlots, currentId, vaccineId) {
  const startMinutes = timeToMinutes(startTime?.slice(0, 5));
  const endMinutes = timeToMinutes(endTime?.slice(0, 5));
  const conflicts = allSlots
    .filter((slot) => slot.attributes.vaccine?.data?.id === vaccineId)
    .filter((slot) => {
      if (currentId && slot.id === currentId) return false;
      const slotStartMinutes = timeToMinutes(slot.attributes.startTime?.slice(0, 5));
      const slotEndMinutes = timeToMinutes(slot.attributes.endTime?.slice(0, 5));
      const isOverlap = startMinutes < slotEndMinutes && endMinutes > slotStartMinutes;
      if (isOverlap) {
        console.log(`Overlap detected with slot ${slot.attributes.startTime.slice(0, 5)}–${slot.attributes.endTime.slice(0, 5)}`);
      }
      return isOverlap;
    })
    .map((slot) => ({
      startTime: slot.attributes.startTime.slice(0, 5),
      endTime: slot.attributes.endTime.slice(0, 5),
    }));

  return { isOverlap: conflicts.length > 0, conflicts };
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

export default function VaccineTimeSlotForm({
  initialData = {},
  onSave,
  onCancel,
  allSlots = [],
}) {
  const router = useRouter();
  const [vaccines, setVaccines] = useState([]);
  const [selectedVaccine, setSelectedVaccine] = useState(
    initialData.vaccine?.data
      ? {
          value: initialData.vaccine.data.id,
          label: initialData.vaccine.data.attributes.title,
          serviceStartTime: initialData.vaccine.data.attributes.serviceStartTime?.slice(0, 5),
          serviceEndTime: initialData.vaccine.data.attributes.serviceEndTime?.slice(0, 5),
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
  const [quota, setQuota] = useState(initialData.quota || 0);
  const [isEnabled, setIsEnabled] = useState(initialData.is_enabled ?? true);
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
              confirmButton:
                'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
            },
            confirmButtonText: 'ตกลง',
          });
        }
      } catch (error) {
        MySwal.fire({
          title: 'เกิดข้อผิดพลาด',
          text:
            error.message === 'Failed to fetch vaccines'
              ? 'ไม่สามารถโหลดข้อมูลวัคซีนได้'
              : 'กรุณาเข้าสู่ระบบใหม่',
          icon: 'error',
          customClass: {
            popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
            title: 'text-lg font-bold text-[#30266D] mb-3',
            htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
            confirmButton:
              'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
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
    return filterAvailableTimes(allTimeOptions, allSlots, initialData.id, vaccineId);
  }, [allTimeOptions, allSlots, initialData.id, selectedVaccine]);

  const endTimeOptions = useMemo(() => {
    if (!startTime) return [];
    const vaccineId = selectedVaccine?.value || initialData.vaccine?.data?.id;
    const startMinutes = timeToMinutes(startTime.value);
    return allTimeOptions
      .filter((opt) => timeToMinutes(opt.value) > startMinutes)
      .filter((time) => {
        const proposedEndMinutes = timeToMinutes(time.value);
        for (const slot of allSlots) {
          if (initialData.id && slot.id === initialData.id) continue;
          if (slot.attributes.vaccine?.data?.id !== vaccineId) continue;
          const slotStartMinutes = timeToMinutes(slot.attributes.startTime?.slice(0, 5));
          const slotEndMinutes = timeToMinutes(slot.attributes.endTime?.slice(0, 5));
          // Check if the new time range overlaps with an existing slot
          if (startMinutes < slotEndMinutes && proposedEndMinutes > slotStartMinutes) {
            console.log(
              `End time ${time.value} excluded: overlaps with slot ${slot.attributes.startTime.slice(0, 5)}–${slot.attributes.endTime.slice(0, 5)}`
            );
            return false;
          }
        }
        console.log(`End time ${time.value} is available`);
        return true;
      });
  }, [startTime, allTimeOptions, allSlots, initialData.id, selectedVaccine]);

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
          confirmButton:
            'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
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
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
          confirmButton:
            'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
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
          confirmButton:
            'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    const { isOverlap, conflicts } = checkTimeOverlap(
      formatTimeToStrapi(startTime),
      formatTimeToStrapi(endTime),
      allSlots,
      initialData.id,
      selectedVaccine.value
    );
    if (isOverlap) {
      const conflictMessage = conflicts
        .map((conflict) => `${conflict.startTime}–${conflict.endTime}`)
        .join(', ');
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: `เวลที่เลือกซ้อนทับกับช่วงเวลา: ${conflictMessage} กรุณาเลือกช่วงเวลาใหม่`,
        icon: 'warning',
        customClass: {
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
          confirmButton:
            'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
      });
      setSubmitting(false);
      return;
    }

    const confirm = await MySwal.fire({
      title: initialData.id ? 'ยืนยันการแก้ไข' : 'ยืนยันการสร้าง',
      text: 'คุณต้องการดำเนินการต่อหรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ดำเนินการ',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
        title: 'text-lg font-bold text-[#30266D] mb-3',
        htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
        confirmButton:
          'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        cancelButton:
          'bg-white text-[#30266D] px-4 py-2 rounded-xl font-semibold border border-[#30266D] hover:bg-[#30266D]/30 transition-all',
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
        vaccine: selectedVaccine?.value || initialData?.vaccine?.data?.id,
      },
    };

    try {
      const url = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots${
        initialData.id ? `/${initialData.id}` : ''
      }`;
      const method = initialData.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const result = await res.json();
        if (res.status === 401) throw new Error('Authentication invalid or expired');
        throw new Error(result.error?.message || 'เกิดข้อผิดพลาด');
      }

      const responseData = await res.json();
      const updatedSlot = {
        id: initialData.id || responseData.data.id,
        attributes: {
          startTime: formatTimeToStrapi(startTime),
          endTime: formatTimeToStrapi(endTime),
          quota,
          is_enabled: isEnabled,
          vaccine: {
            data: {
              id: selectedVaccine?.value || initialData?.vaccine?.data?.id,
              attributes: {
                title: selectedVaccine?.label || initialData?.vaccine?.data?.attributes?.title,
              },
            },
          },
        },
      };

      await MySwal.fire({
        title: 'สำเร็จ',
        text: initialData.id ? 'ข้อมูลถูกบันทึกแล้ว' : 'สร้างช่วงเวลาใหม่สำเร็จ',
        icon: 'success',
        customClass: {
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
          confirmButton:
            'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
        timer: 1500,
        showConfirmButton: false,
      });
      onSave(updatedSlot);
    } catch (error) {
      await MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text:
          error.message === 'Authentication invalid or expired'
            ? 'กรุณาเข้าสู่ระบบใหม่'
            : error.message,
        icon: 'error',
        customClass: {
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#30266D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#30266D] font-medium mb-4',
          confirmButton:
            'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105',
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
      <h3 className="text-xl font-semibold text-[#30266D]">
        {initialData.id ? 'แก้ไขช่วงเวลาให้บริการ' : 'สร้างช่วงเวลาให้บริการใหม่'}
      </h3>

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
            isDisabled={submitting || (initialData.id && !!initialData.vaccine?.data?.id)}
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
          min={1}
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
          aria-label="ยกเลิกการแก้ไขหรือสร้างช่วงเวลาให้บริการ"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-[#F9669D] text-white text-sm font-semibold hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105 cursor-pointer disabled:opacity-50"
          aria-label="บันทึกหรือสร้างช่วงเวลาให้บริการ"
        >
          {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </form>
  );
}
