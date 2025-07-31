'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import th from 'date-fns/locale/th';
import { useRouter } from 'next/navigation';

const MySwal = withReactContent(Swal);

export function VaccineBookingDialog({ vaccine }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const router = useRouter();

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
      booked,
      useTimeSlots,
      cutoffMinutesBeforeSlot,
      serviceStartTime,
      serviceEndTime,
      vaccine_time_slots,
      vaccine_service_days,
      booking_setting,
    },
  } = vaccine;

  const slotDurationMinutes = booking_setting?.slotDurationMinutes ?? 30;

  const allowedDays = useMemo(() => {
    return (
      vaccine_service_days?.data
        ?.map((d) => d.attributes.day_of_week)
        .flat() || []
    );
  }, [vaccine_service_days]);

  useEffect(() => {
    async function fetchUserAndPatient() {
      try {
        const userRes = await axios.get(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`,
          { withCredentials: true }
        );
        const user = userRes.data;

        const patientRes = await axios.get(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients`,
          {
            params: { filters: { email: { $eq: user.email } } },
            withCredentials: true,
          }
        );
        const patientData = patientRes.data?.data?.[0];

        if (patientData) {
          setPatient({ id: patientData.id, ...patientData.attributes });
        } else {
          console.warn('ไม่พบข้อมูลผู้ป่วยจากอีเมล:', user.email);
          setPatient(null);
        }
      } catch (err) {
        console.error('ดึงข้อมูล user/patient ผิดพลาด:', err);
        setPatient(null);
      } finally {
        setPatientLoading(false);
      }
    }

    fetchUserAndPatient();
  }, []);

  function isEligible() {
    if (!patient) return false;
    const age = patient.age;
    const patientGender = patient.gender?.toLowerCase();
    const vaccineGender = (gender || '').toLowerCase();

    const allowedGenders = ['ทุกเพศ', 'any'];
    const genderMatch =
      allowedGenders.includes(vaccineGender) || patientGender === vaccineGender;

    const ageMatch = (!minAge || age >= minAge) && (!maxAge || age <= maxAge);
    return genderMatch && ageMatch;
  }

  function isDateAllowed(d) {
    const day = d.getDay();
    const checkDate = new Date(d);
    checkDate.setHours(0, 0, 0, 0);

    const start = bookingStartDate ? new Date(bookingStartDate) : null;
    const end = bookingEndDate ? new Date(bookingEndDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (checkDate < now) return false;
    if (start && checkDate < start) return false;
    if (end && checkDate > end) return false;
    if (allowedDays.length > 0 && !allowedDays.includes(day)) return false;

    return true;
  }

  
  function formatTimeHHMM(timeStr) {
    if (!timeStr) return '';
    // กรณีเวลาอาจมี format 00:00:00 หรือ 00:00
    return timeStr.length > 5 ? timeStr.slice(0, 5) : timeStr;
  }

  useEffect(() => {
    async function fetchBookingCounts() {
      if (!date) {
        setAvailableSlots([]);
        setSelectedSlot(null);
        return;
      }

      const now = dayjs();
      const selectedDate = dayjs(date).format('YYYY-MM-DD');

      if (useTimeSlots) {
        try {
          const res = await axios.get(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings`,
            {
              params: {
                filters: {
                  vaccine: vaccineId,
                  bookingDate: selectedDate,
                  status: 'confirmed',
                },
                populate: ['vaccine_time_slot'],
                pagination: { pageSize: 1000 },
              },
              withCredentials: true,
            }
          );

          const bookings = res.data.data;

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
              const cutoff = slotStart.subtract(cutoffMinutesBeforeSlot || 0, 'minute');
              const available =
                attr.is_enabled && bookedCount < attr.quota && now.isBefore(cutoff);

              return {
                id: slotId.toString(),
                start: formatTimeHHMM(attr.startTime),
                end: formatTimeHHMM(attr.endTime),
                quota: attr.quota,
                booked: bookedCount,
                available,
              };
            })
            .filter((slot) => slot.available);

          setAvailableSlots(slots);
          if (slots.length > 0) setSelectedSlot(slots[0].id);
          else setSelectedSlot(null);
        } catch (err) {
          console.error('Error fetching bookings:', err);
          setAvailableSlots([]);
          setSelectedSlot(null);
        }
      } else {
        const slots = [];
        let [sh, sm] = serviceStartTime.split(':').map(Number);
        let [eh, em] = serviceEndTime.split(':').map(Number);
        let startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        while (startMinutes + slotDurationMinutes <= endMinutes) {
          const h = Math.floor(startMinutes / 60);
          const m = startMinutes % 60;
          const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          const slotStart = dayjs(`${selectedDate}T${startTime}`);
          const cutoff = slotStart.subtract(cutoffMinutesBeforeSlot || 0, 'minute');
          if (now.isBefore(cutoff)) {
            slots.push({
              id: startTime,
              start: startTime,
              end: dayjs(slotStart).add(slotDurationMinutes, 'minute').format('HH:mm'),
              available: true,
            });
          }
          startMinutes += slotDurationMinutes;
        }

        setAvailableSlots(slots);
        if (slots.length > 0) setSelectedSlot(slots[0].id);
        else setSelectedSlot(null);
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
  ]);

  useEffect(() => {
    if (!open) {
      setDate(null);
      setAvailableSlots([]);
      setSelectedSlot(null);
      setLoading(false);
    }
  }, [open]);

  async function handleBooking() {
    if (loading) return;
    if (!patient || !selectedSlot || !date || !vaccineId) return;

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
    });

    if (!result.isConfirmed) {
      return;
    }

    if (!isEligible()) {
      await MySwal.fire({ icon: 'warning', title: 'คุณไม่มีสิทธิ์จองวัคซีนนี้' });
      return;
    }

    if (maxQuota && booked >= maxQuota) {
      await MySwal.fire({ icon: 'warning', title: 'วัคซีนเต็มแล้ว' });
      return;
    }

    const timeLabel = availableSlots.find((s) => s.id === selectedSlot);
    if (!timeLabel) {
      await MySwal.fire({ icon: 'error', title: 'เวลาที่เลือกไม่ถูกต้อง' });
      return;
    }

      const payload = {
      data: {
        vaccine: vaccineId,
        patient: patient.id,
        bookingDate: dayjs(date).format('YYYY-MM-DD'),
        status: 'confirmed',
        vaccine_time_slot: useTimeSlots ? Number(selectedSlot) : null,
        startTime: timeLabel.start,
        endTime: timeLabel.end,
      },
    };
     

    try {
      setLoading(true);
      await axios.post(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings`,
        payload,
        { withCredentials: true }
      );

      MySwal.fire({ icon: 'success', title: 'จองสำเร็จ', timer: 1500, showConfirmButton: false });

      router.push('/appointment?tab=active');
    } catch (err) {
      console.error('❌ Booking Error:', err);
      await MySwal.fire({
        icon: 'error',
        title: 'จองไม่สำเร็จ',
        html: `
          <p><strong>ข้อความ:</strong> ${err.message || 'ไม่ทราบสาเหตุ'}</p>
          <p><strong>รายละเอียด:</strong> ${JSON.stringify(err.response?.data || {}, null, 2)}</p>
        `,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-[#30266D] hover:bg-[#F9669D] text-white px-5 py-2 rounded-xl transition duration-200"
          disabled={patientLoading}
          onClick={(e) => {
            if (!patient) {
              e.preventDefault();
              MySwal.fire({ icon: 'warning', title: 'กรุณาเข้าสู่ระบบก่อนจอง' });
            }
          }}
        >
          จองวัคซีน
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95%] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white shadow-lg border border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#30266D]">จองวัคซีน: {name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-6 mt-4">
          {/* Calendar Section */}
          <div className="w-full lg:w-1/2">
            <label className="block font-semibold text-[#30266D] text-sm mb-2">เลือกวันที่</label>
            <div className="border border-[#F9669D] rounded-xl p-2">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => !isDateAllowed(d) || loading}
                fromDate={bookingStartDate ? new Date(bookingStartDate) : undefined}
                toDate={bookingEndDate ? new Date(bookingEndDate) : undefined}
                locale={th}
              />
            </div>
          </div>

          <div className="w-full">
            <label className="block font-semibold text-[#30266D] text-sm mb-2">เลือกเวลา</label>
            {date ? (
              availableSlots.length > 0 ? (
                <div
                  className="
                    grid gap-2
                    grid-cols-1
                    sm:grid-cols-1
                    md:grid-cols-2
                    lg:grid-cols-2
                    xl:grid-cols-2
                  "
                >
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot === slot.id;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`p-3 rounded-xl text-sm border font-medium text-center transition duration-150
                          ${isSelected
                            ? 'bg-[#30266D] text-white border-[#30266D]'
                            : 'bg-white text-[#30266D] border-[#F9669D] hover:bg-[#F9669D] hover:text-white'}
                        `}
                      >
                        <div>
                          {slot.start} - {slot.end} น.
                        </div>
                        {'quota' in slot && 'booked' in slot && (
                          <div className="text-xs mt-1 text-[#F9669D]">
                            ({slot.quota - slot.booked} คิวว่าง)
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">ไม่มีเวลาให้เลือกในวันนี้</p>
              )
            ) : (
              <p className="text-sm text-gray-500">กรุณาเลือกวันที่ก่อน</p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="border border-gray-300 text-[#30266D] hover:border-[#F9669D] hover:text-[#F9669D]"
              disabled={loading}
            >
              ยกเลิก
            </Button>
          </DialogClose>
          <Button
            disabled={loading || !selectedSlot || !date || !patient}
            onClick={handleBooking}
            className="bg-[#F9669D] hover:bg-[#30266D] text-white px-6 py-2 rounded-xl transition duration-200"
          >
            {loading ? 'กำลังจอง...' : 'ยืนยันการจอง'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}