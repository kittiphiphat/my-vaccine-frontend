'use client';
import React, { useEffect, useState, useMemo, forwardRef } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon, MagnifyingGlassIcon, NoSymbolIcon, ArrowPathIcon, FunnelIcon
} from '@heroicons/react/24/outline';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
dayjs.locale('th');
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');
const MySwal = withReactContent(Swal);
function formatDateToBuddhistEra(date) {
  if (!date || !dayjs(date).isValid()) return '-';
  return dayjs(date).tz('Asia/Bangkok').locale('th').format('D MMMM BBBB');
}
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth || typeof dateOfBirth !== 'string') {
    MySwal.fire({
      title: 'คำเตือน',
      text: 'ไม่มีข้อมูลวันเกิดหรือข้อมูลไม่ถูกต้อง',
      icon: 'warning',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      customClass: {
        popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-4',
        title: 'text-base font-bold text-[#30266D] mb-2',
        htmlContainer: 'text-sm text-[#30266D] font-medium',
      },
    });
    return 'ไม่ระบุ';
  }
  let birthDate = dayjs(dateOfBirth, ['YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY', 'MM-DD-YYYY'], true).tz('Asia/Bangkok');
  if (!birthDate.isValid()) {
    birthDate = dayjs(dateOfBirth).tz('Asia/Bangkok');
  }
  if (!birthDate.isValid()) {
    MySwal.fire({
      title: 'คำเตือน',
      text: `ข้อมูลวันเกิดไม่ถูกต้อง: ${dateOfBirth}`,
      icon: 'warning',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      customClass: {
        popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-4',
        title: 'text-base font-bold text-[#30266D] mb-2',
        htmlContainer: 'text-sm text-[#30266D] font-medium',
      },
    });
    return 'ไม่ระบุ';
  }
  const currentDate = dayjs().tz('Asia/Bangkok');
  let age = currentDate.year() - birthDate.year();
  const hasPassedBirthday = currentDate.month() > birthDate.month() ||
    (currentDate.month() === birthDate.month() && currentDate.date() >= birthDate.date());
  if (!hasPassedBirthday) {
    age -= 1;
  }
  if (age < 0) {
    MySwal.fire({
      title: 'คำเตือน',
      text: `ตรวจพบวันเกิดในอนาคต: ${dateOfBirth}`,
      icon: 'warning',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      customClass: {
        popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-4',
        title: 'text-base font-bold text-[#30266D] mb-2',
        htmlContainer: 'text-sm text-[#30266D] font-medium',
      },
    });
    return 'ไม่ระบุ';
  }
  return age;
};
const DatePicker = forwardRef(({ selected, onSelect, placeholder, minDate, maxDate }, ref) => {
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
    const min = minDate && dayjs(minDate).isValid() ? dayjs(minDate).tz('Asia/Bangkok') : null;
    const max = maxDate && dayjs(maxDate).isValid() ? dayjs(maxDate).tz('Asia/Bangkok') : null;
    if ((!min || newDate.isSameOrAfter(min, 'day')) && (!max || newDate.isSameOrBefore(max, 'day'))) {
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
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2.5 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300',
            !selected && 'text-gray-500'
          )}
          aria-label={placeholder}
        >
          {selected && dayjs(selected).isValid() ? formatDateToBuddhistEra(selected) : <span>{placeholder}</span>}
          <CalendarIcon className="ml-auto h-4 w-4 text-[#F9669D] mr-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 bg-white rounded-xl shadow-lg border border-[#30266D]/50">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full bg-[#F9669D]/10 text-[#F9669D] hover:bg-[#F9669D]/20"
              onClick={handlePreviousMonth}
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="font-medium text-sm text-[#30266D]">
              {monthNames[currentDate.month()]} {currentDate.year() + 543}
            </div>
            <Button
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full bg-[#F9669D]/10 text-[#F9669D] hover:bg-[#F9669D]/20"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-medium text-[#30266D]">
            {weekdayNames.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 text-center mt-2">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7 w-7"></div>
            ))}
            {days.map((day) => {
              const date = dayjs(currentDate).tz('Asia/Bangkok').date(day);
              const isSelected = selected && date.isSame(selected, 'day');
              const isToday = date.isSame(dayjs().tz('Asia/Bangkok'), 'day');
              const isBlocked =
                (minDate && date.isBefore(dayjs(minDate).tz('Asia/Bangkok'), 'day')) ||
                (maxDate && date.isAfter(dayjs(maxDate).tz('Asia/Bangkok'), 'day'));
              return (
                <Button
                  key={day}
                  variant="ghost"
                  className={cn(
                    'h-7 w-7 p-0 rounded-full text-sm font-medium',
                    isSelected && 'bg-[#F9669D] text-white hover:bg-[#F9669D]/80',
                    isToday && 'border-2 border-[#30266D] hover:bg-[#F9669D]/10',
                    isBlocked && 'text-gray-400 opacity-50 cursor-not-allowed',
                    !isSelected && !isBlocked && 'hover:bg-[#F9669D]/10'
                  )}
                  onClick={() => handleDateClick(day)}
                  disabled={isBlocked}
                  aria-label={`Select day ${day}`}
                >
                  {day}
                </Button>
              );
            })}
          </div>
        </motion.div>
      </PopoverContent>
      {selected && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0 rounded-full bg-[#F9669D]/10 text-[#F9669D] hover:bg-[#F9669D]/20"
          onClick={() => onSelect(null)}
          aria-label={`ล้างวันที่${placeholder}`}
        >
          <XMarkIcon className="h-3 w-3" />
        </Button>
      )}
    </Popover>
  );
});
DatePicker.displayName = 'DatePicker';
export default function ReportTab() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedVaccine, setSelectedVaccine] = useState('all');
  const [vaccineSearch, setVaccineSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('confirmed');
  const [vaccines, setVaccines] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingRes, vaccineRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?populate=patient,vaccine`, {
          method: 'GET',
          credentials: 'include',
        }),
        fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`, {
          method: 'GET',
          credentials: 'include',
        }),
      ]);
      if (!bookingRes.ok) {
        const errorData = await bookingRes.json().catch(() => null);
        const message = errorData?.error?.message || bookingRes.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (bookingRes.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      if (!vaccineRes.ok) {
        const errorData = await vaccineRes.json().catch(() => null);
        const message = errorData?.error?.message || vaccineRes.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (vaccineRes.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      const bookingData = await bookingRes.json();
      const vaccineData = await vaccineRes.json();
      setBookings(bookingData.data || []);
      setVaccines(vaccineData.data || []);
    } catch (err) {
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: err.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถโหลดข้อมูลได้: ${err.message}`,
        icon: 'error',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      if (err.message === 'Unauthorized') {
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = async (app) => {
    const confirm = await MySwal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'คุณต้องการยกเลิกใบนัดนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการยกเลิก',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
        title: 'text-xl font-bold text-[#30266D] mb-3',
        htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        cancelButton: 'bg-gray-300 text-[#30266D] px-4 py-2 rounded-xl font-semibold hover:bg-gray-400 transition-all duration-300 transform hover:scale-105',
      },
    });
    if (!confirm.isConfirmed) return;
    setCancelingId(app.id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: { status: 'cancelled' } }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      MySwal.fire({
        title: 'ยกเลิกสำเร็จ',
        text: 'ยกเลิกใบนัดเรียบร้อยแล้ว',
        icon: 'success',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      await fetchData();
    } catch (error) {
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถยกเลิกได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      if (error.message === 'Unauthorized') {
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } finally {
      setCancelingId(null);
    }
  };
  const filteredVaccines = useMemo(() => {
    if (!vaccineSearch) return vaccines;
    return vaccines.filter((v) =>
      v.attributes.title.toLowerCase().includes(vaccineSearch.toLowerCase())
    );
  }, [vaccines, vaccineSearch]);
  const selectedVaccineTitle = useMemo(() => {
    if (selectedVaccine === 'all') return 'วัคซีนทั้งหมด';
    const vaccine = vaccines.find((v) => v.id.toString() === selectedVaccine);
    return vaccine?.attributes.title || 'เลือกวัคซีน';
  }, [selectedVaccine, vaccines]);
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const patient = b.attributes.patient?.data?.attributes;
      const vaccineId = b.attributes.vaccine?.data?.id?.toString() || '';
      const fullName = patient ? `${patient.first_name} ${patient.last_name}` : '';
      const status = b.attributes.status;
      const bookingDay = b.attributes.bookingDate && dayjs(b.attributes.bookingDate).isValid() ? dayjs(b.attributes.bookingDate).tz('Asia/Bangkok') : null;
      const filterStartDate = startDate && dayjs(startDate).isValid() ? dayjs(startDate).tz('Asia/Bangkok').startOf('day') : null;
      const filterEndDate = endDate && dayjs(endDate).isValid() ? dayjs(endDate).tz('Asia/Bangkok').endOf('day') : null;
      return (
        fullName.toLowerCase().includes(search.toLowerCase()) &&
        (selectedVaccine === 'all' || selectedVaccine === vaccineId) &&
        status === selectedStatus &&
        (!filterStartDate || (bookingDay && bookingDay.isSameOrAfter(filterStartDate))) &&
        (!filterEndDate || (bookingDay && bookingDay.isSameOrBefore(filterEndDate)))
      );
    });
  }, [bookings, search, selectedVaccine, selectedStatus, startDate, endDate]);
  const exportExcel = () => {
    if (!filteredBookings.length) {
      MySwal.fire({
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลการจองสำหรับส่งออก',
        icon: 'warning',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      return;
    }
    const data = filteredBookings.map((b) => {
      const patient = b.attributes.patient?.data?.attributes;
      const vaccine = b.attributes.vaccine?.data?.attributes;
      return {
        'ชื่อผู้จอง': patient ? `${patient.first_name} ${patient.last_name}` : '[ไม่มีชื่อผู้จอง]',
        'อายุ': calculateAge(patient?.birth_date),
        'วัคซีน': vaccine?.title || '-',
        'วันที่นัด': formatDateToBuddhistEra(b.attributes.bookingDate),
        'สถานะ': b.attributes.status === 'confirmed' ? 'จองแล้ว' : 'ยกเลิก',
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'รายงานการจอง');
    const fileName = `รายงานการจอง${search ? `-${search}` : ''}-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`;
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), fileName);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="text-2xl sm:text-3xl font-bold tracking-tight text-[#30266D]"
        >
          รายงานการจองวัคซีน
        </motion.h1>
        <div className="flex gap-3">
          <Button
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-white text-sm shadow-sm hover:shadow-md transition-all duration-300 bg-[#F9669D] hover:bg-[#F9669D]/80"
            onClick={() => setShowFilters(!showFilters)}
            aria-label={showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
          >
            {showFilters ? <XMarkIcon className="h-4 w-4" /> : <FunnelIcon className="h-4 w-4" />}
            {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
          </Button>
          <Button
            onClick={exportExcel}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-white text-sm shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-r from-[#30266D] to-[#F9669D] hover:from-[#30266D]/80 hover:to-[#F9669D]/80"
            aria-label="ดาวน์โหลดเป็น Excel"
          >
            ดาวน์โหลด Excel
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <Card className="bg-white rounded-xl shadow-lg border border-[#30266D]/50">
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold text-[#30266D]">
                  ตัวกรองการค้นหา
                </CardTitle>
                <Button
                  variant="ghost"
                  className="text-sm font-semibold text-[#F9669D] hover:bg-[#F9669D]/10"
                  onClick={() => {
                    setSearch('');
                    setSelectedVaccine('all');
                    setVaccineSearch('');
                    setSelectedStatus('confirmed');
                    setStartDate(null);
                    setEndDate(null);
                  }}
                  aria-label="รีเซ็ตตัวกรอง"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  รีเซ็ต
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[#30266D]">
                    ค้นหาชื่อ
                  </label>
                  <div className="relative">
                    <Input
                      placeholder="ค้นหาชื่อผู้จองวัคซีน..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] pl-10 pr-9 py-2 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300"
                      aria-label="ค้นหาชื่อผู้จอง"
                    />
                    {search && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0 rounded-full bg-[#F9669D]/10 text-[#F9669D] hover:bg-[#F9669D]/20"
                        onClick={() => setSearch('')}
                        aria-label="ล้างการค้นหาชื่อ"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </Button>
                    )}
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#F9669D]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[#30266D]">
                    วัคซีน
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] py-2 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300"
                        aria-label="เลือกวัคซีน"
                      >
                        <span className="truncate">{selectedVaccineTitle}</span>
                        <ChevronDownIcon className="h-4 w-4 ml-2 text-[#F9669D]" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] bg-white rounded-xl shadow-lg border border-[#30266D]/50 max-h-60 overflow-y-auto">
                      <div className="p-2 sticky top-0 bg-white">
                        <div className="relative">
                          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#F9669D]" />
                          <Input
                            placeholder="ค้นหาวัคซีน..."
                            value={vaccineSearch}
                            onChange={(e) => setVaccineSearch(e.target.value)}
                            className="pl-9 rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] text-sm font-medium shadow-sm"
                            aria-label="ค้นหาวัคซีน"
                          />
                        </div>
                      </div>
                      <div className="px-2 pb-2">
                        <Button
                          variant="ghost"
                          className={cn(
                            'w-full text-left rounded-xl py-1.5 px-3 text-sm font-medium text-[#30266D]',
                            selectedVaccine === 'all' ? 'bg-[#30266D]/10 font-semibold' : 'hover:bg-[#F9669D]/10'
                          )}
                          onClick={() => {
                            setSelectedVaccine('all');
                            setVaccineSearch('');
                          }}
                          aria-label="เลือกวัคซีนทั้งหมด"
                        >
                          วัคซีนทั้งหมด
                        </Button>
                        {filteredVaccines.length === 0 ? (
                          <p className="text-center text-sm py-3 text-gray-600">
                            ไม่พบวัคซีน
                          </p>
                        ) : (
                          filteredVaccines.map((v) => (
                            <Button
                              key={v.id}
                              variant="ghost"
                              className={cn(
                                'w-full text-left rounded-xl py-1.5 px-3 text-sm font-medium text-[#30266D]',
                                selectedVaccine === v.id.toString() ? 'bg-[#30266D]/10 font-semibold' : 'hover:bg-[#F9669D]/10'
                              )}
                              onClick={() => {
                                setSelectedVaccine(v.id.toString());
                                setVaccineSearch('');
                              }}
                              aria-label={`เลือกวัคซีน ${v.attributes.title}`}
                            >
                              {v.attributes.title}
                            </Button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[#30266D]">
                    สถานะ
                  </label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger
                      className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] py-2 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300"
                      aria-label="เลือกสถานะ"
                    >
                      <SelectValue placeholder="สถานะ" />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl shadow-lg border border-[#30266D]/50">
                      <SelectItem
                        value="confirmed"
                        className="text-sm font-medium text-[#30266D] rounded-xl hover:bg-[#F9669D]/10 focus:bg-[#F9669D]/10"
                        aria-label="จองแล้ว"
                      >
                        จองแล้ว
                      </SelectItem>
                      <SelectItem
                        value="cancelled"
                        className="text-sm font-medium text-[#30266D] rounded-xl hover:bg-[#F9669D]/10 focus:bg-[#F9669D]/10"
                        aria-label="ยกเลิก"
                      >
                        ยกเลิก
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[#30266D]">
                    จากวันที่
                  </label>
                  <div className="relative">
                    <DatePicker
                      selected={startDate}
                      onSelect={setStartDate}
                      placeholder="จากวันที่"
                      maxDate={endDate}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[#30266D]">
                    ถึงวันที่
                  </label>
                  <div className="relative">
                    <DatePicker
                      selected={endDate}
                      onSelect={setEndDate}
                      placeholder="ถึงวันที่"
                      minDate={startDate}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      {loading ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="bg-white rounded-xl shadow-lg border border-[#30266D]/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#30266D]/20">
                  <thead className="bg-[#30266D]">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="ชื่อผู้จอง">
                        ชื่อผู้จอง
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="อายุ">
                        อายุ
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="วัคซีน">
                        วัคซีน
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="วันที่นัด">
                        วันที่นัด
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="สถานะ">
                        สถานะ
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="การจัดการ">
                        การจัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30266D]/20">
                    <tr>
                      <td colSpan={6} className="p-6 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div
                            className="w-9 h-9 border-4 rounded-full animate-pulse"
                            style={{ borderColor: 'rgba(48, 38, 109, 0.2)', borderTopColor: '#30266D' }}
                          ></div>
                          <p className="mt-2 text-sm font-medium text-[#30266D]">
                            กำลังโหลดข้อมูล...
                          </p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : filteredBookings.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="bg-white rounded-xl shadow-lg border border-[#30266D]/50">
            <CardContent className="p-6 text-center text-base font-medium text-[#30266D]">
              ไม่พบข้อมูลการจอง
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="bg-white rounded-xl shadow-lg border border-[#30266D]/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#30266D]/20">
                  <thead className="bg-[#30266D]">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="ชื่อผู้จอง">
                        ชื่อผู้จอง
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="อายุ">
                        อายุ
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="วัคซีน">
                        วัคซีน
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="วันที่นัด">
                        วันที่นัด
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="สถานะ">
                        สถานะ
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-sm text-white" scope="col" aria-label="การจัดการ">
                        การจัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30266D]/20">
                    {filteredBookings.map((app, index) => {
                      const p = app.attributes.patient?.data?.attributes;
                      const v = app.attributes.vaccine?.data?.attributes;
                      const fullName = p ? `${p.first_name} ${p.last_name}` : '[ไม่มีชื่อผู้จอง]';
                      const age = calculateAge(p?.birth_date);
                      const vaccineTitle = v?.title || '-';
                      const bookingDate = formatDateToBuddhistEra(app.attributes.bookingDate);
                      const status = app.attributes.status;
                      return (
                        <motion.tr
                          key={app.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={cn(
                            'transition-all duration-200',
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                            'hover:bg-[#F9669D]/10'
                          )}
                        >
                          <td className="px-5 py-3 font-medium text-sm text-[#30266D]" data-label="ชื่อผู้จอง">
                            {fullName}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600" data-label="อายุ">
                            {age}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600" data-label="วัคซีน">
                            {vaccineTitle}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600" data-label="วันที่นัด">
                            {bookingDate}
                          </td>
                          <td className="px-5 py-3" data-label="สถานะ">
                            <Badge
                              className={cn(
                                'text-white font-medium px-3 py-1 rounded-xl shadow-sm text-xs',
                                status === 'confirmed' ? 'bg-[#30266D]' : 'bg-[#F9669D]'
                              )}
                            >
                              {status === 'confirmed' ? 'จองแล้ว' : 'ยกเลิก'}
                            </Badge>
                          </td>
                          <td className="px-5 py-3" data-label="การจัดการ">
                            {status !== 'cancelled' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className={cn(
                                  'flex items-center gap-1.5 rounded-xl px-5 py-1.5 text-xs font-medium shadow-sm transition-all duration-300 hover:shadow-md',
                                  cancelingId === app.id ? 'opacity-60 cursor-not-allowed bg-[#F9669D]/60' : 'bg-[#F9669D] hover:bg-[#F9669D]/80'
                                )}
                                disabled={cancelingId === app.id}
                                onClick={() => handleCancel(app)}
                                aria-label={`ยกเลิกใบนัดสำหรับ ${fullName}`}
                              >
                                {cancelingId === app.id ? (
                                  <>
                                    <ArrowPathIcon className="animate-spin h-3 w-3" />
                                    กำลังยกเลิก...
                                  </>
                                ) : (
                                  <>
                                    <NoSymbolIcon className="h-3 w-3" />
                                    ยกเลิก
                                  </>
                                )}
                              </Button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}