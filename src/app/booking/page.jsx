'use client';

import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { th } from 'date-fns/locale';
import { motion } from 'framer-motion';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

function timeToMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isDateAllowed(date, bookingStartDate, bookingEndDate, allowedDays, today) {
  const day = date.day() === 0 ? 6 : date.day() - 1;
  const checkDate = date.startOf('day');
  const start = bookingStartDate ? dayjs(bookingStartDate).startOf('day') : null;
  const end = bookingEndDate ? dayjs(bookingEndDate).startOf('day') : null;

  if (checkDate.isBefore(today)) return true;
  if (start && checkDate.isBefore(start)) return true;
  if (end && checkDate.isAfter(end)) return true;
  if (allowedDays.length > 0 && !allowedDays.includes(day)) return true;

  return false;
}

export function VaccineBooking({ vaccine }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [slotFilter, setSlotFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [effectiveMaxQuota, setEffectiveMaxQuota] = useState(100);

  const slotsPerPage = 10;

  const {
    id: vaccineId,
    attributes: {
      name,
      bookingStartDate,
      bookingEndDate,
      minAge,
      maxAge,
      gender,
      maxQuota,
      useTimeSlots,
      cutoffMinutesBeforeSlot,
      serviceStartTime,
      serviceEndTime,
      vaccine_time_slots,
      vaccine_service_days,
      booking_settings,
    },
  } = vaccine;

  useEffect(() => {
    const duration = booking_settings?.data?.[0]?.attributes?.slotDurationMinutes || 30;
    const quota = maxQuota ?? 100;
    setSlotDurationMinutes(duration);
    setEffectiveMaxQuota(quota);
  }, [vaccineId, useTimeSlots, maxQuota, booking_settings]);

  const allowedDays = useMemo(() => {
    return (
      vaccine_service_days?.data
        ?.map((d) => d.attributes.day_of_week)
        .flat() || []
    );
  }, [vaccine_service_days]);

  const disabledDays = useMemo(() => {
    const today = dayjs().startOf('day');
    return (date) => isDateAllowed(dayjs(date), bookingStartDate, bookingEndDate, allowedDays, today);
  }, [bookingStartDate, bookingEndDate, allowedDays]);

  useEffect(() => {
    async function fetchUserAndPatient() {
      try {
        setPatientLoading(true);
        const userRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`,
          { method: 'GET', credentials: 'include' }
        );

        if (!userRes.ok) {
          if (userRes.status === 401) {
            throw new Error('Unauthorized');
          }
          throw new Error('เกิดข้อผิดพลาดขณะโหลดข้อมูลผู้ใช้');
        }

        const user = await userRes.json();

        const patientRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients?filters[email][$eq]=${encodeURIComponent(user.email)}`,
          { method: 'GET', credentials: 'include' }
        );

        if (!patientRes.ok) {
          throw new Error('เกิดข้อผิดพลาดขณะโหลดข้อมูลผู้ป่วย');
        }

        const patientData = await patientRes.json();
        const patient = patientData?.data?.[0];

        if (patient) {
          setPatient({ id: patient.id, ...patient.attributes });
        } else {
          setPatient(null);
        }
      } catch (err) {
        if (err.message === 'Unauthorized') {
          router.replace('/login');
        }
        setPatient(null);
      } finally {
        setPatientLoading(false);
      }
    }

    fetchUserAndPatient();
  }, [router]);

  function calculateAge(birthDate) {
    if (!birthDate) return 0;
    return dayjs().diff(dayjs(birthDate), 'year');
  }

  function isEligible() {
    if (!patient) return false;
    const age = calculateAge(patient.birth_date);
    const patientGender = patient.gender?.toLowerCase();
    const vaccineGender = (gender || '').toLowerCase();

    const allowedGenders = ['ทุกเพศ', 'any'];
    const genderMatch =
      allowedGenders.includes(vaccineGender) || patientGender === vaccineGender;

    const ageMatch = (!minAge || age >= minAge) && (!maxAge || age <= maxAge);
    return genderMatch && ageMatch;
  }

  function formatTimeHHMM(timeStr) {
    if (!timeStr) return '';
    return timeStr.length > 5 ? timeStr.slice(0, 5) : timeStr;
  }

  function generateTimeSlots(startTime, endTime, durationMinutes, selectedDate) {
    const slots = [];
    let [sh, sm] = startTime ? startTime.split(':').map(Number) : [8, 0];
    let [eh, em] = endTime ? endTime.split(':').map(Number) : [17, 0];
    let startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const lunchStart = 12 * 60; // 12:00
    const lunchEnd = 13 * 60; // 13:00

    const isToday = selectedDate && dayjs(selectedDate).isSame(dayjs().tz('Asia/Bangkok'), 'day');
    const now = dayjs().tz('Asia/Bangkok');
    const cutoff = cutoffMinutesBeforeSlot || 0;

    while (startMinutes + durationMinutes <= endMinutes) {
      if (startMinutes >= lunchStart && startMinutes < lunchEnd) {
        startMinutes = lunchEnd;
        continue;
      }

      const h = Math.floor(startMinutes / 60);
      const m = startMinutes % 60;
      const startTimeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const endTime = dayjs(`${dayjs(selectedDate).format('YYYY-MM-DD')}T${startTimeStr}`)
        .add(durationMinutes, 'minute')
        .format('HH:mm');

      const slotStart = dayjs(`${dayjs(selectedDate).format('YYYY-MM-DD')}T${startTimeStr}`);
      const available = !isToday || (isToday && now.isBefore(slotStart.subtract(cutoff, 'minute')));

      if (available) {
        slots.push({
          id: startTimeStr,
          start: startTimeStr,
          end: endTime,
          available: true,
        });
      }
      startMinutes += durationMinutes;
    }

    return slots;
  }

  useEffect(() => {
    async function fetchBookingCounts() {
      if (!date) {
        setAvailableSlots([]);
        setSelectedSlot(null);
        setCurrentPage(1);
        return;
      }

      setLoading(true);
      try {
        const selectedDate = dayjs(date).format('YYYY-MM-DD');
        const isToday = dayjs(selectedDate).isSame(dayjs().tz('Asia/Bangkok'), 'day');
        const now = dayjs().tz('Asia/Bangkok');
        const cutoff = cutoffMinutesBeforeSlot || 0;

        if (useTimeSlots) {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?filters[vaccine]=${vaccineId}&filters[bookingDate]=${selectedDate}&filters[status]=confirmed&populate[vaccine_time_slot]=*&pagination[pageSize]=1000`,
            { method: 'GET', credentials: 'include' }
          );

          if (!res.ok) {
            if (res.status === 401) {
              throw new Error('Unauthorized');
            }
            throw new Error('เกิดข้อผิดพลาดขณะโหลดข้อมูลการจอง');
          }

          const bookings = (await res.json()).data;

          const slotBookingCountMap = {};
          bookings.forEach((b) => {
            const slotId = b.attributes.vaccine_time_slot?.data?.id;
            if (!slotId) return;
            slotBookingCountMap[slotId] = (slotBookingCountMap[slotId] || 0) + 1;
          });

          const slots = (vaccine_time_slots?.data || [])
            .map((slot) => {
              const attr = slot.attributes;
              const slotId = slot.id;
              const bookedCount = slotBookingCountMap[slotId] || 0;
              const slotStart = dayjs(`${selectedDate}T${attr.startTime}`);
              const available = attr.is_enabled && bookedCount < attr.quota && (!isToday || (isToday && now.isBefore(slotStart.subtract(cutoff, 'minute'))));

              return {
                id: slotId.toString(),
                start: formatTimeHHMM(attr.startTime),
                end: formatTimeHHMM(attr.endTime),
                quota: attr.quota,
                booked: bookedCount,
                available,
              };
            })
            .filter((slot) => slot.available && slot.quota - slot.booked > 0)
            .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

          setAvailableSlots(slots);
          const firstAvailableSlot = slots.find((slot) => slot.quota - slot.booked > 0);
          setSelectedSlot(firstAvailableSlot ? firstAvailableSlot.id : null);
        } else {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?filters[vaccine]=${vaccineId}&filters[bookingDate]=${selectedDate}&filters[status]=confirmed&pagination[pageSize]=1000`,
            { method: 'GET', credentials: 'include' }
          );

          if (!res.ok) {
            if (res.status === 401) {
              throw new Error('Unauthorized');
            }
            throw new Error('เกิดข้อผิดพลาดขณะโหลดข้อมูลการจอง');
          }

          const bookings = (await res.json()).data;
          const bookedCount = bookings.length;

          if (bookedCount >= effectiveMaxQuota) {
            await MySwal.fire({
              icon: 'warning',
              title: 'โควตาวัคซีนเต็มแล้ว',
              text: 'ไม่สามารถจองได้เนื่องจากถึงขีดจำกัดโควต้าแล้ว',
              timer: 1500,
              showConfirmButton: false,
              customClass: {
                popup: 'bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-[#F9669D] p-6',
                title: 'text-lg font-semibold text-[#30266D]',
                htmlContainer: 'text-sm text-[#4B5563] font-medium mb-3',
                confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
              },
            });
            setAvailableSlots([]);
            setSelectedSlot(null);
            setLoading(false);
            return;
          }

          const allPossibleSlots = generateTimeSlots(serviceStartTime, serviceEndTime, slotDurationMinutes, date);
          const slotBookingCountMap = {};
          bookings.forEach((b) => {
            const startTime = b.attributes.startTime;
            if (!startTime) return;
            slotBookingCountMap[startTime] = (slotBookingCountMap[startTime] || 0) + 1;
          });

          const remainingQuota = effectiveMaxQuota - bookedCount;
          const quotaPerSlot = Math.max(1, Math.ceil(remainingQuota / (allPossibleSlots.length || 1)));

          const slots = allPossibleSlots
            .map((slot) => {
              const bookedCount = slotBookingCountMap[slot.start] || 0;
              const slotStart = dayjs(`${selectedDate}T${slot.start}`);
              const available = slot.available && (!isToday || (isToday && now.isBefore(slotStart.subtract(cutoff, 'minute')))) && bookedCount < quotaPerSlot;

              return {
                ...slot,
                quota: quotaPerSlot,
                booked: bookedCount,
                available,
              };
            })
            .filter((slot) => slot.available && slot.quota - slot.booked > 0)
            .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

          setAvailableSlots(slots);
          const firstAvailableSlot = slots.find((slot) => slot.quota - slot.booked > 0);
          setSelectedSlot(firstAvailableSlot ? firstAvailableSlot.id : null);
        }
      } catch (err) {
        if (err.message === 'Unauthorized') {
          router.replace('/login');
        }
        setAvailableSlots([]);
        setSelectedSlot(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBookingCounts();
  }, [
    date,
    useTimeSlots,
    vaccine_time_slots,
    vaccineId,
    cutoffMinutesBeforeSlot,
    slotDurationMinutes,
    serviceStartTime,
    serviceEndTime,
    effectiveMaxQuota,
    router,
  ]);

  useEffect(() => {
    if (!open) {
      setDate(null);
      setAvailableSlots([]);
      setSelectedSlot(null);
      setLoading(false);
      setSlotFilter('all');
      setCurrentPage(1);
    }
  }, [open]);

  async function handleBooking() {
    if (loading || !patient || !date || !selectedSlot) {
      await MySwal.fire({
        icon: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณาเลือกวันที่และช่วงเวลาก่อนยืนยันการจอง',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-[#F9669D] p-6',
          title: 'text-lg font-semibold text-[#30266D]',
          htmlContainer: 'text-sm text-[#4B5563] font-medium mb-3',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      return;
    }

    setOpen(false);

    await new Promise((r) => setTimeout(r, 300));

    const result = await MySwal.fire({
      icon: 'question',
      title: 'ยืนยันการจอง?',
      text: 'คุณแน่ใจจะจองวัคซีนนี้หรือไม่?',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: 'bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-[#F9669D] p-6',
        title: 'text-lg font-semibold text-[#30266D]',
        htmlContainer: 'text-sm text-[#4B5563] font-medium mb-3',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        cancelButton: 'bg-white text-[#30266D] px-4 py-2 rounded-lg font-medium border border-[#F9669D] hover:bg-[#F9669D]/10 transition-all duration-300',
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    if (!isEligible()) {
      await MySwal.fire({
        icon: 'warning',
        title: 'คุณไม่มีสิทธิ์จองวัคซีนนี้',
        text: 'กรุณาตรวจสอบอายุหรือเพศที่กำหนดสำหรับวัคซีนนี้',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-[#F9669D] p-6',
          title: 'text-lg font-semibold text-[#30266D]',
          htmlContainer: 'text-sm text-[#4B5563] font-medium mb-3',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      return;
    }

    try {
      const selectedDate = dayjs(date).format('YYYY-MM-DD');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?filters[vaccine]=${vaccineId}&filters[bookingDate]=${selectedDate}&filters[status]=confirmed&pagination[pageSize]=1000`,
        { method: 'GET', credentials: 'include' }
      );

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Unauthorized');
        }
        throw new Error('เกิดข้อผิดพลาดขณะตรวจสอบโควต้า');
      }

      const bookings = (await res.json()).data;
      const bookedCount = bookings.length;

      if (bookedCount >= effectiveMaxQuota) {
        await MySwal.fire({
          icon: 'warning',
          title: 'โควตาวัคซีนเต็มแล้ว',
          text: 'ไม่สามารถจองได้เนื่องจากถึงขีดจำกัดโควต้าแล้ว',
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: 'bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-[#F9669D] p-6',
            title: 'text-lg font-semibold text-[#30266D]',
            htmlContainer: 'text-sm text-[#4B5563] font-medium mb-3',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
          },
        });
        return;
      }

      let timeLabel = availableSlots.find((s) => s.id === selectedSlot);
      if (!timeLabel && availableSlots.length > 0) {
        timeLabel = availableSlots.find((s) => s.quota - s.booked > 0);
        if (timeLabel) {
          setSelectedSlot(timeLabel.id);
        }
      }
      if (!timeLabel) {
        await MySwal.fire({
          icon: 'error',
          title: 'ไม่พบช่วงเวลาที่เลือก',
          text: 'ไม่มีช่วงเวลาที่ว่างสำหรับวันนี้',
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: 'bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-[#F9669D] p-6',
            title: 'text-lg font-semibold text-[#30266D]',
            htmlContainer: 'text-sm text-[#4B5563] font-medium mb-3',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
          },
        });
        return;
      }

      const slotBookings = bookings.filter((b) => b.attributes.startTime === timeLabel.start).length;
      if (slotBookings >= timeLabel.quota) {
        await MySwal.fire({
          icon: 'warning',
          title: 'ช่วงเวลาเต็มแล้ว',
          text: 'ช่วงเวลาที่เลือกถึงขีดจำกัดโควต้าแล้ว',
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: 'bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-[#F9669D] p-6',
            title: 'text-lg font-semibold text-[#30266D]',
            htmlContainer: 'text-sm text-[#4B5563] font-medium mb-3',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
          },
        });
        return;
      }

      const payload = {
        data: {
          vaccine: vaccineId,
          patient: patient.id,
          bookingDate: selectedDate,
          status: 'confirmed',
          vaccine_time_slot: useTimeSlots ? Number(selectedSlot) : null,
          startTime: timeLabel.start,
          endTime: timeLabel.end,
        },
      };

      const bookingRes = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!bookingRes.ok) {
        let errorData;
        try {
          errorData = await bookingRes.json();
        } catch (e) {
          errorData = { error: { message: 'ไม่สามารถแปลผลการตอบกลับจากเซิร์ฟเวอร์' } };
        }
        if (bookingRes.status === 401) {
          throw new Error('Unauthorized');
        }
        throw new Error(
          errorData.error?.message || 'เกิดข้อผิดพลาดขณะจอง (รหัสข้อผิดพลาด: 400)'
        );
      }

      let timerInterval;
      await MySwal.fire({
        icon: 'success',
        title: 'จองสำเร็จ',
        html: 'กำลังโหลด <b></b>',
        timer: 2000,
        timerProgressBar: true,
        didOpen: () => {
          MySwal.showLoading();
          const timer = MySwal.getPopup().querySelector('b');
          timerInterval = setInterval(() => {
            timer.textContent = `${Math.ceil(MySwal.getTimerLeft() / 1000)}`;
          }, 100);
        },
        willClose: () => {
          clearInterval(timerInterval);
        },
        customClass: {
          popup: 'bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-[#F9669D] p-6',
          title: 'text-lg font-semibold text-[#30266D]',
          htmlContainer: 'text-sm text-[#4B5563] font-medium mb-3',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });

      router.push('/appointment?tab=active');
    } catch (err) {
      const errorMsg = err.message;
      if (err.message === 'Unauthorized') {
        await MySwal.fire({
          icon: 'error',
          title: 'กรุณาเข้าสู่ระบบ',
          text: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: 'bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-[#F9669D] p-6',
            title: 'text-lg font-semibold text-[#30266D]',
            htmlContainer: 'text-sm text-[#4B5563] font-medium mb-3',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
          },
        }).then(() => router.replace('/login'));
      } else {
        await MySwal.fire({
          icon: 'error',
          title: 'จองไม่สำเร็จ',
          html: `<p><strong>ข้อผิดพลาด:</strong> ${errorMsg}</p>`,
          timer: 3000,
          showConfirmButton: false,
          customClass: {
            popup: 'bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-[#F9669D] p-6',
            title: 'text-lg font-semibold text-[#30266D]',
            htmlContainer: 'text-sm text-[#4B5563] font-medium mb-3',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
          },
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredSlots = useMemo(() => {
    return availableSlots.filter((slot) => {
      if (slotFilter === 'all') return true;
      const startHour = parseInt(slot.start.split(':')[0], 10);
      if (slotFilter === 'morning') return startHour < 12;
      if (slotFilter === 'afternoon') return startHour >= 13 && startHour < 17;
      return true;
    });
  }, [availableSlots, slotFilter]);

  const paginatedSlots = useMemo(() => {
    const start = (currentPage - 1) * slotsPerPage;
    const end = start + slotsPerPage;
    return filteredSlots.slice(start, end);
  }, [filteredSlots, currentPage]);

  const totalPages = Math.ceil(filteredSlots.length / slotsPerPage);

  return (
    <div className="w-full">
      <style jsx>{`
        .calendar-container {
          max-width: 100%;
          margin: 0 auto;
        }
        .time-slot {
          transition: all 0.2s ease-in-out;
        }
        .time-slot:hover {
          transform: scale(1.02);
        }
        .time-slot:active {
          transform: scale(0.98);
        }
        @media (max-width: 640px) {
          .dialog-content {
            max-width: 90vw !important;
            margin: 0.5rem;
          }
          .calendar-container {
            max-width: 100%;
          }
          .slot-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 641px) and (max-width: 1024px) {
          .slot-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (min-width: 1025px) {
          .slot-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `}</style>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          className="bg-[#F9669D] text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-[#F9669D]/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto shadow-sm focus:ring-2 focus:ring-[#F9669D]/50"
          disabled={patientLoading}
          onClick={(e) => {
            if (!patient) {
              e.preventDefault();
              MySwal.fire({
                icon: 'warning',
                title: 'กรุณาเข้าสู่ระบบก่อนจอง',
                text: 'คุณต้องเข้าสู่ระบบเพื่อดำเนินการจอง',
                timer: 2000,
                showConfirmButton: false,
                customClass: {
                  popup: 'bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-[#F9669D] p-6',
                  title: 'text-lg font-semibold text-[#30266D]',
                  htmlContainer: 'text-sm text-[#4B5563] font-medium mb-3',
                  confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
                },
              });
            } else {
              setOpen(true);
            }
          }}
          aria-label="จองวัคซีน"
        >
          จองวัคซีน
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="rounded-lg shadow-lg w-full max-w-[95vw] sm:max-w-[700px] md:max-w-[900px] max-h-[90vh] overflow-y-auto p-6 bg-white/90 backdrop-blur-md border border-[#F9669D] dialog-content"
        >
          <DialogHeader className="pb-4">
            <DialogTitle
              className="text-xl sm:text-2xl font-semibold flex items-center gap-2"
              style={{ color: '#30266D' }}
            >
              <CalendarIcon className="h-5 w-5" style={{ color: '#F9669D' }} />
              จองวัคซีน: {name}
            </DialogTitle>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col md:flex-row gap-6"
          >
            <div className="w-full md:w-1/2 calendar-container">
              <label
                className="block font-semibold text-sm mb-2"
                style={{ color: '#30266D' }}
              >
                เลือกวันที่
              </label>
              <Card
                className="rounded-lg shadow-sm border-[#F9669D] bg-white/90"
              >
                <CardContent className="p-4">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => setDate(newDate || null)}
                    disabled={disabledDays}
                    locale={th}
                    fromDate={bookingStartDate ? new Date(bookingStartDate) : undefined}
                    toDate={bookingEndDate ? new Date(bookingEndDate) : undefined}
                    className="w-full rounded-lg"
                    classNames={{
                      months: 'flex flex-col space-y-4',
                      month: 'space-y-4 w-full',
                      caption: 'flex justify-center pt-2 relative items-center',
                      caption_label: 'text-sm font-semibold',
                      nav: 'flex items-center gap-2',
                      nav_button: 'h-7 w-7 bg-transparent p-0 opacity-80 hover:bg-[#F9669D]/20 rounded-full transition-all duration-300 focus:ring-2 focus:ring-[#F9669D]/50',
                      table: 'w-full border-collapse',
                      head_row: 'flex w-full',
                      head_cell: 'rounded-md w-full flex-1 font-semibold text-xs text-center text-[#30266D]',
                      row: 'flex w-full mt-2',
                      cell: 'h-8 w-full flex-1 text-center text-xs p-0 relative focus-within:z-20',
                      day: 'h-8 w-full flex-1 p-0 font-medium rounded-md transition-all duration-300 hover:bg-[#F9669D]/20 aria-selected:bg-[#F9669D] aria-selected:text-white focus:outline-none focus:ring-2 focus:ring-[#F9669D]/50 cursor-pointer',
                      day_selected: 'bg-[#F9669D] text-white border border-[#F9669D]',
                      day_today: 'border border-[#30266D] text-[#30266D] bg-[#F9669D]/10',
                      day_disabled: 'text-[#4B5563]/50 cursor-not-allowed',
                    }}
                    style={{
                      color: '#30266D',
                    }}
                    components={{
                      Caption: ({ displayMonth }) => (
                        <div className="flex justify-center items-center pt-2 px-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDate(dayjs(date || new Date()).subtract(1, 'month').toDate())}
                            disabled={bookingStartDate && dayjs(date || new Date()).subtract(1, 'month').isBefore(dayjs(bookingStartDate).startOf('month'))}
                            className="h-7 w-7 hover:bg-[#F9669D]/20 rounded-full focus:ring-2 focus:ring-[#F9669D]/50"
                            style={{
                              color: '#30266D',
                            }}
                            aria-label="ที่แล้วหน้า"
                          >
                            <ChevronLeftIcon className="h-4 w-4" />
                          </Button>
                          <span className="text-sm font-semibold" style={{ color: '#30266D' }}>
                            {dayjs(displayMonth).format('MMMM')} {dayjs(displayMonth).year() + 543}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDate(dayjs(date || new Date()).add(1, 'month').toDate())}
                            disabled={bookingEndDate && dayjs(date || new Date()).add(1, 'month').isAfter(dayjs(bookingEndDate).startOf('month'))}
                            className="h-7 w-7 hover:bg-[#F9669D]/20 rounded-full focus:ring-2 focus:ring-[#F9669D]/50"
                            style={{
                              color: '#30266D',
                            }}
                            aria-label="เดือนถัดไป"
                          >
                            <ChevronRightIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ),
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="w-full md:w-1/2">
              <div className="sticky top-0 pb-3 z-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <label
                    className="block font-semibold text-sm"
                    style={{ color: '#30266D' }}
                  >
                    เลือกเวลา
                  </label>
                  <Select value={slotFilter} onValueChange={setSlotFilter}>
                    <SelectTrigger
                      className="w-full sm:w-44 rounded-lg focus:ring-2 focus:ring-[#F9669D]/50 text-sm py-2 border-[#F9669D] bg-white/90"
                      style={{
                        color: '#30266D',
                      }}
                    >
                      <SelectValue placeholder="เลือกช่วงเวลา" />
                    </SelectTrigger>
                    <SelectContent
                      className="rounded-lg shadow-lg text-sm bg-white/90 border-[#F9669D]"
                      style={{
                        color: '#30266D',
                      }}
                    >
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      <SelectItem value="morning">เช้า (ก่อน 12:00)</SelectItem>
                      <SelectItem value="afternoon">บ่าย (13:00-17:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {loading ? (
                <motion.div
                  className="flex flex-col items-center justify-center py-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="w-6 h-6 border-3 border-[#F9669D]/50 border-t-[#30266D] rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  ></motion.div>
                  <p
                    className="mt-2 text-sm font-medium"
                    style={{ color: '#30266D' }}
                  >
                    กำลังโหลดช่วงเวลา...
                  </p>
                </motion.div>
              ) : date ? (
                paginatedSlots.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid slot-grid gap-2 mt-3 max-h-[200px] overflow-y-auto pr-1.5"
                    role="listbox"
                    aria-label="ช่วงเวลาที่สามารถจองได้"
                  >
                    {paginatedSlots.map((slot) => (
                      <motion.button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot.id)}
                        className="p-2.5 rounded-lg border shadow-sm text-left text-sm time-slot focus:outline-none focus:ring-2 focus:ring-[#F9669D]/50"
                        style={{
                          backgroundColor: selectedSlot === slot.id ? '#F9669D' : 'white',
                          borderColor: '#F9669D',
                          color: selectedSlot === slot.id ? 'white' : '#30266D',
                        }}
                        disabled={!slot.available}
                        aria-label={`เลือกช่วงเวลา ${slot.start} ถึง ${slot.end}`}
                        aria-selected={selectedSlot === slot.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="font-medium">
                          {slot.start} - {slot.end}
                        </div>
                        <div className="text-xs opacity-80">
                          ว่าง: {slot.quota - slot.booked}/{slot.quota}
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    className="flex flex-col items-center justify-center py-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ color: '#4B5563' }}
                  >
                    <CalendarIcon className="h-6 w-6 mb-2" style={{ color: '#F9669D' }} />
                    <p className="text-sm font-medium">ไม่พบช่วงเวลาให้เลือกในวันนี้</p>
                  </motion.div>
                )
              ) : (
                <motion.div
                  className="flex flex-col items-center justify-center py-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ color: '#4B5563' }}
                >
                  <CalendarIcon className="h-6 w-6 mb-2" style={{ color: '#F9669D' }} />
                  <p className="text-sm font-medium">กรุณาเลือกวันที่ก่อน</p>
                </motion.div>
              )}
              {totalPages > 1 && (
                <motion.div
                  className="flex justify-center gap-3 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="bg-[#F9669D] text-white px-4 py-1.5 rounded-lg font-medium text-sm hover:bg-[#F9669D]/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:ring-2 focus:ring-[#F9669D]/50"
                    aria-label="ไปหน้าที่แล้ว"
                  >
                    ก่อนหน้า
                  </Button>
                  <span
                    className="text-sm font-medium self-center"
                    style={{ color: '#30266D' }}
                  >
                    หน้า {currentPage} / {totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="bg-[#F9669D] text-white px-4 py-1.5 rounded-lg font-medium text-sm hover:bg-[#F9669D]/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:ring-2 focus:ring-[#F9669D]/50"
                    aria-label="ไปหน้าถัดไป"
                  >
                    ถัดไป
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>

          <motion.div
            className="mt-4 flex flex-col sm:flex-row gap-3 sm:justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border border-[#F9669D] text-[#30266D] px-4 py-1.5 rounded-lg font-medium text-sm hover:bg-[#F9669D]/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:ring-2 focus:ring-[#F9669D]/50 bg-white/90"
              disabled={loading}
              aria-label="ยกเลิกการจอง"
            >
              ยกเลิก
            </Button>
            <Button
              disabled={loading || !date || !selectedSlot || !patient}
              onClick={handleBooking}
              className="bg-[#F9669D] text-white px-4 py-1.5 rounded-lg font-medium text-sm hover:bg-[#F9669D]/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:ring-2 focus:ring-[#F9669D]/50"
              aria-label="ยืนยันการจอง"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  ></motion.div>
                  กำลังจอง...
                </span>
              ) : (
                'ยืนยันการจอง'
              )}
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}