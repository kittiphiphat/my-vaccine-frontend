'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
  faExclamationCircle,
  faBan,
  faUndo,
  faBars,
  faTableCells,
  faHourglassHalf,
  faBookMedical,
} from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrBefore';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';
import Swal from 'sweetalert2';
import { cn } from '@/lib/utils';

library.add(faCalendarDays, faChevronLeft, faChevronRight, faExclamationCircle, faBan, faUndo, faBars, faTableCells, faHourglassHalf, faBookMedical);

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.tz.setDefault('Asia/Bangkok');

// Animation Variants
const dialogVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};
const cardVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
const buttonVariants = {
  hover: { scale: 1.05, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', transition: { duration: 0.2 } },
  tap: { scale: 0.95 },
};

// Time and Date Utility Functions
function timeToMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isDateAllowed(date, bookingStartDate, bookingEndDate, allowedDays, today) {
  const day = date.day();
  const checkDate = date.startOf('day');
  const start = bookingStartDate ? dayjs(bookingStartDate).startOf('day') : null;
  const end = bookingEndDate ? dayjs(bookingEndDate).startOf('day') : null;

  if (checkDate.isBefore(today)) return true;
  if (start && checkDate.isBefore(start)) return true;
  if (end && checkDate.isAfter(end)) return true;
  if (allowedDays.length > 0 && !allowedDays.includes(day)) return true;

  return false;
}


const HospitalCalendar = ({ selected, onSelect, vaccine, bookings, month, setMonth }) => {
  const [viewMode, setViewMode] = useState('month');

  const daysInMonth = (date) => (date.isValid() ? date.daysInMonth() : 0);
  const firstDayOfMonth = (date) => (date.isValid() ? date.startOf('month').day() : 0);
  const startOfWeek = (date) => date.startOf('week');
  const endOfWeek = (date) => date.endOf('week');

  const allowedDays = useMemo(() => {
    if (!vaccine?.attributes?.vaccine_service_days?.data) return [];
    return vaccine.attributes.vaccine_service_days.data
      .map((d) => {
        const dayData = d.attributes?.day_of_week;
        if (typeof dayData === 'string') {
          return dayData.split(',').map(Number).filter((day) => !isNaN(day) && day >= 0 && day <= 6);
        }
        return dayData || [];
      })
      .flat()
      .filter((day) => !isNaN(day) && day >= 0 && day <= 6);
  }, [vaccine?.attributes?.vaccine_service_days]);

  const disabledDays = useMemo(() => {
    const today = dayjs().tz('Asia/Bangkok').startOf('day');
    const currentMonth = dayjs().tz('Asia/Bangkok').startOf('month');
    return (date) => {
      const checkDate = dayjs(date).startOf('day');
      const isNotCurrentMonth = !checkDate.isSame(currentMonth, 'month');
      const start = vaccine?.attributes?.bookingStartDate ? dayjs(vaccine.attributes.bookingStartDate).startOf('day') : null;
      const end = vaccine?.attributes?.bookingEndDate ? dayjs(vaccine.attributes.bookingEndDate).startOf('day') : null;

      if (isNotCurrentMonth) return true;
      if (checkDate.isBefore(today)) return true;
      if (start && checkDate.isBefore(start)) return true;
      if (end && checkDate.isAfter(end)) return true;
      if (allowedDays.length > 0 && !allowedDays.includes(checkDate.day())) return true;

      return false;
    };
  }, [vaccine?.attributes?.bookingStartDate, vaccine?.attributes?.bookingEndDate, allowedDays]);

  const handlePrevMonth = () => {
    const currentMonth = dayjs().tz('Asia/Bangkok').startOf('month');
    setMonth(currentMonth.toDate());
  };

  const handleNextMonth = () => {
    const currentMonth = dayjs().tz('Asia/Bangkok').startOf('month');
    setMonth(currentMonth.toDate());
  };

  const handleDateClick = (day) => {
    const newDate = dayjs(month).tz('Asia/Bangkok').date(day);
    if (!disabledDays(newDate.toDate())) {
      onSelect(newDate.toDate());
    }
  };

  const resetSelection = () => {
    onSelect(null);
  };

  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const weekdayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const days = Array.from({ length: daysInMonth(dayjs(month)) }, (_, i) => i + 1);
  const startDay = firstDayOfMonth(dayjs(month));
  const weekDays = Array.from({ length: 7 }, (_, i) => startOfWeek(dayjs(month)).add(i, 'day'));

  const getBookingCount = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    return bookings.filter((b) => b.attributes?.bookingDate === dateStr && b.attributes?.booking_status === 'confirmed').length;
  };

  if (!vaccine?.attributes) {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center h-20 bg-[var(--card)] rounded-lg p-3 shadow-sm border-[var(--border)]"
      >
        <FontAwesomeIcon icon={faExclamationCircle} className="h-5 w-5 text-[var(--destructive)] mb-2" />
        <p className="text-xs font-medium text-[var(--muted-foreground)] text-center">ไม่สามารถโหลดข้อมูลปฏิทินได้</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex flex-col gap-2 bg-[var(--card)] p-3 sm:p-4 rounded-lg shadow-sm border-[var(--border)]">
        <div className="flex flex-col lg:flex-row lg:items-start gap-2">
          <h3 className="text-sm sm:text-base font-semibold text-[var(--foreground)] flex items-center gap-1.5 mb-2 lg:mb-0">
            <FontAwesomeIcon icon={faCalendarDays} className="h-4 w-4 text-[var(--primary)]" />
            เลือกวันที่
          </h3>
          <div className="flex flex-col lg:flex-row items-center gap-1.5 w-full lg:w-auto">
            <div className="flex gap-1.5 w-full lg:w-auto">
              <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  onClick={() => setViewMode('month')}
                  className="text-xs px-2 sm:px-3 py-1.5 rounded-lg bg-[var(--card)] border-[var(--border)] hover:bg-[var(--secondary-light)] text-[var(--primary)] transition-all duration-150 shadow-sm flex-1 lg:flex-none"
                  aria-label="แสดงมุมมองเดือน"
                >
                  <FontAwesomeIcon icon={faTableCells} className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">เดือน</span>
                </Button>
              </motion.div>
              <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  onClick={() => setViewMode('week')}
                  className="text-xs px-2 sm:px-3 py-1.5 rounded-lg bg-[var(--card)] border-[var(--border)] hover:bg-[var(--secondary-light)] text-[var(--primary)] transition-all duration-150 shadow-sm flex-1 lg:flex-none"
                  aria-label="แสดงมุมมองสัปดาห์"
                >
                  <FontAwesomeIcon icon={faBars} className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">สัปดาห์</span>
                </Button>
              </motion.div>
              <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                <Button
                  variant="outline"
                  onClick={resetSelection}
                  className="text-xs px-2 sm:px-3 py-1.5 rounded-lg bg-[var(--card)] border-[var(--border)] hover:bg-[var(--secondary-light)] text-[var(--primary)] transition-all duration-150 shadow-sm flex-1 lg:flex-none"
                  aria-label="รีเซ็ตการเลือก"
                >
                  <FontAwesomeIcon icon={faUndo} className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">รีเซ็ต</span>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <motion.button
            onClick={handlePrevMonth}
            disabled={true}
            className="h-8 w-8 rounded-full bg-[var(--card)] text-[var(--primary)] hover:bg-[var(--secondary-light)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--primary)] shadow-sm flex items-center justify-center"
            aria-label="Previous month"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
          </motion.button>
          <span className="text-sm sm:text-base font-medium text-[var(--foreground)]">
            {viewMode === 'month'
              ? `${monthNames[dayjs(month).month()]} ${dayjs(month).add(543, 'year').year()}`
              : `${startOfWeek(dayjs(month)).format('D MMM')} - ${endOfWeek(dayjs(month)).format('D MMM BBBB')}`}
          </span>
          <motion.button
            onClick={handleNextMonth}
            disabled={true}
            className="h-8 w-8 rounded-full bg-[var(--card)] text-[var(--primary)] hover:bg-[var(--secondary-light)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--primary)] shadow-sm flex items-center justify-center"
            aria-label="Next month"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
          </motion.button>
        </div>
      </div>
      {viewMode === 'month' ? (
        <div
          className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs font-medium text-[var(--muted-foreground)] bg-[var(--card)] rounded-lg p-3 sm:p-4 shadow-sm border-[var(--border)]"
          role="grid"
          aria-label="ปฏิทินเดือน"
        >
          {weekdayNames.map((day, index) => (
            <div
              key={index}
              className="p-1.5 bg-[var(--secondary)] rounded-lg shadow-sm"
            >
              {day}
            </div>
          ))}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${dayjs(month).format('YYYY-MM')}-${i}`} className="h-8 sm:h-9 w-full"></div>
          ))}
          {days.map((day) => {
            const date = dayjs(month).tz('Asia/Bangkok').date(day);
            const isSelected = selected && dayjs(selected).isSame(date, 'day');
            const isToday = date.isSame(dayjs().tz('Asia/Bangkok'), 'day');
            const isDisabled = disabledDays(date.toDate());
            const bookingCount = getBookingCount(date);

            return (
              <motion.div
                key={`${dayjs(month).format('YYYY-MM')}-${day}`}
                className="relative"
                variants={buttonVariants}
                whileHover={{ scale: isDisabled ? 1 : 1.05 }}
                whileTap={{ scale: isDisabled ? 1 : 0.95 }}
              >
                <motion.button
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    'h-8 sm:h-9 w-full rounded-lg font-semibold flex items-center justify-center transition-all duration-150 relative focus:ring-2 focus:ring-[var(--primary)] shadow-sm text-xs',
                    isSelected
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] border border-[var(--primary)]'
                      : isToday
                      ? 'bg-[var(--secondary-light)] text-[var(--primary)] border border-[var(--primary)]'
                      : isDisabled
                      ? 'text-[var(--muted-foreground)] bg-[var(--secondary)] cursor-not-allowed'
                      : bookingCount > 0
                      ? 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                      : 'bg-[var(--card)] hover:bg-[var(--secondary-light)] border'
                  )}
                  disabled={isDisabled}
                  aria-label={`วันที่ ${day}, ${bookingCount > 0 ? `${bookingCount} การจอง` : 'ไม่มีจอง'}`}
                  aria-selected={isSelected}
                  role="gridcell"
                >
                  {day}
                  {bookingCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 text-[10px] bg-green-500 text-white rounded-full px-1 py-0.5 shadow-sm">
                      {bookingCount}
                    </Badge>
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-2 bg-[var(--card)] rounded-lg p-3 sm:p-4 shadow-sm border-[var(--border)]"
          role="grid"
          aria-label="ปฏิทินสัปดาห์"
        >
          {weekDays.map((date, index) => {
            const isSelected = selected && dayjs(selected).isSame(date, 'day');
            const isToday = date.isSame(dayjs().tz('Asia/Bangkok'), 'day');
            const isDisabled = disabledDays(date.toDate());
            const bookingCount = getBookingCount(date);

            return (
              <motion.div
                key={`${date.format('YYYY-MM-DD')}-${index}`}
                className="relative"
                variants={buttonVariants}
                whileHover={{ scale: isDisabled ? 1 : 1.03 }}
                whileTap={{ scale: isDisabled ? 1 : 0.97 }}
              >
                <motion.button
                  onClick={() => handleDateClick(date.date())}
                  className={cn(
                    'w-full h-10 sm:h-12 rounded-lg font-semibold flex items-center justify-between px-2 py-1.5 transition-all duration-150 focus:ring-2 focus:ring-[var(--primary)] shadow-sm text-xs sm:text-sm',
                    isSelected
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] border border-[var(--primary)]'
                      : isToday
                      ? 'bg-[var(--secondary-light)] text-[var(--primary)] border border-[var(--primary)]'
                      : isDisabled
                      ? 'text-[var(--muted-foreground)] bg-[var(--secondary)] cursor-not-allowed'
                      : bookingCount > 0
                      ? 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                      : 'bg-[var(--card)] hover:bg-[var(--secondary-light)] border'
                  )}
                  disabled={isDisabled}
                  aria-label={`วันที่ ${date.format('D MMM BBBB')}, ${bookingCount > 0 ? `${bookingCount} การจอง` : 'ไม่มีจอง'}`}
                  aria-selected={isSelected}
                  role="gridcell"
                >
                  <span className="truncate">{date.format('D MMM BBBB')}</span>
                  {bookingCount > 0 && (
                    <Badge className="text-[10px] bg-green-500 text-white rounded-full px-1 py-0.5 shadow-sm">
                      {bookingCount}
                    </Badge>
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};


export function VaccineBooking({ vaccine }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [month, setMonth] = useState(dayjs().tz('Asia/Bangkok').toDate());
  const [hasRedirected, setHasRedirected] = useState(false);
  const [period, setPeriod] = useState('morning');
  const [bookings, setBookings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const slotsPerPage = 6;

  const slotDurationMinutes = vaccine?.attributes?.booking_settings?.data?.[0]?.attributes?.slotDurationMinutes || 30;
  const effectiveMaxQuota = vaccine?.attributes?.maxQuota ?? 100;
  const isVaccineValid = vaccine && vaccine.attributes && (vaccine.attributes.title || vaccine.attributes.name);

  useEffect(() => {
    setHasRedirected(false);
    if (!vaccine || !isVaccineValid) {
      console.warn('VaccineBooking: Invalid or no vaccine prop provided');
    }
  }, [vaccine]);

  const fetchUserAndPatient = useCallback(async () => {
    try {
      setPatientLoading(true);
      const jwt = sessionStorage.getItem('jwt');
      if (!jwt) {
        sessionStorage.clear();
        window.dispatchEvent(new Event('session-updated'));
        router.replace('/login', { scroll: false });
        return;
      }

      const userRes = await axios.get(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`,
        {
          headers: { Authorization: `Bearer ${jwt}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
          timeout: 5000,
        }
      );

      const userData = userRes.data;
      const parsedUserId = userData.id;
      if (!parsedUserId || isNaN(parsedUserId) || parsedUserId <= 0) {
        throw new Error(`Invalid userId: ${parsedUserId}`);
      }

      const role = userData.role?.name?.toLowerCase();
      if (!['patient', 'authenticated'].includes(role)) {
        throw new Error(`Role must be patient (found: ${role || 'no role'})`);
      }

      sessionStorage.setItem('userRole', role);
      sessionStorage.setItem('username', userData.username || 'ผู้ใช้');
      sessionStorage.setItem('userId', parsedUserId.toString());

      const patientRes = await axios.get(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients?filters[user][id][$eq]=${parsedUserId}&populate=user`,
        {
          headers: { Authorization: `Bearer ${jwt}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
          timeout: 5000,
        }
      );

      const patientList = patientRes.data.data || patientRes.data;
      if (!Array.isArray(patientList) || patientList.length === 0) {
        setPatient(null);
        sessionStorage.removeItem('patientId');
        Swal.fire({
          title: 'ไม่พบข้อมูลผู้ป่วย',
          text: 'กรุณากรอกข้อมูลผู้ป่วยก่อนจอง',
          icon: 'warning',
          confirmButtonText: 'ไปที่หน้าโปรไฟล์',
          allowOutsideClick: false,
          allowEscapeKey: false,
          customClass: {
            popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
            title: 'text-sm font-semibold',
            content: 'text-xs text-[var(--muted-foreground)]',
            confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] px-3 py-1.5 rounded-lg font-medium text-xs hover:from-[var(--primary-foreground)] hover:to-[var(--primary)] shadow-sm',
          },
        }).then((result) => {
          if (result.isConfirmed) router.push('/patient', { scroll: false });
        });
        return;
      }

      let patient = patientList[0];
      if (!patient.attributes) {
        patient = {
          id: patient.id,
          attributes: {
            first_name: patient.first_name || '',
            last_name: patient.last_name || '',
            birth_date: patient.birth_date || null,
            phone: patient.phone || '',
            address: patient.address || '',
            gender: patient.gender || '',
            email: patient.email || '',
            status: patient.status || 'confirmed',
            createdAt: patient.createdAt || new Date().toISOString(),
            updatedAt: patient.updatedAt || new Date().toISOString(),
            user: patient.user || { id: parsedUserId },
          },
        };
      }

      const patientUserId = patient.attributes?.user?.id || patient.attributes?.user?.data?.id;
      if (!patientUserId || patientUserId !== parsedUserId) {
        throw new Error(`Patient user ID (${patientUserId}) does not match session userId (${parsedUserId})`);
      }

      const requiredFields = ['first_name', 'last_name', 'birth_date', 'gender'];
      const missingFields = requiredFields.filter((field) => !patient.attributes[field]);
      if (missingFields.length > 0) {
        setPatient(null);
        sessionStorage.removeItem('patientId');
        Swal.fire({
          title: 'ข้อมูลผู้ป่วยไม่ครบถ้วน',
          text: `กรุณากรอก ${missingFields.join(', ')} ในหน้าโปรไฟล์`,
          icon: 'warning',
          confirmButtonText: 'ไปที่หน้าโปรไฟล์',
          allowOutsideClick: false,
          allowEscapeKey: false,
          customClass: {
            popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
            title: 'text-sm font-semibold',
            content: 'text-xs text-[var(--muted-foreground)]',
            confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] px-3 py-1.5 rounded-lg font-medium text-xs hover:from-[var(--primary-foreground)] hover:to-[var(--primary)] shadow-sm',
          },
        }).then((result) => {
          if (result.isConfirmed) router.push('/patient', { scroll: false });
        });
        return;
      }

      if (patient.attributes.status !== 'confirmed') {
        setPatient(null);
        sessionStorage.removeItem('patientId');
        Swal.fire({
          title: 'ต้องกรอกข้อมูลผู้ป่วย',
          text: 'กรุณากรอกข้อมูลผู้ป่วยก่อนจอง',
          icon: 'warning',
          confirmButtonText: 'ไปที่หน้ากรอกข้อมูลผู้ป่วย',
          allowOutsideClick: false,
          allowEscapeKey: false,
          customClass: {
            popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
            title: 'text-sm font-semibold',
            content: 'text-xs text-[var(--muted-foreground)]',
            confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] px-3 py-1.5 rounded-lg font-medium text-xs hover:from-[var(--primary-foreground)] hover:to-[var(--primary)] shadow-sm',
          },
        }).then((result) => {
          if (result.isConfirmed) router.push('/patient', { scroll: false });
        });
        return;
      }

      setPatient({ id: patient.id, ...patient.attributes });
      sessionStorage.setItem('patientId', patient.id.toString());
    } catch (error) {
      console.error('Error during patient data check:', error);
      let errorMessage = 'ไม่สามารถตรวจสอบข้อมูลผู้ใช้ได้';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error?.message || error.message;
        if (error.response?.status === 401) {
          sessionStorage.clear();
          window.dispatchEvent(new Event('session-updated'));
          Swal.fire({
            title: 'ต้องเข้าสู่ระบบใหม่',
            text: 'เซสชันหมดอายุ กรุณาลองอีกครั้ง',
            icon: 'error',
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
              popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
              title: 'text-sm font-semibold',
              content: 'text-xs text-[var(--muted-foreground)]',
            },
          }).then(() => router.replace('/login', { scroll: false }));
          return;
        }
      }
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: errorMessage,
        icon: 'error',
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
          popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
          title: 'text-sm font-semibold',
          content: 'text-xs text-[var(--muted-foreground)]',
        },
      });
      setPatient(null);
      sessionStorage.removeItem('patientId');
    } finally {
      setPatientLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUserAndPatient();
  }, [fetchUserAndPatient]);

  useEffect(() => {
    async function fetchBookings() {
      if (!isVaccineValid) return;
      try {
        const jwt = sessionStorage.getItem('jwt');
        if (!jwt) return;

        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?filters[vaccine]=${vaccine.id}&filters[booking_status]=confirmed&populate[vaccine]=*&populate[patient]=*`,
          {
            headers: { Authorization: `Bearer ${jwt}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
            timeout: 5000,
          }
        );

        const bookingData = res.data.data || [];
        const normalizedBookings = bookingData.map((app) => ({
          id: app.id,
          attributes: {
            bookingDate: app.attributes?.bookingDate,
            startTime: app.attributes?.startTime,
            endTime: app.attributes?.endTime,
            booking_status: app.attributes?.booking_status || 'confirmed',
            vaccine: app.attributes?.vaccine || null,
            patient: app.attributes?.patient || null,
          },
        }));
        setBookings(normalizedBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      }
    }
    if (isVaccineValid) {
      fetchBookings();
    }
  }, [vaccine, isVaccineValid]);

  function calculateAge(birthDate) {
    if (!birthDate) return 0;
    return dayjs().tz('Asia/Bangkok').diff(dayjs(birthDate), 'year');
  }

  function isEligible() {
    if (!patient || !isVaccineValid) return false;
    const age = calculateAge(patient.birth_date);
    const patientGender = patient.gender?.toLowerCase();
    const vaccineGender = (vaccine.attributes.gender || '').toLowerCase();
    const allowedGenders = ['ทุกเพศ', 'any'];
    const genderMatch = allowedGenders.includes(vaccineGender) || patientGender === vaccineGender;
    const ageMatch =
      (!vaccine.attributes.minAge || age >= vaccine.attributes.minAge) &&
      (!vaccine.attributes.maxAge || age <= vaccine.attributes.maxAge);
    return genderMatch && ageMatch;
  }

  function formatTimeHHMM(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 'ไม่ระบุ';
    return timeStr.length > 5 ? timeStr.slice(0, 5) : timeStr;
  }

  function generateTimeSlots(startTime, endTime, durationMinutes, selectedDate) {
    const slots = [];
    let [sh, sm] = startTime && /^\d{2}:\d{2}$/.test(startTime) ? startTime.split(':').map(Number) : [8, 0];
    let [eh, em] = endTime && /^\d{2}:\d{2}$/.test(endTime) ? endTime.split(':').map(Number) : [17, 0];
    let startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const lunchStart = 12 * 60;
    const lunchEnd = 13 * 60;
    const isToday = selectedDate && dayjs(selectedDate).isSame(dayjs().tz('Asia/Bangkok'), 'day');
    const now = dayjs().tz('Asia/Bangkok');
    const cutoff = vaccine?.attributes?.cutoffMinutesBeforeSlot || 0;

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
      const period = startMinutes < lunchStart ? 'morning' : 'afternoon';

      if (available) {
        slots.push({
          id: startTimeStr,
          start: startTimeStr,
          end: endTime,
          available: true,
          period,
        });
      }
      startMinutes += durationMinutes;
    }

    return slots;
  }

  useEffect(() => {
    async function fetchBookingCounts() {
      if (!date || !isVaccineValid) {
        setAvailableSlots([]);
        setSelectedSlot(null);
        setCurrentPage(1);
        return;
      }

      setLoading(true);
      try {
        const jwt = sessionStorage.getItem('jwt');
        if (!jwt) throw new Error('Unauthorized: No JWT found');

        const selectedDate = dayjs(date).format('YYYY-MM-DD');
        const isToday = dayjs(selectedDate).isSame(dayjs().tz('Asia/Bangkok'), 'day');
        const now = dayjs().tz('Asia/Bangkok');
        const cutoff = vaccine.attributes.cutoffMinutesBeforeSlot || 0;

        if (vaccine.attributes.useTimeSlots) {
          const res = await axios.get(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?filters[vaccine]=${vaccine.id}&filters[bookingDate]=${selectedDate}&filters[booking_status]=confirmed&populate[vaccine_time_slot]=*&pagination[pageSize]=1000`,
            {
              headers: { Authorization: `Bearer ${jwt}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
              timeout: 5000,
            }
          );

          const bookings = res.data.data || [];
          const slotBookingCountMap = {};
          bookings.forEach((b) => {
            const slotId = b.attributes.vaccine_time_slot?.data?.id;
            if (!slotId) return;
            slotBookingCountMap[slotId] = (slotBookingCountMap[slotId] || 0) + 1;
          });

          const slots = (vaccine.attributes.vaccine_time_slots?.data || [])
            .map((slot) => {
              const attr = slot.attributes;
              const slotId = slot.id;
              const bookedCount = slotBookingCountMap[slotId] || 0;
              const slotStart = dayjs(`${selectedDate}T${attr.startTime}`);
              const available = attr.is_enabled && bookedCount < attr.quota && (!isToday || (isToday && now.isBefore(slotStart.subtract(cutoff, 'minute'))));
              const period = timeToMinutes(attr.startTime) < 12 * 60 ? 'morning' : 'afternoon';

              return {
                id: slotId.toString(),
                start: formatTimeHHMM(attr.startTime),
                end: formatTimeHHMM(attr.endTime),
                quota: attr.quota,
                booked: bookedCount,
                available,
                period,
              };
            })
            .filter((slot) => slot.available && slot.quota - slot.booked > 0 && (period === 'all' || slot.period === period))
            .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

          setAvailableSlots(slots);
          const firstAvailableSlot = slots.find((slot) => slot.quota - slot.booked > 0);
          setSelectedSlot(firstAvailableSlot ? firstAvailableSlot.id : null);
        } else {
          const res = await axios.get(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?filters[vaccine]=${vaccine.id}&filters[bookingDate]=${selectedDate}&filters[booking_status]=confirmed&pagination[pageSize]=1000`,
            {
              headers: { Authorization: `Bearer ${jwt}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
              timeout: 5000,
            }
          );

          const bookings = res.data.data || [];
          const bookedCount = bookings.length;

          if (bookedCount >= effectiveMaxQuota) {
            Swal.fire({
              title: 'โควตาเต็ม',
              text: 'ไม่มีที่นั่งว่างสำหรับวันนี้',
              icon: 'warning',
              timer: 1500,
              timerProgressBar: true,
              showConfirmButton: false,
              allowOutsideClick: false,
              allowEscapeKey: false,
              customClass: {
                popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
                title: 'text-sm font-semibold',
                content: 'text-xs text-[var(--muted-foreground)]',
              },
            });
            setAvailableSlots([]);
            setSelectedSlot(null);
            setLoading(false);
            return;
          }

          const allPossibleSlots = generateTimeSlots(vaccine.attributes.serviceStartTime, vaccine.attributes.serviceEndTime, slotDurationMinutes, date);
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
            .filter((slot) => slot.available && slot.quota - slot.booked > 0 && (period === 'all' || slot.period === period))
            .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

          setAvailableSlots(slots);
          const firstAvailableSlot = slots.find((slot) => slot.quota - slot.booked > 0);
          setSelectedSlot(firstAvailableSlot ? firstAvailableSlot.id : null);
        }
      } catch (error) {
        console.error('Error fetching booking counts:', error);
        let errorMessage = 'ไม่สามารถโหลดข้อมูลการจองได้';
        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.error?.message || error.message;
          if (error.response?.status === 401) {
            sessionStorage.clear();
            window.dispatchEvent(new Event('session-updated'));
            Swal.fire({
              title: 'ต้องเข้าสู่ระบบใหม่',
              text: 'เซสชันหมดอายุ กรุณาลองอีกครั้ง',
              icon: 'error',
              timer: 1500,
              timerProgressBar: true,
              showConfirmButton: false,
              allowOutsideClick: false,
              allowEscapeKey: false,
              customClass: {
                popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
                title: 'text-sm font-semibold',
                content: 'text-xs text-[var(--muted-foreground)]',
              },
            }).then(() => router.replace('/login', { scroll: false }));
            return;
          }
        }
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: errorMessage,
          icon: 'error',
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
          customClass: {
            popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
            title: 'text-sm font-semibold',
            content: 'text-xs text-[var(--muted-foreground)]',
          },
        });
        setAvailableSlots([]);
        setSelectedSlot(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBookingCounts();
  }, [date, vaccine, effectiveMaxQuota, slotDurationMinutes, router, period, isVaccineValid]);

  useEffect(() => {
    if (!open) {
      setDate(null);
      setAvailableSlots([]);
      setSelectedSlot(null);
      setLoading(false);
      setMonth(dayjs().tz('Asia/Bangkok').toDate());
      setPeriod('morning');
      setCurrentPage(1);
    }
  }, [open]);

  async function handleBooking() {
    if (loading || !patient || !date || !selectedSlot || !isVaccineValid) {
      Swal.fire({
        title: 'ข้อมูลไม่ครบ',
        text: isVaccineValid ? 'กรุณาเลือกวันที่และเวลาก่อน' : 'ข้อมูลวัคซีนไม่สมบูรณ์ กรุณาเลือกวัคซีนใหม่',
        icon: 'error',
        confirmButtonText: 'ตกลง',
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
          popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
          title: 'text-sm font-semibold',
          content: 'text-xs text-[var(--muted-foreground)]',
          confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] px-3 py-1.5 rounded-lg font-medium text-xs hover:from-[var(--primary-foreground)] hover:to-[var(--primary)] shadow-sm',
        },
      }).then((result) => {
        if (result.isConfirmed && !isVaccineValid && !hasRedirected) {
          setHasRedirected(true);
          router.push('/vaccines', { scroll: false });
        }
      });
      return;
    }

    setOpen(false);
    await new Promise((r) => setTimeout(r, 300));

    const selectedTimeSlot = availableSlots.find((s) => s.id === selectedSlot);
    Swal.fire({
      title: 'ยืนยันการจอง?',
      text: `จองวัคซีน ${vaccine.attributes.title || vaccine.attributes.name} วันที่ ${dayjs(date).format('D MMM BBBB')} เวลา ${selectedTimeSlot?.start || 'ไม่ระบุ'} (${selectedTimeSlot?.quota - selectedTimeSlot?.booked || 0} ที่นั่งว่าง)`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
        title: 'text-sm font-semibold',
        content: 'text-xs text-[var(--muted-foreground)]',
        confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] px-3 py-1.5 rounded-lg font-medium text-xs hover:from-[var(--primary-foreground)] hover:to-[var(--primary)] shadow-sm',
        cancelButton: 'bg-[var(--card)] text-[var(--primary)] px-3 py-1.5 rounded-lg font-medium text-xs hover:bg-[var(--secondary-light)] border shadow-sm',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        confirmBooking();
      }
    });

    async function confirmBooking() {
      if (!isEligible()) {
        Swal.fire({
          title: 'คุณสมบัติไม่ตรง',
          text: 'อายุหรือเพศไม่ตรงกับเงื่อนไขของวัคซีน',
          icon: 'warning',
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
          customClass: {
            popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
            title: 'text-sm font-semibold',
            content: 'text-xs text-[var(--muted-foreground)]',
          },
        });
        return;
      }

      try {
        const jwt = sessionStorage.getItem('jwt');
        if (!jwt) throw new Error('Unauthorized: No JWT found');

        const selectedDate = dayjs(date).format('YYYY-MM-DD');
        const timeLabel = availableSlots.find((s) => s.id === selectedSlot);
        if (!timeLabel) {
          console.warn('No valid time slot selected for booking');
          return;
        }

        if (!vaccine.id || !patient.id || !selectedDate || !timeLabel.start || !timeLabel.end) {
          console.warn('Invalid booking data:', {
            vaccineId: vaccine.id,
            patientId: patient.id,
            selectedDate,
            startTime: timeLabel.start,
            endTime: timeLabel.end,
          });
          return;
        }

        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?filters[vaccine]=${vaccine.id}&filters[bookingDate]=${selectedDate}&filters[booking_status]=confirmed&pagination[pageSize]=1000`,
          {
            headers: { Authorization: `Bearer ${jwt}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
            timeout: 5000,
          }
        );

        const bookings = res.data.data || [];
        const bookedCount = bookings.length;

        if (bookedCount >= effectiveMaxQuota) {
          Swal.fire({
            title: 'โควตาเต็ม',
            text: 'ไม่มีที่นั่งว่างสำหรับวันนี้',
            icon: 'warning',
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
              popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
              title: 'text-sm font-semibold',
              content: 'text-xs text-[var(--muted-foreground)]',
            },
          });
          return;
        }

        const slotBookings = bookings.filter((b) => b.attributes.startTime === timeLabel.start).length;
        if (slotBookings >= timeLabel.quota) {
          Swal.fire({
            title: 'ช่วงเวลาเต็ม',
            text: 'กรุณาเลือกเวลาอื่น',
            icon: 'warning',
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
              popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
              title: 'text-sm font-semibold',
              content: 'text-xs text-[var(--muted-foreground)]',
            },
          });
          return;
        }

        const payload = {
          data: {
            vaccine: Number(vaccine.id),
            patient: Number(patient.id),
            bookingDate: selectedDate,
            booking_status: 'confirmed',
            vaccine_time_slot: vaccine.attributes.useTimeSlots ? Number(selectedSlot) : null,
            startTime: timeLabel.start,
            endTime: timeLabel.end,
          },
        };

        const bookingRes = await axios.post(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings`,
          payload,
          {
            headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
            timeout: 5000,
          }
        );

        Swal.fire({
          title: 'จองสำเร็จ',
          text: 'กำลังพาคุณไปหน้าวัคซีน',
          icon: 'success',
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
          customClass: {
            popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
            title: 'text-sm font-semibold',
            content: 'text-xs text-[var(--muted-foreground)]',
          },
        }).then(() => {
          router.push(`/appointment?tab=active`, { scroll: false });
        });
      } catch (error) {
        console.warn('Error during booking:', error.response?.data?.error?.message || error.message, error);
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.error?.message || error.message;
          if (error.response?.status === 401) {
            sessionStorage.clear();
            window.dispatchEvent(new Event('session-updated'));
            Swal.fire({
              title: 'ต้องเข้าสู่ระบบใหม่',
              text: 'เซสชันหมดอายุ กรุณาลองอีกครั้ง',
              icon: 'error',
              timer: 1500,
              timerProgressBar: true,
              showConfirmButton: false,
              allowOutsideClick: false,
              allowEscapeKey: false,
              customClass: {
                popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
                title: 'text-sm font-semibold',
                content: 'text-xs text-[var(--muted-foreground)]',
              },
            }).then(() => router.replace('/login', { scroll: false }));
            return;
          }
          if (error.response?.status === 400 && errorMessage.includes('ผู้ป่วยนี้มีการจองวัคซีน')) {
            const existingBookingId = error.response?.data?.error?.details?.existingBookingIds?.[0];
            Swal.fire({
              title: 'การจองซ้ำ',
              text: `${errorMessage} กรุณายกเลิกการจองเดิมก่อน`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'ไปที่ใบนัดเดิม',
              cancelButtonText: 'ยกเลิก',
              allowOutsideClick: false,
              allowEscapeKey: false,
              customClass: {
                popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
                title: 'text-sm font-semibold',
                content: 'text-xs text-[var(--muted-foreground)]',
                confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] px-3 py-1.5 rounded-lg font-medium text-xs hover:from-[var(--primary-foreground)] hover:to-[var(--primary)] shadow-sm',
                cancelButton: 'bg-[var(--card)] text-[var(--primary)] px-3 py-1.5 rounded-lg font-medium text-xs hover:bg-[var(--secondary-light)] border shadow-sm',
              },
            }).then((result) => {
              if (result.isConfirmed && existingBookingId) {
                router.push(`/appointment/${existingBookingId}`, { scroll: false });
              }
            });
            return;
          }
        }
      } finally {
        setLoading(false);
      }
    }
  }

  const vaccineName = vaccine?.attributes?.title || vaccine?.attributes?.name || 'ไม่ระบุ';

  if (!isVaccineValid) {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center p-4 bg-[var(--card)] rounded-lg shadow-md border-[var(--border)] max-w-[90vw] mx-auto"
      >
        <FontAwesomeIcon icon={faExclamationCircle} className="h-5 w-5 text-[var(--destructive)] mb-2" />
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1 text-center">
          {vaccine ? 'ข้อมูลวัคซีนไม่สมบูรณ์' : 'ไม่มีข้อมูลวัคซีน'}
        </h2>
        <p className="text-xs text-[var(--muted-foreground)] mb-3 text-center">
          {vaccine ? 'ไม่สามารถแสดงชื่อวัคซีนได้ กรุณาเลือกวัคซีนใหม่' : 'กรุณาเลือกวัคซีนจากหน้าก่อนหน้า'}
        </p>
        <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Button
            onClick={() => {
              if (!hasRedirected) {
                setHasRedirected(true);
                router.push('/vaccines', { scroll: false });
              }
            }}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] px-3 py-1.5 rounded-lg font-medium text-xs shadow-sm hover:from-[var(--primary-foreground)] hover:to-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] transition-all duration-150"
            aria-label="กลับไปเลือกวัคซีน"
          >
            กลับไปเลือกวัคซีน
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-[95vw] mx-auto px-2 py-4 sm:py-6">
      <motion.div
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        className="flex justify-center"
      >
        <Button
          className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium text-sm sm:text-base"
          disabled={patientLoading}
          onClick={async (e) => {
            if (!patient) {
              e.preventDefault();
              Swal.fire({
                title: 'ไม่พบข้อมูลผู้ป่วย',
                text: 'กรุณากรอกข้อมูลผู้ป่วยก่อนจอง',
                icon: 'warning',
                confirmButtonText: 'ไปที่หน้าโปรไฟล์',
                allowOutsideClick: false,
                allowEscapeKey: false,
                customClass: {
                  popup: 'rounded-lg shadow-md border bg-[var(--card)] text-[var(--foreground)] max-w-[90vw] p-4',
                  title: 'text-sm font-semibold',
                  content: 'text-xs text-[var(--muted-foreground)]',
                  confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] px-3 py-1.5 rounded-lg font-medium text-xs hover:from-[var(--primary-foreground)] hover:to-[var(--primary)] shadow-sm',
                },
              }).then((result) => {
                if (result.isConfirmed) router.push('/patient', { scroll: false });
              });
            } else {
              setOpen(true);
            }
          }}
          aria-label="จองวัคซีน"
        >
          <FontAwesomeIcon icon={faBookMedical} className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">จองวัคซีน</span>
          <span className="sm:hidden">จอง</span>
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen} modal={true}>
        <DialogContent
          className="rounded-lg shadow-lg w-full max-w-[90vw] lg:max-w-[900px] max-h-[85vh] overflow-y-auto p-4 sm:p-6 bg-[var(--card)] scrollbar-thin scrollbar-thumb-[var(--primary)] scrollbar-track-[var(--secondary)]"
        >
          <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] h-1"></div>
          <DialogTitle>
            <div className="text-sm sm:text-base font-semibold text-[var(--foreground)] flex items-center gap-1.5 sticky top-0 bg-[var(--card)] z-10 py-2">
              <FontAwesomeIcon icon={faBookMedical} className="h-4 w-4 text-[var(--primary)]" />
              <span className="truncate">จองวัคซีน: {vaccineName}</span>
            </div>
          </DialogTitle>

          <motion.div
            variants={dialogVariants}
            initial="initial"
            animate="animate"
            className="mt-4 flex flex-col lg:flex-row gap-3 sm:gap-4"
          >
            {/* 左侧日历 */}
            <div className="w-full lg:w-1/2">
              <Card className="bg-[var(--card)] border-[var(--border)] rounded-lg shadow-sm overflow-hidden h-full">
                <div className="p-3 sm:p-4">
                  <HospitalCalendar
                    selected={date}
                    onSelect={setDate}
                    vaccine={vaccine}
                    bookings={bookings}
                    month={month}
                    setMonth={setMonth}
                  />
                </div>
              </Card>
            </div>

            {/* 右侧时间块 */}
            <div className="w-full lg:w-1/2">
              <Card className="bg-[var(--card)] border-[var(--border)] rounded-lg shadow-sm overflow-hidden h-full">
                <div className="p-3 sm:p-4 flex flex-col h-full">
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--foreground)] flex items-center gap-1.5 mb-3">
                    <FontAwesomeIcon icon={faHourglassHalf} className="h-4 w-4 text-[var(--primary)]" />
                    เลือกเวลา
                  </h3>
                  <div className="flex flex-row gap-2 mb-3">
                    <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                      <Button
                        variant={period === 'morning' ? 'default' : 'outline'}
                        onClick={() => { setPeriod('morning'); setCurrentPage(1); }}
                        className={cn(
                          'flex-1 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-all duration-150',
                          period === 'morning'
                            ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] hover:from-[var(--primary-foreground)] hover:to-[var(--primary)]'
                            : 'bg-[var(--card)] text-[var(--primary)] border-[var(--border)] hover:bg-[var(--secondary-light)]'
                        )}
                        aria-label="แสดงช่วงเช้า"
                      >
                        ช่วงเช้า
                      </Button>
                    </motion.div>
                    <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                      <Button
                        variant={period === 'afternoon' ? 'default' : 'outline'}
                        onClick={() => { setPeriod('afternoon'); setCurrentPage(1); }}
                        className={cn(
                          'flex-1 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-all duration-150',
                          period === 'afternoon'
                            ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] hover:from-[var(--primary-foreground)] hover:to-[var(--primary)]'
                            : 'bg-[var(--card)] text-[var(--primary)] border-[var(--border)] hover:bg-[var(--secondary-light)]'
                        )}
                        aria-label="แสดงช่วงบ่าย"
                      >
                        ช่วงบ่าย
                      </Button>
                    </motion.div>
                  </div>
                  {loading ? (
                    <motion.div
                      className="flex flex-col items-center justify-center flex-grow py-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        className="w-8 h-8 border-3 border-[var(--muted-foreground)] border-t-[var(--primary)] rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      />
                      <p className="mt-2 text-xs sm:text-sm font-medium text-[var(--muted-foreground)]">
                        กำลังโหลด...
                      </p>
                    </motion.div>
                  ) : date ? (
                    availableSlots.length > 0 ? (
                      <div className="flex-grow flex flex-col justify-between">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3"
                        >
                          {availableSlots
                            .slice((currentPage - 1) * slotsPerPage, currentPage * slotsPerPage)
                            .map((slot) => (
                              <motion.div
                                key={slot.id}
                                className="relative group"
                                variants={buttonVariants}
                                whileHover={{ scale: slot.available ? 1.05 : 1 }}
                                whileTap={{ scale: slot.available ? 0.97 : 1 }}
                              >
                                <motion.div
                                  onClick={() => {
                                    if (slot.available) {
                                      setSelectedSlot(slot.id);
                                    }
                                  }}
                                  className={cn(
                                    'w-full p-2.5 sm:p-3 rounded-lg border-[var(--border)] shadow-sm transition-all duration-150 cursor-pointer text-center',
                                    selectedSlot === slot.id
                                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] border-[var(--primary)] shadow-md'
                                      : slot.available
                                      ? 'bg-[var(--card)] hover:bg-[var(--secondary-light)] border'
                                      : 'bg-[var(--secondary)] border opacity-70 cursor-not-allowed'
                                  )}
                                  aria-label={`เลือกช่วงเวลา ${slot.start} ถึง ${slot.end}, ${slot.available ? `ว่าง ${slot.quota - slot.booked}/${slot.quota}` : 'ช่วงเวลาเต็มหรือไม่สามารถจองได้'}`}
                                  aria-selected={selectedSlot === slot.id}
                                  role="button"
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs sm:text-sm font-semibold text-[var(--foreground)]">{slot.start} - {slot.end}</span>
                                    <Badge
                                      className={cn(
                                        'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                                        slot.quota - slot.booked > 0
                                          ? 'bg-green-100 text-green-600'
                                          : 'bg-red-100 text-red-600'
                                      )}
                                    >
                                      {slot.quota - slot.booked > 0 ? `${slot.quota - slot.booked}/${slot.quota} ว่าง` : 'เต็ม'}
                                    </Badge>
                                  </div>
                                </motion.div>
                                {!slot.available && (
                                  <motion.div
                                    className="absolute top-full mt-1 p-1.5 rounded-lg shadow-md border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    ช่วงเวลานี้ไม่ว่างหรือหมดเขตจอง
                                  </motion.div>
                                )}
                              </motion.div>
                            ))}
                        </motion.div>
                        {availableSlots.length > slotsPerPage && (
                          <div className="flex items-center justify-center gap-2 mt-3">
                            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                              <Button
                                variant="outline"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="w-8 h-8 p-0 rounded-full bg-[var(--card)] border-[var(--border)] hover:bg-[var(--secondary-light)] transition-all duration-150 shadow-sm"
                                aria-label="หน้าไปก่อน"
                              >
                                <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
                              </Button>
                            </motion.div>
                            <span className="text-xs sm:text-sm font-medium text-[var(--muted-foreground)]">
                              {currentPage}/{Math.ceil(availableSlots.length / slotsPerPage)}
                            </span>
                            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                              <Button
                                variant="outline"
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(availableSlots.length / slotsPerPage)))}
                                disabled={currentPage === Math.ceil(availableSlots.length / slotsPerPage)}
                                className="w-8 h-8 p-0 rounded-full bg-[var(--card)] border-[var(--border)] hover:bg-[var(--secondary-light)] transition-all duration-150 shadow-sm"
                                aria-label="หน้าถัดไป"
                              >
                                <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                              </Button>
                            </motion.div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <motion.div
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        className="flex flex-col items-center justify-center flex-grow py-8"
                      >
                        <FontAwesomeIcon icon={faBan} className="h-5 w-5 text-[var(--destructive)] mb-2" />
                        <p className="text-xs sm:text-sm font-medium text-[var(--muted-foreground)] text-center">
                          ไม่มีช่วงเวลาว่างสำหรับวันที่นี้
                        </p>
                      </motion.div>
                    )
                  ) : (
                    <motion.div
                      variants={cardVariants}
                      initial="initial"
                      animate="animate"
                      className="flex flex-col items-center justify-center flex-grow py-8"
                    >
                      <FontAwesomeIcon icon={faCalendarDays} className="h-5 w-5 text-[var(--primary)] mb-2" />
                      <p className="text-xs sm:text-sm font-medium text-[var(--muted-foreground)] text-center">
                        กรุณาเลือกวันที่ก่อน
                      </p>
                    </motion.div>
                  )}
                </div>
              </Card>
            </div>
          </motion.div>

          <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--card)] border-[var(--border)] hover:bg-[var(--secondary-light)] text-[var(--primary)] shadow-sm transition-all duration-150"
                aria-label="ยกเลิก"
              >
                ยกเลิก
              </Button>
            </motion.div>
            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button
                onClick={handleBooking}
                disabled={loading || !date || !selectedSlot}
                className={cn(
                  'px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium shadow-sm transition-all duration-150',
                  loading || !date || !selectedSlot
                    ? 'bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)] opacity-50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-foreground)] text-[var(--card-foreground)] hover:from-[var(--primary-foreground)] hover:to-[var(--primary)]'
                )}
                aria-label="ยืนยันการจอง"
              >
                ยืนยันการจอง
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}