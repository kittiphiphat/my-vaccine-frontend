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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faCalendar,
  faXmark,
  faFilter,
  faMagnifyingGlass,
  faChevronUp,
  faArrowRotateRight,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
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
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

const chartColors = [
  '#FF6B6B', // Coral
  '#4ECDC4', // Teal
  '#FFD93D', // Yellow
  '#FF4C4C', // Red
  '#A9A9A9', // Gray
  '#6A5ACD', // Purple
];

const CustomTooltip = ({ active, payload, label, chartType }) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0].payload;
    const total = Object.values(payload.reduce((acc, p) => {
      acc[p.dataKey] = (acc[p.dataKey] || 0) + p.value;
      return acc;
    }, {})).reduce((sum, val) => sum + val, 0);
    const percent = total ? (value / total) * 100 : 0;

    return (
      <motion.div
        className="p-4 rounded-[var(--radius)] shadow-lg border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] font-medium select-none"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {chartType === 'line' ? (
          <>
            <p className="mb-2 text-sm font-semibold text-[var(--primary)]">
              วันที่: {dayjs(label).tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}
            </p>
            <p className="mb-2 text-sm font-semibold text-[var(--card-foreground)]">
              จำนวนใบนัด: {value}
            </p>
          </>
        ) : (
          <>
            <p className="mb-2 text-sm font-semibold text-[var(--primary)]">หมวดหมู่: {name}</p>
            <p className="mb-2 text-sm font-semibold text-[var(--card-foreground)]">จำนวน: {value}</p>
            <p className="text-sm font-semibold text-[var(--card-foreground)]">สัดส่วน: {percent.toFixed(2)}%</p>
          </>
        )}
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

  const handleClear = (e) => {
    e.stopPropagation(); // Prevent opening popover when clicking clear
    onSelect(null);
  };

  return (
    <div className="relative w-full">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.button
            variant="outline"
            className={cn(
              'w-full flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-[var(--ring)] transition-all duration-300 pr-10' // Extra padding for icons
            )}
            aria-label={placeholder}
            whilehover={{ scale: 1.02 }}
            whiletap={{ scale: 0.98 }}
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
            whilehover={{ scale: 1.1 }}
            whiletap={{ scale: 0.9 }}
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
              whilehover={{ scale: 1.1 }}
              whiletap={{ scale: 0.9 }}
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
              whilehover={{ scale: 1.1 }}
              whiletap={{ scale: 0.9 }}
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
                    isSelected ? 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90' : 
                    isToday ? 'border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--card)]/90' : 
                    isBlocked ? 'text-[var(--muted-foreground)] opacity-50 cursor-not-allowed' : 
                    'hover:bg-[var(--muted)]'
                  )}
                  disabled={isBlocked}
                  aria-label={`Select date ${day}`}
                  whilehover={{ scale: 1.1 }}
                  whiletap={{ scale: 0.9 }}
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
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('jwt');
        if (!token) {
          throw new Error('Unauthorized');
        }
        const [bookingRes, vaccineRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?populate[vaccine]=*&populate[patient]=*`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
              Expires: '0',
            },
            timeout: 5000,
          }),
          axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
              Expires: '0',
            },
            timeout: 5000,
          }),
        ]);

        const bookingData = bookingRes.data.data || [];
        const normalizedBookings = bookingData.map(app => ({
          id: app.id,
          attributes: {
            bookingDate: app.bookingDate || app.attributes?.bookingDate,
            startTime: app.startTime || app.attributes?.startTime,
            endTime: app.endTime || app.attributes?.endTime,
            booking_status: app.booking_status || app.attributes?.booking_status || 'confirmed',
            vaccination_status: app.vaccination_status || app.attributes?.vaccination_status || 'not_started',
            vaccine: app.vaccine
              ? { data: { id: app.vaccine.id, attributes: app.vaccine } }
              : app.attributes?.vaccine || null,
            patient: app.patient
              ? { data: { id: app.patient.id, attributes: app.patient } }
              : app.attributes?.patient || null,
          },
        }));
        setBookings(normalizedBookings);
        setAllVaccines(vaccineRes.data.data?.map((v) => v.attributes?.title || v.title) || []);
        setLoading(false);
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || 'ไม่สามารถดึงข้อมูลสถิติได้';
        MySwal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: errorMessage === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : errorMessage,
          icon: 'error',
          customClass: {
            popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
            title: 'text-lg font-semibold text-[var(--card-foreground)]',
            htmlContainer: 'text-sm text-[var(--muted-foreground)]',
            confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
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
      const patientName = attributes.patient?.data?.attributes
        ? `${attributes.patient.data.attributes.first_name} ${attributes.patient.data.attributes.last_name}`
        : '';

      const inDateRange = (!start || (bookingDay && bookingDay.isSameOrAfter(start))) && (!end || (bookingDay && bookingDay.isSameOrBefore(end)));
      const matchesVaccine = filters.vaccine.includes('ทั้งหมด') || filters.vaccine.includes(vaccineTitle);
      const matchesStatus = attributes.booking_status === filters.status;
      const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesVaccine && matchesStatus && inDateRange && matchesSearch;
    });
  }, [bookings, filters, searchTerm]);

  const countBy = (fn) =>
    filteredBookings.reduce((acc, b) => {
      const key = fn(b);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

  const toChartData = (obj) =>
    Object.entries(obj).map(([name, value]) => {
      const total = Object.values(obj).reduce((sum, val) => sum + val, 0);
      const percent = total > 0 ? (value / total) * 100 : 0;
      return {
        name,
        value,
        percent: percent.toFixed(2),
      };
    });

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
        .map((date, index) => ({
          key: `${date}-${index}`,
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
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
      });
      return;
    }

    setExportLoading(true);

    const wb = XLSX.utils.book_new();

    const vaccineData = toChartData(stats.vaccine).map(({ name, value, percent }) => ({
      'ชื่อวัคซีน': name,
      'จำนวน': value,
      'สัดส่วน (%)': percent,
    }));
    if (vaccineData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vaccineData), 'รายงานวัคซีน');
    }

    const genderData = toChartData(stats.gender).map(({ name, value, percent }) => ({
      'เพศ': name,
      'จำนวน': value,
      'สัดส่วน (%)': percent,
    }));
    if (genderData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(genderData), 'รายงานเพศ');
    }

    const ageData = toChartData(stats.age).map(({ name, value, percent }) => ({
      'ช่วงอายุ': name,
      'จำนวน': value,
      'สัดส่วน (%)': percent,
    }));
    if (ageData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ageData), 'รายงานช่วงอายุ');
    }

    const dailyData = stats.line.map((item) => ({
      'วันที่': dayjs(item.date).tz('Asia/Bangkok').locale('th').format('D MMMM BBBB'),
      'จำนวนใบนัด': item['จำนวนใบนัด'],
    }));
    if (dailyData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyData), 'รายงานรายวัน');
    }

    if (Object.keys(wb.Sheets).length === 0) {
      MySwal.fire({
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลสำหรับส่งออก',
        icon: 'warning',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
      });
      setExportLoading(false);
      return;
    }

    saveAs(
      new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]),
      `รายงานสถิติทั้งหมด-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`
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
    setSearchTerm('');
    setShowFilters(false);
  };

  const renderChart = () => {
    const data = chartType === 'line' ? stats.line : toChartData(stats[chartType]);

    if (data.length === 0) {
      return (
        <motion.p
          className="text-center text-sm text-[var(--muted-foreground)]"
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
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
                tick={{ fill: 'var(--card-foreground)', fontWeight: '600', fontSize: '12px' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--card-foreground)', fontWeight: '600', fontSize: '12px' }}
              />
              <Tooltip
                content={<CustomTooltip chartType={chartType} />}
                labelFormatter={(d) => {
                  const date = dayjs(d).tz('Asia/Bangkok');
                  return date.isValid() ? date.locale('th').format('D MMMM BBBB') : 'ไม่ทราบวันที่';
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ color: 'var(--card-foreground)' }} />
              <Line
                type="monotone"
                dataKey="จำนวนใบนัด"
                stroke="var(--primary)"
                strokeWidth={3}
                activeDot={{ r: 8, fill: chartColors[0] }}
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
                label={({ name, value, percent }) => `${name} (${value} - ${percent}%)`}
              >
                {data.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip chartType={chartType} />} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--card-foreground)' }} />
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

  if (error) {
    return (
      <motion.div
        className="flex justify-center items-center h-screen bg-[var(--background)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-6 rounded-[var(--radius)] shadow-lg border border-[var(--border)] bg-[var(--card)]">
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
        </Card>
      </motion.div>
    );
  }

  const vaccineOptions = ['ทั้งหมด', ...new Set(allVaccines)];
  const statuses = [
    { value: 'confirmed', label: 'จองแล้ว' },
    { value: 'cancelled', label: 'ยกเลิก' },
  ].map((status, index) => ({ ...status, key: `${status.value}-${index}` }));

  const activeFiltersCount = [
    searchTerm,
    !filters.vaccine.includes('ทั้งหมด'),
    filters.status !== 'confirmed',
    filters.startDate,
    filters.endDate,
  ].filter(Boolean).length;

  return (
    <motion.div
      className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-prompt"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--primary)] mb-2">สถิติการจองวัคซีน</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          ข้อมูล ณ วันที่ {dayjs().tz('Asia/Bangkok').format('D MMMM BBBB')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <motion.div
            className="p-6 rounded-[var(--radius)] shadow-lg border border-[var(--border)] bg-[var(--card)] text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whilehover={{ scale: 1.02 }}
          >
            <p className="text-sm text-[var(--muted-foreground)] mb-2">จำนวนจองทั้งหมด</p>
            <p className="text-3xl font-bold text-[var(--card-foreground)]">{bookings.filter((b) => b.attributes.booking_status === 'confirmed').length}</p>
          </motion.div>
          <motion.div
            className="p-6 rounded-[var(--radius)] shadow-lg border border-[var(--border)] bg-[var(--card)] text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whilehover={{ scale: 1.02 }}
          >
            <p className="text-sm text-[var(--muted-foreground)] mb-2">จำนวนยกเลิก</p>
            <p className="text-3xl font-bold text-[var(--card-foreground)]">{bookings.filter((b) => b.attributes.booking_status === 'cancelled').length}</p>
          </motion.div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 sm:mb-8">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="ค้นหาชื่อ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-2 text-xs sm:text-sm font-medium bg-[var(--card)] border-[var(--border)]/20 rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] transition-all duration-200 shadow-sm w-full"
              aria-label="ค้นหาชื่อ"
            />
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary)]"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
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
              className="flex justify-between items-center w-full sm:w-auto p-2 cursor-pointer bg-[var(--card)] border-[var(--border)]/20 hover:bg-[var(--primary)]/5 transition-all duration-200 rounded-[var(--radius)] shadow-sm"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="filter-panel-content"
            >
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faFilter} className="h-4 w-4 text-[var(--primary)]" />
                <span className="text-xs sm:text-sm font-medium text-[var(--card-foreground)]">ตัวกรอง</span>
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
                <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-[var(--card-foreground)] mb-1">วัคซีน</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <motion.button
                          className="w-full flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] text-[var(--card-foreground)] px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-[var(--ring)] transition-all duration-300"
                          aria-label="Select vaccine"
                          whilehover={{ scale: 1.02 }}
                          whiletap={{ scale: 0.98 }}
                        >
                          <span className="truncate">
                            {filters.vaccine.length === 0
                              ? 'เลือกวัคซีน'
                              : filters.vaccine.includes('ทั้งหมด')
                              ? 'ทั้งหมด'
                              : filters.vaccine.join(', ')}
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
                                key="all"
                                onSelect={() => setFilters((prev) => ({ ...prev, vaccine: ['ทั้งหมด'] }))}
                                className="cursor-pointer hover:bg-[var(--muted)] text-[var(--card-foreground)]"
                              >
                                <span>ทั้งหมด</span>
                              </CommandItem>
                              {vaccineOptions
                                .filter((v) => v !== 'ทั้งหมด')
                                .map((vaccine, index) => (
                                  <CommandItem
                                    key={`${vaccine}-${index}`}
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
                                    className="cursor-pointer hover:bg-[var(--muted)] text-[var(--card-foreground)]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={filters.vaccine.includes(vaccine)}
                                      onChange={() => {}}
                                      className="mr-2 h-4 w-4 accent-[var(--primary)]"
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
                    <label className="block text-xs sm:text-sm font-medium text-[var(--card-foreground)] mb-1">สถานะ</label>
                    <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                      <SelectTrigger
                        className="text-xs sm:text-sm font-medium bg-[var(--card)] border-[var(--border)]/20 rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] py-1.5 px-2 shadow-sm w-full"
                        aria-label="เลือกสถานะ"
                      >
                        <SelectValue placeholder="เลือกสถานะ" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border-[var(--border)]/20 rounded-[var(--radius)] shadow-md z-30">
                        {statuses.map((status) => (
                          <SelectItem key={status.key} value={status.value} className="text-xs sm:text-sm">
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-[var(--card-foreground)] mb-1">จากวันที่</label>
                    <DatePicker
                      selected={filters.startDate}
                      onSelect={(date) => setFilters({ ...filters, startDate: date })}
                      placeholder="วัน เดือน ปี"
                      maxDate={filters.endDate}
                      showIcon={true}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-[var(--card-foreground)] mb-1">ถึงวันที่</label>
                    <DatePicker
                      selected={filters.endDate}
                      onSelect={(date) => setFilters({ ...filters, endDate: date })}
                      placeholder="วัน เดือน ปี"
                      minDate={filters.startDate}
                      showIcon={true}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="w-full bg-[var(--card)] text-[var(--primary)] border-[var(--border)]/20 hover:bg-[var(--primary)]/10 rounded-[var(--radius)] py-2 sm:py-3 text-xs sm:text-sm shadow-sm"
                  >
                    <FontAwesomeIcon icon={faArrowRotateRight} className="w-4 h-4 mr-2" />
                    รีเซ็ตตัวกรอง
                  </Button>
                </CardContent>
              </motion.div>
            )}
          </div>
          <motion.div whilehover={{ scale: 1.05 }} whiletap={{ scale: 0.95 }}>
            <Button
              onClick={exportExcel}
              className="w-full sm:w-auto px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] font-semibold text-base hover:bg-[var(--primary)]/80 transition-all duration-300"
              disabled={exportLoading}
              aria-label="ดาวน์โหลด Excel"
            >
              <FontAwesomeIcon icon={faDownload} className="w-5 h-5 mr-2" /> ดาวน์โหลด Excel
            </Button>
          </motion.div>
        </div>

        <Card className="mt-6 p-6 rounded-[var(--radius)] shadow-lg border border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <CardTitle className="text-lg font-semibold text-[var(--primary)]">
                {chartType === 'vaccine' ? 'สถิติวัคซีน' : chartType === 'gender' ? 'สถิติเพศ' : chartType === 'age' ? 'สถิติช่วงอายุ' : 'สถิติรายวัน'}
              </CardTitle>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-full sm:w-[180px] text-sm bg-[var(--input)] border-[var(--border)] text-[var(--card-foreground)] rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--ring)] shadow-sm">
                  <SelectValue placeholder="เลือกประเภทกราฟ" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border-[var(--border)] text-[var(--card-foreground)] rounded-[var(--radius)] shadow-sm">
                  <SelectItem value="vaccine" className="hover:bg-[var(--muted)] font-prompt">วัคซีน</SelectItem>
                  <SelectItem value="gender" className="hover:bg-[var(--muted)] font-prompt">เพศ</SelectItem>
                  <SelectItem value="age" className="hover:bg-[var(--muted)] font-prompt">ช่วงอายุ</SelectItem>
                  <SelectItem value="line" className="hover:bg-[var(--muted)] font-prompt">วัน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {renderChart()}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}