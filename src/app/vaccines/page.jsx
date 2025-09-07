'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'dayjs/locale/th';
import { useRouter } from 'next/navigation';
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.locale('th');

const MySwal = withReactContent(Swal);

const dayMapShort = {
  0: 'อาทิตย์',
  1: 'จันทร์',
  2: 'อังคาร',
  3: 'พุธ',
  4: 'พฤหัส',
  5: 'ศุกร์',
  6: 'เสาร์',
};

export default function VaccineList() {
  const [patient, setPatient] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buttonLoading, setButtonLoading] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [ageMinFilter, setAgeMinFilter] = useState('');
  const [ageMaxFilter, setAgeMaxFilter] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  const [genderFilter, setGenderFilter] = useState('any');
  const [showFilters, setShowFilters] = useState(false);

  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const router = useRouter();
  const socketRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
        credentials: 'include',
        cache: 'force-cache',
      });
      const user = await userRes.json();
      const userId = user?.id || user?.data?.id;

      if (!userId) {
        router.push('/login');
        return;
      }

      const patientRes = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients?filters[user][id][$eq]=${userId}&populate=user`,
        { credentials: 'include', cache: 'force-cache' }
      );
      const pData = await patientRes.json();

      if (!pData?.data || pData.data.length === 0) {
        router.push('/patient');
        return;
      }

      const pat = pData.data[0];

      if (pat.attributes.status === 'cancelled') {
        await MySwal.fire({
          icon: 'error',
          title: 'ข้อมูลถูกลบ',
          text: 'ข้อมูลผู้ป่วยของคุณถูกลบ โปรดติดต่อเจ้าหน้าที่เพื่อดำเนินการต่อ',
          confirmButtonText: 'ยืนยัน',
          customClass: {
            popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border-[#F9669D]/50 p-6',
            title: 'text-lg font-bold text-[#30266D] mb-3',
            htmlContainer: 'text-sm text-[#4B5563] font-medium mb-4',
            confirmButton: 'bg-[#30266D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80',
          },
        });
        setLoading(false);
        return;
      }

      const birthDate = pat.attributes.birth_date;
      const age = birthDate ? dayjs().diff(dayjs(birthDate), 'year') : 0;
      let gender = (pat.attributes.gender || 'any').toLowerCase();
      if (!['male', 'female'].includes(gender)) gender = 'any';

      setPatient({ id: pat.id, age, gender });

      const vacRes = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?populate[booking_settings]=name,max_quota&populate[vaccine_service_days]=day&populate[vaccine_time_slots]=time&pagination[pageSize]=50`,
        { credentials: 'include', cache: 'force-cache' }
      );
      const vacJson = await vacRes.json();

      const vacs = vacJson.data.map((v) => {
        const a = v.attributes;
        let serviceDays = [];

        if (Array.isArray(a.vaccine_service_days?.data)) {
          a.vaccine_service_days.data.forEach((dayObj) => {
            const days = [].concat(dayObj.attributes?.day_of_week || []);
            serviceDays.push(...days.map(Number).filter((d) => !isNaN(d)));
          });
          serviceDays = [...new Set(serviceDays)];
        }

        const formatTime = (t) => (typeof t === 'string' && t.length >= 5 ? t.slice(0, 5) : '-');

        let vaccineGender = (a.gender || 'any').toLowerCase();
        if (!['male', 'female'].includes(vaccineGender)) vaccineGender = 'any';

        const bs = a.booking_settings?.data?.[0]?.attributes ?? {};

        const timeSlots = a.vaccine_time_slots?.data?.map((slot) => ({
          startTime: slot.attributes.startTime,
          endTime: slot.attributes.endTime,
          quota: slot.attributes.quota,
          is_enabled: slot.attributes.is_enabled,
        })) ?? [];

        return {
          id: v.id,
          name: a.title || '-',
          description: a.description || '',
          bookingStart: a.bookingStartDate ? dayjs(a.bookingStartDate) : dayjs('1900-01-01'),
          bookingEnd: a.bookingEndDate ? dayjs(a.bookingEndDate) : dayjs('2999-12-31'),
          min_age: a.minAge ?? 0,
          max_age: a.maxAge ?? 100,
          gender: vaccineGender,
          max_quota: a.maxQuota ?? Infinity,
          booked: a.booked ?? 0,
          serviceDays,
          serviceStartTime: formatTime(a.serviceStartTime),
          serviceEndTime: formatTime(a.serviceEndTime),
          bookingSetting: {
            is_enabled: bs.is_enabled ?? false,
            advanceBookingDays: bs.advanceBookingDays ?? 30,
            preventLastMinuteMinutes: bs.preventLastMinuteMinutes ?? 0,
          },
          useTimeSlots: a.useTimeSlots ?? false,
          timeSlots,
        };
      });

      setVaccines(vacs);
    } catch (error) {
      await MySwal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลวัคซีนได้ กรุณาลองใหม่',
        confirmButtonText: 'ยืนยัน',
        customClass: {
          popup: 'bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border-[#F9669D]/50 p-6',
          title: 'text-lg font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-sm text-[#4B5563] font-medium mb-4',
          confirmButton: 'bg-[#30266D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80',
        },
      });
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const socketUrl = typeof window !== 'undefined' ? 'http://localhost:4000' : 'http://strapi:4000';
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('vaccine_updated', loadData);

    return () => {
      socketRef.current.off('vaccine_updated', loadData);
      socketRef.current.disconnect();
    };
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isAvailable = (v) => {
    const now = dayjs();
    const bs = v.bookingSetting || {};
    const remaining = Math.max(v.max_quota - v.booked, 0);

    if (!bs.is_enabled) return false;

    const advanceStartDate = v.bookingStart.subtract(bs.advanceBookingDays || 0, 'day').startOf('day');

    if (!now.isSameOrAfter(advanceStartDate) || !now.isSameOrBefore(v.bookingEnd.endOf('day'))) return false;

    if (remaining <= 0) return false;

    if (!now.isSameOrAfter(v.bookingStart.startOf('day'))) return true;

    const [sh, sm] = (v.serviceStartTime || '00:00').split(':').map(Number);
    const [eh, em] = (v.serviceEndTime || '23:59').split(':').map(Number);
    const startTime = now.clone().hour(sh).minute(sm).second(0);
    const endTime = now.clone().hour(eh).minute(em).second(59);

    if (!now.isSameOrAfter(startTime) || !now.isSameOrBefore(endTime)) return false;

    const preventMins = bs.preventLastMinuteMinutes || 0;
    const lastMinuteCutoff = endTime.subtract(preventMins, 'minute');

    if (now.isAfter(lastMinuteCutoff)) return false;

    return true;
  };

  const handleBookVaccine = (vaccineId) => {
    if (buttonLoading[vaccineId]) return;

    setButtonLoading((prev) => ({ ...prev, [vaccineId]: true }));
    setTimeout(() => {
      router.push(`/vaccines/${vaccineId}`);
      setButtonLoading((prev) => ({ ...prev, [vaccineId]: false }));
    }, 300);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortData = (data) => {
    return [...data].sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  };

  const paginatedData = (data) => {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setAgeMinFilter('');
    setAgeMaxFilter('');
    setSelectedWeekdays([]);
    setGenderFilter('any');
    setShowFilters(false);
  };

  useEffect(() => {
    if (!patient) return setFiltered([]);

    const term = searchTerm.trim().toLowerCase();
    const minAge = ageMinFilter ? +ageMinFilter : null;
    const maxAge = ageMaxFilter ? +ageMaxFilter : null;

    const arr = vaccines.filter((v) => {
      const matchPatientAge = patient.age >= v.min_age && patient.age <= v.max_age;
      const matchPatientGender = v.gender === 'any' || v.gender === patient.gender;
      const matchSearch =
        v.name.toLowerCase().includes(term) || v.description.toLowerCase().includes(term);

      const ageOverlap =
        minAge !== null && maxAge !== null
          ? !(v.max_age < minAge || v.min_age > maxAge)
          : minAge !== null
          ? v.max_age >= minAge
          : maxAge !== null
          ? v.min_age <= maxAge
          : true;

      const weekdayMatch =
        selectedWeekdays.length === 0 || selectedWeekdays.some((d) => v.serviceDays.includes(d));
      const genderMatch = genderFilter === 'any' || v.gender === 'any' || v.gender === genderFilter;

      return matchPatientAge && matchPatientGender && matchSearch && ageOverlap && weekdayMatch && genderMatch;
    });

    setFiltered(arr);
    setCurrentPage(1);
  }, [vaccines, patient, searchTerm, ageMinFilter, ageMaxFilter, selectedWeekdays, genderFilter]);

  const availableVaccines = filtered.filter(isAvailable);
  const sorted = sortData(availableVaccines);
  const paged = paginatedData(sorted);
  const totalPages = Math.ceil(sorted.length / itemsPerPage);

  if (loading) {
    return (
      <motion.main
        className="max-w-7xl mx-auto p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center justify-center h-screen">
          <motion.div
            className="w-12 h-12 border-4 rounded-full"
            style={{ borderColor: '#F9669D/50', borderTopColor: '#30266D' }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          ></motion.div>
          <p className="mt-4 text-lg font-semibold" style={{ color: '#30266D' }}>
            กำลังโหลดข้อมูล...
          </p>
        </div>
      </motion.main>
    );
  }

  return (
    <motion.main
      className="max-w-7xl mx-auto p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-bold mb-6 text-center sm:text-left" style={{ color: '#30266D' }}>
        รายการวัคซีน
      </h1>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <motion.div
          className="w-full sm:w-full"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Input
            type="text"
            placeholder="ค้นหาวัคซีน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-[#F9669D] focus:border-[#F9669D]"
            style={{ borderColor: '#F9669D/50', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#1F2937' }}
            aria-label="ค้นหาวัคซีน"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-3 rounded-xl flex items-center gap-2 shadow-md transition-all hover:bg-[#30266D]/80"
            style={{ backgroundColor: '#30266D', color: '#FFFFFF' }}
            aria-label={showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
          >
            {showFilters ? <XMarkIcon className="h-5 w-5" /> : <FunnelIcon className="h-5 w-5" />}
            {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
          </Button>
        </motion.div>
      </div>

      {error && (
        <motion.div
          role="alert"
          className="mb-6 p-4 rounded-xl shadow-lg"
          style={{ backgroundColor: '#FEE2E2', borderColor: '#DC2626/50', color: '#DC2626' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          aria-live="assertive"
        >
          {error}
        </motion.div>
      )}

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card
            className="p-6 rounded-xl shadow-lg mb-8"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#F9669D/50' }}
          >
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold" style={{ color: '#30266D' }}>
                  ตัวกรองการค้นหา
                </CardTitle>
                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  className="text-sm font-semibold"
                  style={{ color: '#F9669D' }}
                  aria-label="รีเซ็ตตัวกรอง"
                >
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  รีเซ็ต
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1F2937' }}>
                  อายุต่ำสุด
                </label>
                <Input
                  type="number"
                  placeholder="อายุต่ำสุด"
                  value={ageMinFilter}
                  onChange={(e) => setAgeMinFilter(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#F9669D] focus:border-[#F9669D]"
                  style={{ borderColor: '#F9669D/50', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#1F2937' }}
                  aria-label="อายุต่ำสุด"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1F2937' }}>
                  อายุสูงสุด
                </label>
                <Input
                  type="number"
                  placeholder="อายุสูงสุด"
                  value={ageMaxFilter}
                  onChange={(e) => setAgeMaxFilter(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#F9669D] focus:border-[#F9669D]"
                  style={{ borderColor: '#F9669D/50', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#1F2937' }}
                  aria-label="อายุสูงสุด"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1F2937' }}>
                  เพศ
                </label>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#F9669D]"
                    style={{ borderColor: '#F9669D/50', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#1F2937' }}
                  >
                    <SelectValue placeholder="เลือกเพศ" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#F9669D/50' }}>
                    <SelectItem value="any">ทุกเพศ</SelectItem>
                    <SelectItem value="male">ชาย</SelectItem>
                    <SelectItem value="female">หญิง</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1F2937' }}>
                  วันให้บริการ
                </label>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(dayMapShort).map(([num, label]) => (
                    <label
                      key={num}
                      className="flex items-center gap-2 select-none text-[#1F2937] cursor-pointer"
                      aria-checked={selectedWeekdays.includes(+num)}
                      role="checkbox"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          const val = +num;
                          setSelectedWeekdays((prev) =>
                            prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
                          );
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        value={num}
                        checked={selectedWeekdays.includes(+num)}
                        onChange={(e) => {
                          const val = +e.target.value;
                          setSelectedWeekdays((prev) =>
                            e.target.checked ? [...prev, val] : prev.filter((d) => d !== val)
                          );
                        }}
                        className="h-4 w-4"
                        style={{ accentColor: '#F9669D' }}
                        aria-label={`เลือกวัน${label}`}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center text-sm mb-6" style={{ color: '#4B5563' }}>
        <p>พบทั้งหมด {availableVaccines.length} รายการ</p>
        <Button
          variant="ghost"
          onClick={() => toggleSort('name')}
          className="flex items-center gap-1 transition-colors hover:text-[#30266D]"
          aria-label={`เรียงตามชื่อ ${sortOrder === 'asc' ? 'จากน้อยไปมาก' : 'จากมากไปน้อย'}`}
        >
          เรียงตามชื่อ {sortOrder === 'asc' ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
        </Button>
      </div>

      {availableVaccines.length === 0 ? (
        <motion.p
          className="text-center text-lg"
          style={{ color: '#4B5563' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          ไม่พบวัคซีนที่ตรงกับเงื่อนไข
        </motion.p>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((v) => {
            const remaining = Math.max(v.max_quota - v.booked, 0);
            const serviceDaysText = v.serviceDays.length
              ? v.serviceDays
                  .sort((a, b) => a - b)
                  .map((d) => dayMapShort[d] || `วันไม่รู้จัก (${d})`)
                  .join(', ')
              : 'ไม่ระบุวันให้บริการ';
            return (
              <motion.div
                key={v.id}
                className="border-l-4 p-6 rounded-xl shadow-lg flex flex-col min-h-[320px] hover:shadow-xl transition-all duration-300"
                style={{ borderColor: '#30266D', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold mb-3 line-clamp-1" style={{ color: '#30266D' }}>
                  {v.name}
                </h2>
                <p className="text-base mb-5 line-clamp-4 flex-grow" style={{ color: '#4B5563' }}>
                  {v.description}
                </p>
                <div className="text-sm space-y-2 mb-6 leading-relaxed" style={{ color: '#4B5563' }}>
                  <p>
                    <span className="font-semibold" style={{ color: '#30266D' }}>เปิดจอง:</span>{' '}
                    {v.bookingStart.format('D MMM')} {v.bookingStart.year() + 543} –{' '}
                    {v.bookingEnd.format('D MMM')} {v.bookingEnd.year() + 543}
                  </p>
                  <p>
                    <span className="font-semibold" style={{ color: '#30266D' }}>วันให้บริการ:</span>{' '}
                    {serviceDaysText}
                  </p>
                  <p>
                    <span className="font-semibold" style={{ color: '#F9669D' }}>
                      จำนวนที่จองแล้ว: {v.booked} /{' '}
                      {v.max_quota === Infinity ? 'ไม่จำกัด' : v.max_quota} (เหลือ {remaining})
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold" style={{ color: '#30266D' }}>เพศที่จองได้:</span>{' '}
                    {v.gender === 'male' ? 'ชาย' : v.gender === 'female' ? 'หญิง' : 'ทุกเพศ'}
                  </p>
                  <p>
                    <span className="font-semibold" style={{ color: '#30266D' }}>ช่วงอายุที่จองได้:</span> {v.min_age} – {v.max_age}{' '}
                    ปี
                  </p>
                </div>
                <Button
                  onClick={() => handleBookVaccine(v.id)}
                  className={`mt-auto py-3 rounded-xl shadow-md transition-all ${
                    buttonLoading[v.id] ? 'opacity-50' : 'hover:bg-[#F9669D]/80'
                  }`}
                  style={{ backgroundColor: '#F9669D', color: '#FFFFFF' }}
                  disabled={buttonLoading[v.id]}
                  aria-label="จองวัคซีน"
                >
                  {buttonLoading[v.id] ? (
                    <div className="flex items-center justify-center">
                      <motion.div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      ></motion.div>
                      กำลังโหลด...
                    </div>
                  ) : (
                    'จองวัคซีน'
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <motion.div
          className="flex justify-center mt-10 gap-2 flex-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                currentPage === page
                  ? 'bg-[#30266D] text-white shadow-lg'
                  : 'bg-[#FFFFFF]/95 text-[#1F2937] hover:bg-[#F9669D]/80 hover:text-white'
              }`}
              aria-current={currentPage === page ? 'page' : undefined}
              aria-label={`หน้า ${page}`}
            >
              {page}
            </Button>
          ))}
        </motion.div>
      )}
    </motion.main>
  );
}