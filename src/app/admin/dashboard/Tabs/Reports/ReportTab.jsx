'use client';

import React, { useEffect, useState, useMemo, useCallback, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faChevronDown,
  faCalendar,
  faArrowRotateRight,
  faFilter,
  faChevronLeft,
  faChevronUp,
  faMagnifyingGlass,
  faChevronRight,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

// Wrap Button with motion for framer-motion compatibility
const MotionButton = motion(Button);

// Initialize dayjs with Thai locale and plugins
dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

// DatePicker component for selecting dates with Buddhist calendar support
const DatePicker = forwardRef(({ selected, onSelect, placeholder, minDate, maxDate, showIcon = true }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(
    selected && dayjs(selected).isValid() ? dayjs(selected).tz('Asia/Bangkok') : dayjs().tz('Asia/Bangkok')
  );

  const daysInMonth = (date) => (date.isValid() ? date.daysInMonth() : 0);
  const firstDayOfMonth = (date) => (date.isValid() ? date.startOf('month').day() : 0);

  const handlePreviousMonth = () => {
    setCurrentDate((prev) => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => prev.add(1, 'month'));
  };

  const handleDateClick = (day) => {
    const newDate = currentDate.date(day);
    const min = minDate && dayjs(minDate).isValid() ? dayjs(minDate).tz('Asia/Bangkok').startOf('day') : null;
    const max = maxDate && dayjs(maxDate).isValid() ? dayjs(maxDate).tz('Asia/Bangkok').endOf('day') : null;
    const isBlocked = (min && newDate.isBefore(min, 'day')) || (max && newDate.isAfter(max, 'day'));

    if (!isBlocked && newDate.isValid()) {
      onSelect(newDate.toDate());
      setIsOpen(false);
    }
  };

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  const weekdayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const days = Array.from({ length: daysInMonth(currentDate) }, (_, i) => i + 1);
  const startDay = firstDayOfMonth(currentDate);

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
  };

  return (
    <div className="relative w-full">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.button
            variant="outline"
            className={cn(
              'w-full flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-[var(--ring)] transition-all duration-300 pr-10'
            )}
            aria-label={placeholder}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center">
              {showIcon && <FontAwesomeIcon icon={faCalendar} className="mr-2 h-5 w-5 text-[var(--primary)]" />}
              {selected && dayjs(selected).isValid() ? (
                dayjs(selected).tz('Asia/Bangkok').format('D MMMM BBBB')
              ) : (
                <span className="text-[var(--muted-foreground)]">{placeholder}</span>
              )}
            </div>
            <FontAwesomeIcon icon={faChevronDown} className="h-5 w-5 text-[var(--primary)] absolute right-3 top-1/2 transform -translate-y-1/2" />
          </motion.button>
        </PopoverTrigger>
        {selected && (
          <motion.button
            onClick={handleClear}
            className="absolute right-10 top-1/2 transform -translate-y-1/2 text-[var(--primary)] hover:bg-[var(--muted)] rounded-full p-1 z-10"
            aria-label={`Clear ${placeholder}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </motion.button>
        )}
        <PopoverContent className="w-auto p-4 bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <motion.button
              onClick={handlePreviousMonth}
              className="h-8 w-8 rounded-full bg-[var(--muted)] text-[var(--primary)] hover:bg-[var(--muted)]/80 transition-all duration-200"
              aria-label="Previous month"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="h-5 w-5 mx-auto" />
            </motion.button>
            <span className="font-semibold text-[var(--primary)]">
              {monthNames[currentDate.month()]} {currentDate.add(543, 'year').year()}
            </span>
            <motion.button
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-full bg-[var(--muted)] text-[var(--primary)] hover:bg-[var(--muted)]/80 transition-all duration-200"
              aria-label="Next month"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FontAwesomeIcon icon={faChevronRight} className="h-5 w-5 mx-auto" />
            </motion.button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-medium text-[var(--muted-foreground)] mb-2">
            {weekdayNames.map((day, index) => (
              <div key={index} className="p-1">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 text-center text-sm">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${currentDate.format('YYYY-MM')}-${i}`} className="h-8 w-8"></div>
            ))}
            {days.map((day) => {
              const date = dayjs(currentDate).tz('Asia/Bangkok').date(day);
              const isSelected = selected && date.isSame(selected, 'day');
              const isToday = date.isSame(dayjs().tz('Asia/Bangkok'), 'day');
              const min = minDate && dayjs(minDate).isValid() ? dayjs(minDate).tz('Asia/Bangkok').startOf('day') : null;
              const max = maxDate && dayjs(maxDate).isValid() ? dayjs(maxDate).tz('Asia/Bangkok').endOf('day') : null;
              const isBlocked = (min && date.isBefore(min, 'day')) || (max && date.isAfter(max, 'day'));

              return (
                <motion.button
                  key={`${currentDate.format('YYYY-MM')}-${day}`}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    'h-8 w-8 rounded-full font-medium flex items-center justify-center transition-all duration-200',
                    isSelected
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90'
                      : isToday
                      ? 'border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--card)]/90'
                      : isBlocked
                      ? 'text-[var(--muted-foreground)] opacity-50 cursor-not-allowed'
                      : 'hover:bg-[var(--muted)]'
                  )}
                  disabled={isBlocked}
                  aria-label={`Select date ${day}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {day}
                </motion.button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});
DatePicker.displayName = 'DatePicker';

// Utility function to calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth || !dayjs(dateOfBirth).isValid()) return 'ไม่ระบุ';
  const birthDate = dayjs(dateOfBirth).tz('Asia/Bangkok');
  const now = dayjs().tz('Asia/Bangkok');
  let age = now.year() - birthDate.year();
  if (now.month() < birthDate.month() || (now.month() === birthDate.month() && now.date() < birthDate.date())) {
    age--;
  }
  return age >= 0 ? `${age} ปี` : 'ไม่ระบุ';
};

// Main ReportTab component
export default function ReportTab() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedVaccines, setSelectedVaccines] = useState(['all']);
  const [selectedStatus, setSelectedStatus] = useState('confirmed');
  const [selectedVaccinationStatus, setSelectedVaccinationStatus] = useState('all');
  const [vaccines, setVaccines] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);
  const itemsPerPage = 10;

  // Initialize component
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch bookings and vaccines from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('jwt');
      if (!token) throw new Error('Unauthorized: No token found');
      const [bookingRes, vaccineRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?populate=*`, {
          headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
          timeout: 5000,
        }),
        axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`, {
          headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
          timeout: 5000,
        }),
      ]);
      const bookingData = bookingRes.data.data;
      const vaccineData = vaccineRes.data.data;
      if (!Array.isArray(bookingData) || !Array.isArray(vaccineData)) {
        throw new Error('ข้อมูลไม่ถูกต้อง');
      }
      // Filter out invalid bookings
      const validBookings = bookingData.filter(
        booking => booking.id && booking.attributes && booking.attributes.booking_status && booking.attributes.vaccination_status
      );
      setBookings(validBookings);
      setVaccines(vaccineData);
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: errorMessage.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถโหลดข้อมูลได้: ${errorMessage}`,
        icon: 'error',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
          cancelButton: 'bg-[var(--muted)] text-[var(--muted-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--muted)]/80 transition-all duration-200',
        },
      }).then(() => {
        if (errorMessage.includes('Unauthorized')) {
          sessionStorage.clear();
          router.replace('/login');
        }
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle cancellation of a booking
  const handleCancel = useCallback(async (id) => {
    if (!id) {
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ID การจองไม่ถูกต้อง',
        icon: 'error',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
      });
      return;
    }
    const confirm = await MySwal.fire({
      title: 'ยืนยันการยกเลิก?',
      text: 'คุณต้องการยกเลิกการจองนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
        title: 'text-lg font-semibold text-[var(--card-foreground)]',
        htmlContainer: 'text-sm text-[var(--muted-foreground)]',
        confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        cancelButton: 'bg-[var(--muted)] text-[var(--muted-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--muted)]/80 transition-all duration-200',
      },
    });
    if (confirm.isConfirmed) {
      try {
        const token = sessionStorage.getItem('jwt');
        if (!token) throw new Error('JWT token is missing');
        await axios.put(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings/${id}`,
          { data: { booking_status: 'cancelled' } },
          {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
            timeout: 5000,
          }
        );
        MySwal.fire({
          title: 'ยกเลิกสำเร็จ',
          text: 'การจองถูกยกเลิกแล้ว',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: {
            popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
            title: 'text-lg font-semibold text-[var(--card-foreground)]',
            htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          },
        });
        await fetchData();
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        MySwal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: `ไม่สามารถยกเลิกการจองได้: ${errorMessage}`,
          icon: 'error',
          customClass: {
            popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
            title: 'text-lg font-semibold text-[var(--card-foreground)]',
            htmlContainer: 'text-sm text-[var(--muted-foreground)]',
            confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
          },
        });
      }
    }
  }, [fetchData]);

  // Handle toggling of vaccination status without confirmation or page refresh
  const handleToggleVaccinationStatus = useCallback(async (id, currentStatus) => {
    if (!id) {
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ID การจองไม่ถูกต้อง',
        icon: 'error',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
      });
      return;
    }
    const effectiveStatus = currentStatus || 'not_started';
    const newStatus = effectiveStatus === 'vaccinated' ? 'not_started' : 'vaccinated';
    const newStatusText = newStatus === 'vaccinated' ? 'ฉีดแล้ว' : 'ยังไม่ได้รับการฉีด';
    try {
      const token = sessionStorage.getItem('jwt');
      if (!token) throw new Error('JWT token is missing');
      await axios.put(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings/${id}`,
        { data: { vaccination_status: newStatus } },
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
          timeout: 5000,
        }
      );
      // Update local state without fetching new data
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.id === id ? { ...booking, attributes: { ...booking.attributes, vaccination_status: newStatus } } : booking
        )
      );
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: `ไม่สามารถเปลี่ยนสถานะได้: ${errorMessage}`,
        icon: 'error',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
      });
    }
  }, []);

  // Filter bookings based on search, vaccine, booking status, vaccination status, and date range
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (!b.attributes) {
        return false;
      }
      const patient = b.attributes.patient?.data?.attributes;
      const fullName = patient ? `${patient.first_name} ${patient.last_name}` : '';
      const vaccineId = b.attributes.vaccine?.data?.id?.toString() || '';
      const bookingDay = dayjs(b.attributes.bookingDate).tz('Asia/Bangkok');
      const start = startDate ? dayjs(startDate).tz('Asia/Bangkok').startOf('day') : null;
      const end = endDate ? dayjs(endDate).tz('Asia/Bangkok').endOf('day') : null;

      const matchesSearch = fullName.toLowerCase().includes(search.toLowerCase());
      const matchesVaccine = selectedVaccines.includes('all') || selectedVaccines.includes(vaccineId);
      const matchesBookingStatus = selectedStatus === 'all' || b.attributes.booking_status === selectedStatus;
      const effectiveVaccinationStatus = b.attributes.vaccination_status || 'not_started';
      const matchesVaccinationStatus = selectedVaccinationStatus === 'all' ||
        (selectedVaccinationStatus === 'vaccinated' && effectiveVaccinationStatus === 'vaccinated') ||
        (selectedVaccinationStatus === 'not_vaccinated' && ['not_vaccinated', 'not_started'].includes(effectiveVaccinationStatus));
      const matchesDate = start || end
        ? (!start || bookingDay.isSameOrAfter(start)) && (!end || bookingDay.isSameOrBefore(end))
        : true;

      return matchesSearch && matchesVaccine && matchesBookingStatus && matchesVaccinationStatus && matchesDate;
    });
  }, [bookings, search, selectedVaccines, selectedStatus, selectedVaccinationStatus, startDate, endDate]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export filtered bookings to Excel
  const exportExcel = useCallback(() => {
    if (!filteredBookings.length) {
      MySwal.fire({
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลสำหรับดาวน์โหลด',
        icon: 'warning',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
      });
      return;
    }
    setExportLoading(true);
    const data = filteredBookings.map(b => ({
      ชื่อ: b.attributes.patient?.data?.attributes
        ? `${b.attributes.patient.data.attributes.first_name} ${b.attributes.patient.data.attributes.last_name}`
        : 'ไม่ระบุ',
      อายุ: calculateAge(b.attributes.patient?.data?.attributes?.birth_date),
      วัคซีน: b.attributes.vaccine?.data?.attributes?.title || 'ไม่ระบุ',
      วันที่นัด: dayjs(b.attributes.bookingDate).tz('Asia/Bangkok').format('D MMMM BBBB'),
      สถานะใบนัด: b.attributes.booking_status === 'cancelled' ? 'ยกเลิก' : 'จองแล้ว',
      สถานะฉีดวัคซีน: b.attributes.booking_status === 'cancelled'
        ? '-'
        : (b.attributes.vaccination_status || 'not_started') === 'vaccinated' ? 'ฉีดแล้ว' : 'ยังไม่ได้รับการฉีด',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    saveAs(
      new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]),
      `รายงานใบนัดทั้งหมด-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`
    );
    setExportLoading(false);
  }, [filteredBookings]);

  // Reset filters
  const resetFilters = () => {
    setSearch('');
    setSelectedVaccines(['all']);
    setSelectedStatus('confirmed');
    setSelectedVaccinationStatus('all');
    setStartDate(null);
    setEndDate(null);
    setShowFilters(false);
  };

  // Loading state
  if (!mounted || loading) {
    return (
      <motion.div
        className="flex items-center justify-center h-screen bg-[var(--background)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-8 h-8 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      </motion.div>
    );
  }

  const vaccineOptions = [{ id: 'all', attributes: { title: 'ทั้งหมด' } }, ...vaccines];
  const activeFiltersCount = [
    search,
    !selectedVaccines.includes('all'),
    selectedStatus !== 'confirmed',
    selectedVaccinationStatus !== 'all',
    startDate,
    endDate,
  ].filter(Boolean).length;

  const today = dayjs().tz('Asia/Bangkok');

  return (
    <motion.div
      className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-[var(--card)] rounded-[var(--radius)] shadow-sm font-prompt"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--primary)] mb-2">รายงานการจองวัคซีน</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          ข้อมูล ณ วันที่ {dayjs().tz('Asia/Bangkok').format('D MMMM BBBB')}
        </p>

        {/* Search and Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="relative flex-grow">
            <Input
              placeholder="ค้นหาชื่อ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-10 py-2 text-xs sm:text-sm font-medium bg-[var(--card)] border-[var(--border)]/20 rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] transition-all duration-200 shadow-sm w-full"
              aria-label="ค้นหาชื่อ"
            />
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary)]"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--primary)] p-1 h-auto"
                aria-label="ล้างการค้นหา"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="relative w-full sm:w-auto">
            <Button
              variant="outline"
              className="flex justify-between items-center w-full sm:w-auto px-5 py-3 text-sm font-medium bg-[var(--card)] border-[var(--border)]/20 hover:bg-[var(--primary)]/5 transition-all duration-200 rounded-[var(--radius)] shadow-sm"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="filter-panel-content"
            >
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faFilter} className="h-4 w-4 text-[var(--primary)]" />
                <span className="text-sm font-medium text-[var(--card-foreground)]">ตัวกรอง</span>
                {activeFiltersCount > 0 && (
                  <Badge className="bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] sm:text-xs font-medium rounded-full px-2 py-0.5">
                    {activeFiltersCount}
                  </Badge>
                )}
              </div>
              {showFilters ? (
                <FontAwesomeIcon icon={faChevronUp} className="h-4 w-4 text-[var(--primary)]" />
              ) : (
                <FontAwesomeIcon icon={faChevronDown} className="h-4 w-4 text-[var(--primary)]" />
              )}
            </Button>

            {showFilters && (
              <motion.div
                id="filter-panel-content"
                className="absolute right-0 mt-2 w-full sm:w-80 bg-[var(--card)] border-[var(--border)]/20 rounded-[var(--radius)] shadow-lg z-20 overflow-hidden backdrop-blur-md"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--card-foreground)] mb-1">วัคซีน</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <motion.button
                          className="w-full flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-[var(--ring)] transition-all duration-300"
                          aria-label="Select vaccine"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span className="truncate">
                            {selectedVaccines.length === 0
                              ? 'เลือกวัคซีน'
                              : selectedVaccines.includes('all')
                              ? 'ทั้งหมด'
                              : selectedVaccines
                                  .map(id => vaccines.find(v => v.id.toString() === id)?.attributes?.title || id)
                                  .join(', ')}
                          </span>
                          <FontAwesomeIcon icon={faChevronDown} className="h-5 w-5 text-[var(--primary)]" />
                        </motion.button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0 bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius)] shadow-lg">
                        <Command>
                          <CommandInput
                            placeholder="ค้นหาวัคซีน..."
                            className="text-[var(--card-foreground)] border-b border-[var(--border)]"
                          />
                          <CommandList>
                            <CommandEmpty className="text-[var(--muted-foreground)]">ไม่พบวัคซีน</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => setSelectedVaccines(['all'])}
                                className="cursor-pointer hover:bg-[var(--muted)] text-[var(--card-foreground)]"
                              >
                                <span>ทั้งหมด</span>
                              </CommandItem>
                              {vaccines.map(vaccine => (
                                <CommandItem
                                  key={vaccine.id}
                                  onSelect={() =>
                                    setSelectedVaccines(prev => {
                                      const id = vaccine.id.toString();
                                      const newVaccines = prev.includes(id)
                                        ? prev.filter(v => v !== id)
                                        : [...prev.filter(v => v !== 'all'), id];
                                      return newVaccines.length === 0 ? ['all'] : newVaccines;
                                    })
                                  }
                                  className="cursor-pointer hover:bg-[var(--muted)] text-[var(--card-foreground)]"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedVaccines.includes(vaccine.id.toString())}
                                    onChange={() => {}}
                                    className="mr-2 h-4 w-4 accent-[var(--primary)]"
                                  />
                                  {vaccine.attributes.title}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--card-foreground)] mb-1">สถานะใบนัด</label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger
                        className="text-sm font-medium bg-[var(--card)] border-[var(--border)]/20 rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] py-1.5 px-2 shadow-sm w-full"
                        aria-label="เลือกสถานะใบนัด"
                      >
                        <SelectValue placeholder="เลือกสถานะ" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border-[var(--border)]/20 rounded-[var(--radius)] shadow-md z-30">
                        <SelectItem value="all" className="text-sm">ทั้งหมด</SelectItem>
                        <SelectItem value="confirmed" className="text-sm">จองแล้ว</SelectItem>
                        <SelectItem value="cancelled" className="text-sm">ยกเลิก</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--card-foreground)] mb-1">สถานะฉีด</label>
                    <Select value={selectedVaccinationStatus} onValueChange={setSelectedVaccinationStatus}>
                      <SelectTrigger
                        className="text-sm font-medium bg-[var(--card)] border-[var(--border)]/20 rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] py-1.5 px-2 shadow-sm w-full"
                        aria-label="เลือกสถานะฉีด"
                      >
                        <SelectValue placeholder="เลือกสถานะฉีด" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border-[var(--border)]/20 rounded-[var(--radius)] shadow-md z-30">
                        <SelectItem value="all" className="text-sm">ทั้งหมด</SelectItem>
                        <SelectItem value="vaccinated" className="text-sm">ฉีดแล้ว</SelectItem>
                        <SelectItem value="not_vaccinated" className="text-sm">ยังไม่ได้รับการฉีด</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--card-foreground)] mb-1">จากวันที่</label>
                    <div className="relative">
                      <DatePicker
                        selected={startDate}
                        onSelect={setStartDate}
                        placeholder="วัน เดือน ปี"
                        minDate={today.subtract(1, 'year').toDate()}
                        maxDate={today.add(1, 'year').toDate()}
                        showIcon={true}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--card-foreground)] mb-1">ถึงวันที่</label>
                    <div className="relative">
                      <DatePicker
                        selected={endDate}
                        onSelect={setEndDate}
                        placeholder="วัน เดือน ปี"
                        minDate={today.subtract(1, 'year').toDate()}
                        maxDate={today.add(1, 'year').toDate()}
                        showIcon={true}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="w-full px-5 py-3 text-sm font-medium bg-[var(--card)] text-[var(--primary)] border-[var(--border)]/20 hover:bg-[var(--primary)]/10 rounded-[var(--radius)] shadow-sm"
                  >
                    <FontAwesomeIcon icon={faArrowRotateRight} className="w-4 h-4 mr-2" />
                    รีเซ็ตตัวกรอง
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
          <MotionButton
            onClick={exportExcel}
            className="w-full sm:w-auto px-5 py-3 text-sm bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm"
            disabled={exportLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="ดาวน์โหลด Excel"
          >
            <FontAwesomeIcon icon={faDownload} className="w-5 h-5 mr-2" /> ดาวน์โหลด Excel
          </MotionButton>
        </div>

        {/* Main Content */}
        <motion.div
          className="bg-[var(--card)] rounded-[var(--radius)] shadow-lg p-6 border border-[var(--border)] mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-[var(--card-foreground)] border-separate border-spacing-y-1">
              <thead>
                <tr className="bg-[var(--muted)]/10 border border-[var(--border)] rounded-[var(--radius)]">
                  <th className="p-3 font-semibold text-[var(--primary)] text-left rounded-l-[var(--radius)]" aria-label="ชื่อ">ชื่อ</th>
                  <th className="p-3 font-semibold text-[var(--primary)] text-left" aria-label="อายุ">อายุ</th>
                  <th className="p-3 font-semibold text-[var(--primary)] text-left" aria-label="วัคซีน">วัคซีน</th>
                  <th className="p-3 font-semibold text-[var(--primary)] text-left" aria-label="วันที่นัด">วันที่นัด</th>
                  <th className="p-3 font-semibold text-[var(--primary)] text-left" aria-label="สถานะใบนัด">สถานะใบนัด</th>
                  <th className="p-3 font-semibold text-[var(--primary)] text-left" aria-label="สถานะฉีด">สถานะฉีด</th>
                  <th className="p-3 font-semibold text-[var(--primary)] text-left rounded-r-[var(--radius)]" aria-label="ดำเนินการ">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {paginatedBookings.map((booking, index) => {
                    if (!booking.attributes) {
                      return null;
                    }
                    const bookingStatus = booking.attributes.booking_status || 'confirmed';
                    const vaccinationStatus = booking.attributes.vaccination_status || 'not_started';
                    const appointmentText = bookingStatus === 'cancelled' ? 'ยกเลิก' : 'จองแล้ว';
                    const appointmentVariant = bookingStatus === 'cancelled' ? 'destructive' : 'default';
                    const isCancelled = bookingStatus === 'cancelled';
                    const vaccinationText = isCancelled
                      ? '-'
                      : vaccinationStatus === 'vaccinated' ? 'ฉีดแล้ว' : 'ยังไม่ได้รับการฉีด';
                    const vaccinationVariant = isCancelled
                      ? 'secondary'
                      : vaccinationStatus === 'vaccinated' ? 'default' : 'warning';
                    return (
                      <motion.tr
                        key={booking.id}
                        className="border border-[var(--border)] rounded-[var(--radius)] hover:bg-[var(--muted)]/5 transition-all duration-200"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <td className="p-3 rounded-l-[var(--radius)]">
                          {booking.attributes.patient?.data?.attributes
                            ? `${booking.attributes.patient.data.attributes.first_name} ${booking.attributes.patient.data.attributes.last_name}`
                            : 'ไม่ระบุ'}
                        </td>
                        <td className="p-3">
                          {calculateAge(booking.attributes.patient?.data?.attributes?.birth_date)}
                        </td>
                        <td className="p-3">
                          {booking.attributes.vaccine?.data?.attributes?.title || 'ไม่ระบุ'}
                        </td>
                        <td className="p-3">
                          {dayjs(booking.attributes.bookingDate).tz('Asia/Bangkok').format('D MMMM BBBB')}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={appointmentVariant}
                            className={
                              bookingStatus === 'cancelled'
                                ? 'bg-[var(--destructive)] text-[var(--primary-foreground)] rounded-[var(--radius)]'
                                : 'bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)]'
                            }
                          >
                            {appointmentText}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={vaccinationVariant}
                            onClick={() => !isCancelled && handleToggleVaccinationStatus(booking.id, vaccinationStatus)}
                            className={
                              isCancelled
                                ? 'bg-[var(--muted)] text-[var(--primary-foreground)] rounded-[var(--radius)] cursor-not-allowed'
                                : vaccinationStatus === 'vaccinated'
                                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] cursor-pointer hover:bg-[var(--primary)]/90 rounded-[var(--radius)]'
                                : 'bg-[var(--primary)] text-[var(--primary-foreground)] cursor-pointer hover:bg-[var(--primary)]/90 rounded-[var(--radius)]'
                            }
                            aria-label={isCancelled
                              ? `สถานะฉีดวัคซีน: ${vaccinationText}`
                              : `เปลี่ยนสถานะเป็น ${vaccinationText === 'ฉีดแล้ว' ? 'ยังไม่ได้รับการฉีด' : 'ฉีดแล้ว'}`}
                          >
                            {vaccinationText}
                          </Badge>
                        </td>
                        <td className="p-3 rounded-r-[var(--radius)]">
                          {bookingStatus === 'confirmed' && (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="destructive"
                                className="px-4 py-3 text-sm bg-[var(--destructive)] text-[var(--primary-foreground)] hover:bg-[var(--destructive)]/90 rounded-[var(--radius)] shadow-sm"
                                onClick={() => handleCancel(booking.id)}
                                aria-label="Cancel booking"
                              >
                                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
            {!filteredBookings.length && (
              <div className="text-center p-6 text-[var(--muted-foreground)] text-sm">
                ไม่มีข้อมูลการจองสำหรับตัวกรองที่เลือก กรุณาตรวจสอบข้อมูลหรือรีเซ็ตตัวกรอง
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="px-5 py-3 text-sm bg-[var(--card)] border-[var(--border)] text-[var(--card-foreground)] hover:bg-[var(--muted)] rounded-[var(--radius)] shadow-sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  ก่อนหน้า
                </Button>
              </motion.div>
              <span className="text-sm text-[var(--card-foreground)] font-medium">
                หน้า {currentPage} / {totalPages}
              </span>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="px-5 py-3 text-sm bg-[var(--card)] border-[var(--border)] text-[var(--card-foreground)] hover:bg-[var(--muted)] rounded-[var(--radius)] shadow-sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  ถัดไป
                </Button>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}