'use client';

import React, { useEffect, useState, useMemo, forwardRef } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { motion } from 'framer-motion';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

const chartColors = ['#F9669D', '#30266D', '#10B981', '#3B82F6', '#FBBF24', '#6EE7B7'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value, percent } = payload[0].payload;
    return (
      <motion.div
        className="p-3 rounded-lg shadow-lg border border-[#30266D] bg-white text-[#30266D] font-medium select-none"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <p className="mb-1 text-sm">หมวดหมู่: {name}</p>
        <p className="mb-1 text-sm">จำนวน: {value}</p>
        {percent !== undefined && <p className="text-sm">สัดส่วน: {(percent * 100).toFixed(2)}%</p>}
      </motion.div>
    );
  }
  return null;
};

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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between text-left font-normal border rounded-xl py-3 text-base text-[#30266D] bg-white',
            !selected && 'text-[#30266D]'
          )}
          aria-label={placeholder}
        >
          <div className="flex items-center">
            {showIcon && <CalendarIcon className="mr-2 h-4 w-4 text-[#30266D]" />}
            {selected && dayjs(selected).isValid() ? (
              dayjs(selected).tz('Asia/Bangkok').format('D MMMM BBBB')
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-white border-[#30266D]">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 text-[#30266D]"
              onClick={handlePreviousMonth}
              aria-label="ที่แล้วหน้า"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            <div className="font-semibold text-center text-base text-[#30266D]">
              {monthNames[currentDate.month()]} {currentDate.add(543, 'year').year()}
            </div>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 text-[#30266D]"
              onClick={handleNextMonth}
              aria-label="เดือนถัดไป"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
          </div>
          <div className="grid grid-cols-7 text-center text-sm">
            {weekdayNames.map((day) => (
              <div key={day} className="font-semibold text-[#30266D]">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 text-center">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 w-10"></div>
            ))}
            {days.map((day) => {
              const date = dayjs(currentDate).tz('Asia/Bangkok').date(day);
              const isSelected = selected && date.isSame(selected, 'day');
              const isToday = date.isSame(dayjs().tz('Asia/Bangkok'), 'day');
              const min = minDate && dayjs(minDate).isValid() ? dayjs(minDate).tz('Asia/Bangkok').startOf('day') : null;
              const max = maxDate && dayjs(maxDate).isValid() ? dayjs(maxDate).tz('Asia/Bangkok').endOf('day') : null;
              const isBlocked = (min && date.isBefore(min, 'day')) || (max && date.isAfter(max, 'day'));

              return (
                <Button
                  key={day}
                  variant="ghost"
                  className={cn(
                    'h-10 w-10 p-0 rounded-full text-base',
                    isSelected && 'bg-[#F9669D] text-white hover:bg-[#F9669D]/80',
                    isToday && 'border-2 border-[#30266D]',
                    isBlocked && 'text-gray-500 opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => handleDateClick(day)}
                  disabled={isBlocked}
                  aria-label={`เลือกวันที่ ${day}`}
                >
                  {day}
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

DatePicker.displayName = 'DatePicker';

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth || typeof dateOfBirth !== 'string') {
    return 'ไม่ระบุ';
  }

  let birthDate = dayjs(dateOfBirth, ['YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY', 'MM-DD-YYYY'], true).tz('Asia/Bangkok');
  if (!birthDate.isValid()) {
    birthDate = dayjs(dateOfBirth).tz('Asia/Bangkok');
  }

  if (!birthDate.isValid()) {
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
    return 'ไม่ระบุ';
  }

  return age;
};

export default function StatisticsTab() {
  const [bookings, setBookings] = useState([]);
  const [filters, setFilters] = useState({
    vaccine: ['ทั้งหมด'],
    status: 'confirmed',
    startDate: null,
    endDate: null,
  });
  const [allVaccines, setAllVaccines] = useState([]);
  const [chartType, setChartType] = useState('vaccine');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [bookingRes, vaccineRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?populate[patient]=*&populate[vaccine]=*`, {
            withCredentials: true,
          }),
          axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`, {
            withCredentials: true,
          }),
        ]);

        const bookingData = bookingRes.data.data || [];
        setBookings(bookingData);
        setAllVaccines(vaccineRes.data.data?.map((v) => v.attributes.title) || []);
        setLoading(false);
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || 'ไม่สามารถดึงข้อมูลสถิติได้';
        MySwal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: errorMessage === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : errorMessage,
          icon: 'error',
          customClass: {
            popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
            title: 'text-xl font-bold text-[#30266D] mb-3',
            htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
          },
        });
        setError(errorMessage);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredBookings = useMemo(() => {
    if (!bookings.length) return [];
    return bookings.filter((b) => {
      const { attributes } = b;
      const vaccineTitle = attributes.vaccine?.data?.attributes?.title ?? 'ไม่ระบุวัคซีน';
      const bookingDay = attributes.bookingDate ? dayjs(attributes.bookingDate).tz('Asia/Bangkok') : null;
      const start = filters.startDate ? dayjs(filters.startDate).tz('Asia/Bangkok').startOf('day') : null;
      const end = filters.endDate ? dayjs(filters.endDate).tz('Asia/Bangkok').endOf('day') : null;

      const inDateRange = (!start || (bookingDay && bookingDay.isSameOrAfter(start))) && (!end || (bookingDay && bookingDay.isSameOrBefore(end)));
      const matchesVaccine = filters.vaccine.includes('ทั้งหมด') || filters.vaccine.includes(vaccineTitle);

      return matchesVaccine && attributes.status === filters.status && inDateRange;
    });
  }, [bookings, filters]);

  const countBy = (fn) =>
    filteredBookings.reduce((acc, b) => {
      const key = fn(b);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

  const toChartData = (obj) =>
    Object.entries(obj).map(([name, value]) => ({
      name,
      value,
      percent: value / Object.values(obj).reduce((sum, val) => sum + val, 0),
    }));

  const stats = useMemo(() => {
    const vaccineStats = countBy((b) => b.attributes.vaccine?.data?.attributes?.title ?? 'ไม่ระบุวัคซีน');
    const genderStats = countBy((b) => {
      const genderEng = b.attributes.patient?.data?.attributes?.gender ?? 'ไม่ระบุเพศ';
      if (genderEng === 'male') return 'ชาย';
      if (genderEng === 'female') return 'หญิง';
      return 'ไม่ระบุเพศ';
    });
    const ageStats = countBy((b) => {
      const dateOfBirth = b.attributes.patient?.data?.attributes?.birth_date;
      const age = calculateAge(dateOfBirth);
      if (age === 'ไม่ระบุ') return 'ไม่ระบุอายุ';
      const ageNum = parseInt(age, 10);
      if (ageNum <= 5) return '0-5 ปี';
      if (ageNum <= 12) return '6-12 ปี';
      if (ageNum <= 18) return '13-18 ปี';
      if (ageNum <= 30) return '19-30 ปี';
      if (ageNum <= 45) return '31-45 ปี';
      return '46 ปีขึ้นไป';
    });
    const lineStats = (() => {
      const dateStats = countBy((b) => b.attributes.bookingDate?.slice(0, 10) ?? 'ไม่ระบุวัน');
      return Object.keys(dateStats)
        .sort()
        .map((date) => ({
          date,
          'จำนวนใบนัด': dateStats[date],
        }));
    })();
    return { vaccine: vaccineStats, gender: genderStats, age: ageStats, line: lineStats };
  }, [filteredBookings]);

  const exportExcel = () => {
    if (!filteredBookings.length) {
      MySwal.fire({
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลสำหรับส่งออก',
        icon: 'warning',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      return;
    }

    setExportLoading(true);
    let data;
    let wsName = 'รายงาน';

    if (chartType === 'line') {
      data = stats.line.map((item) => ({
        วันที่: dayjs(item.date).tz('Asia/Bangkok').locale('th').format('D MMMM BBBB'),
        จำนวนใบนัด: item['จำนวนใบนัด'],
      }));
      wsName = 'รายงานรายวัน';
    } else {
      data = toChartData(stats[chartType]).map(({ name, value }) => {
        let newNameKey = '';
        let newValueKey = 'จำนวน';

        switch (chartType) {
          case 'vaccine':
            newNameKey = 'ชื่อวัคซีน';
            break;
          case 'gender':
            newNameKey = 'เพศ';
            break;
          case 'age':
            newNameKey = 'ช่วงอายุ';
            break;
          default:
            newNameKey = 'ชื่อ';
        }

        return { [newNameKey]: name, [newValueKey]: value };
      });
      wsName = `รายงาน${chartType === 'vaccine' ? 'วัคซีน' : chartType === 'gender' ? 'เพศ' : 'ช่วงอายุ'}`;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), wsName);
    saveAs(
      new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]),
      `รายงาน-${chartType === 'vaccine' ? 'วัคซีน' : chartType === 'gender' ? 'เพศ' : chartType === 'age' ? 'ช่วงอายุ' : 'รายวัน'}-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`
    );
    setExportLoading(false);
  };

  const resetFilters = () => {
    setFilters({
      vaccine: ['ทั้งหมด'],
      status: 'confirmed',
      startDate: null,
      endDate: null,
    });
    setShowFilters(false);
  };

  const renderChart = () => {
    const data = chartType === 'line' ? stats.line : toChartData(stats[chartType]);

    if (data.length === 0) {
      return (
        <motion.p
          className="text-center text-xl font-semibold text-[#30266D]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          ไม่พบข้อมูลสำหรับตัวเลือกนี้
        </motion.p>
      );
    }

    if (chartType === 'line') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={data} margin={{ top: 30, right: 20, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => {
                  const date = dayjs(d).tz('Asia/Bangkok');
                  return date.isValid() ? date.locale('th').format('D MMM BBBB') : 'ไม่ทราบวันที่';
                }}
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={{ fill: '#30266D', fontWeight: '600', fontSize: '15px' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#30266D', fontWeight: '600', fontSize: '15px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #30266D',
                  borderRadius: '8px',
                  color: '#30266D',
                }}
                labelFormatter={(d) => {
                  const date = dayjs(d).tz('Asia/Bangkok');
                  return date.isValid() ? date.locale('th').format('D MMMM BBBB') : 'ไม่ทราบวันที่';
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#30266D' }} />
              <Line
                type="monotone"
                dataKey="จำนวนใบนัด"
                stroke="#30266D"
                strokeWidth={3}
                activeDot={{ r: 8, fill: '#F9669D' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      );
    }

    if (chartType === 'vaccine' || chartType === 'gender' || chartType === 'age') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={160}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#30266D' }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-12 h-12 border-4 rounded-full border-[#F9669D] border-t-[#30266D]"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        ></motion.div>
        <p className="mt-4 text-xl font-semibold text-[#30266D]">
          กำลังโหลดข้อมูล...
        </p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="flex justify-center items-center h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-6 rounded-2xl shadow-lg bg-white border-[#30266D]">
          <p className="text-xl font-semibold text-[#30266D]">
            {error}
          </p>
        </Card>
      </motion.div>
    );
  }

  const vaccineOptions = ['ทั้งหมด', ...new Set(allVaccines)];
  const statuses = [
    { value: 'confirmed', label: 'จองแล้ว' },
    { value: 'cancelled', label: 'ยกเลิก' },
  ];

  return (
    <motion.div
      className="max-w-screen-xl mx-auto px-4 py-10 sm:px-6 bg-gray-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-4xl sm:text-5xl font-extrabold mb-10 text-center tracking-tight text-[#30266D]">
        สถิติการจองวัคซีน
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <motion.div
          className="rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center bg-[#F9669D] text-white hover:scale-105 transition-transform cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p className="text-base mb-2 opacity-80 select-none">จำนวนจองทั้งหมด</p>
          <p className="text-6xl font-extrabold tracking-wider">{bookings.filter((b) => b.attributes.status === 'confirmed').length}</p>
        </motion.div>
        <motion.div
          className="rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center bg-[#F9669D] text-white hover:scale-105 transition-transform cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-base mb-2 opacity-80 select-none">จำนวนยกเลิก</p>
          <p className="text-6xl font-extrabold tracking-wider">{bookings.filter((b) => b.attributes.status === 'cancelled').length}</p>
        </motion.div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white text-base transition-all duration-300 transform hover:scale-105',
              showFilters ? 'bg-[#30266D] hover:bg-[#30266D]/80 shadow-lg' : 'bg-[#F9669D] hover:bg-[#F9669D]/80 shadow-lg'
            )}
            onClick={() => setShowFilters(!showFilters)}
            aria-label={showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
          >
            {showFilters ? <XMarkIcon className="h-5 w-5" /> : <FunnelIcon className="h-5 w-5" />}
            {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
          </Button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            onClick={exportExcel}
            className="w-full sm:w-auto rounded-full bg-[#F9669D] text-white font-semibold py-3 px-8 shadow-md text-base transition-all duration-300 hover:bg-[#F9669D]/80 disabled:opacity-50"
            disabled={exportLoading}
            aria-label="ส่งออกข้อมูลเป็น Excel"
          >
            {exportLoading ? (
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-5 h-5 border-2 rounded-full border-white border-t-[#30266D]"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                ></motion.div>
                กำลังส่งออก...
              </div>
            ) : (
              'ดาวน์โหลด Excel'
            )}
          </Button>
        </motion.div>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-2xl rounded-2xl mb-8 bg-white border-[#30266D]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold text-[#30266D]">
                  ตัวกรองการค้นหา
                </CardTitle>
                <Button
                  variant="ghost"
                  className="text-base font-semibold text-[#F9669D]"
                  onClick={resetFilters}
                  aria-label="รีเซ็ตตัวกรอง"
                >
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  รีเซ็ต
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
              <div>
                <label className="block text-base font-semibold mb-2 text-[#30266D]">
                  วัคซีน
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-left font-normal rounded-xl py-3 text-base bg-white border-[#30266D] text-[#30266D]"
                      aria-label="เลือกวัคซีน"
                    >
                      <span className="truncate">
                        {filters.vaccine.length === 0
                          ? 'เลือกวัคซีน'
                          : filters.vaccine.includes('ทั้งหมด')
                          ? 'ทั้งหมด'
                          : filters.vaccine.join(', ')}
                      </span>
                      <ChevronDownIcon className="ml-2 h-4 w-4 text-[#30266D]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 z-50 bg-white border-[#30266D]">
                    <Command>
                      <CommandInput
                        placeholder="ค้นหาวัคซีน..."
                        className="text-[#30266D] border-[#30266D]"
                      />
                      <CommandList>
                        <CommandEmpty className="text-[#30266D]">ไม่พบวัคซีน</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => setFilters((prev) => ({ ...prev, vaccine: ['ทั้งหมด'] }))}
                            className="cursor-pointer hover:bg-[#F9669D]/10 text-[#30266D]"
                          >
                            <span>ทั้งหมด</span>
                          </CommandItem>
                          {vaccineOptions
                            .filter((v) => v !== 'ทั้งหมด')
                            .map((vaccine) => (
                              <CommandItem
                                key={vaccine}
                                onSelect={() =>
                                  setFilters((prev) => {
                                    const newVaccines = prev.vaccine.includes(vaccine)
                                      ? prev.vaccine.filter((v) => v !== vaccine)
                                      : [...prev.vaccine.filter((v) => v !== 'ทั้งหมด'), vaccine];
                                    return {
                                      ...prev,
                                      vaccine: newVaccines.length === 0 ? ['ทั้งหมด'] : newVaccines,
                                    };
                                  })
                                }
                                className="cursor-pointer hover:bg-[#F9669D]/10 text-[#30266D]"
                              >
                                <input
                                  type="checkbox"
                                  checked={filters.vaccine.includes(vaccine)}
                                  onChange={() => {}}
                                  className="mr-2 h-4 w-4 accent-[#F9669D]"
                                />
                                {vaccine}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-base font-semibold mb-2 text-[#30266D]">
                  สถานะ
                </label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger className="w-full rounded-xl py-3 bg-white border-[#30266D] text-[#30266D]">
                    <SelectValue placeholder="เลือกสถานะ" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#30266D]">
                    {statuses.map((status) => (
                      <SelectItem
                        key={status.value}
                        value={status.value}
                        className="hover:bg-[#F9669D]/10 text-[#30266D]"
                      >
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-base font-semibold mb-2 text-[#30266D]">
                  จากวันที่
                </label>
                <div className="relative">
                  <DatePicker
                    selected={filters.startDate}
                    onSelect={(date) => setFilters({ ...filters, startDate: date })}
                    placeholder="วัน เดือน ปี"
                    maxDate={filters.endDate}
                    showIcon={true}
                  />
                  {filters.startDate && (
                    <button
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, startDate: null }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#F9669D]"
                      aria-label="ล้างวันที่เริ่มต้น"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-base font-semibold mb-2 text-[#30266D]">
                  ถึงวันที่
                </label>
                <div className="relative">
                  <DatePicker
                    selected={filters.endDate}
                    onSelect={(date) => setFilters({ ...filters, endDate: date })}
                    placeholder="วัน เดือน ปี"
                    minDate={filters.startDate}
                    showIcon={true}
                  />
                  {filters.endDate && (
                    <button
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, endDate: null }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#F9669D]"
                      aria-label="ล้างวันที่สิ้นสุด"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex flex-wrap justify-center gap-4 mb-8 select-none">
        {[
          ['vaccine', 'วัคซีน'],
          ['gender', 'เพศ'],
          ['age', 'อายุ'],
          ['line', 'รายวัน'],
        ].map(([key, label]) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              onClick={() => setChartType(key)}
              className={cn(
                'rounded-full px-6 py-3 font-semibold text-base shadow-md transition-all duration-300',
                chartType === key
                  ? 'bg-[#30266D] text-white hover:bg-[#30266D]/80 border-[#30266D]'
                  : 'bg-white text-[#30266D] hover:bg-[#F9669D] hover:text-white border-[#F9669D]'
              )}
              aria-label={`แสดงแผนภูมิ${label}`}
            >
              {label}
            </Button>
          </motion.div>
        ))}
      </div>

      {(chartType || filters.vaccine.length > 1 || (filters.vaccine.length === 1 && filters.vaccine[0] !== 'ทั้งหมด') || filters.startDate || filters.endDate) && (
        <motion.div
          className="flex flex-wrap justify-center items-center gap-4 font-semibold text-base mb-8 select-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {filters.vaccine.length > 1 || (filters.vaccine.length === 1 && filters.vaccine[0] !== 'ทั้งหมด') && (
            <p className="text-[#30266D]">
              วัคซีน:{' '}
              <span className="inline-block px-4 py-1 rounded-full shadow-sm bg-[#F9669D]/10 text-[#30266D]">
                {filters.vaccine.includes('ทั้งหมด') ? 'ทั้งหมด' : filters.vaccine.join(', ')}
              </span>
            </p>
          )}
          <p className="text-[#30266D]">
            สถานะ:{' '}
            <span className="inline-block px-4 py-1 rounded-full shadow-sm bg-[#F9669D]/10 text-[#30266D]">
              {statuses.find((s) => s.value === filters.status)?.label}
            </span>
          </p>
          {(filters.startDate || filters.endDate) && (
            <p className="text-[#30266D]">
              ช่วงวันที่:{' '}
              <span className="inline-block px-4 py-1 rounded-full shadow-sm bg-[#F9669D]/10 text-[#30266D]">
                {filters.startDate ? dayjs(filters.startDate).tz('Asia/Bangkok').format('D MMM BBBB') : 'ไม่ระบุ'} -{' '}
                {filters.endDate ? dayjs(filters.endDate).tz('Asia/Bangkok').format('D MMM BBBB') : 'ไม่ระบุ'}
              </span>
            </p>
          )}
        </motion.div>
      )}

      <motion.div
        className="p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {renderChart()}
      </motion.div>
    </motion.div>
  );
}