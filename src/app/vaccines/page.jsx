'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'dayjs/locale/th';
import { useRouter } from 'next/navigation';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { io } from 'socket.io-client';

dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.locale('th');

const dayMapShort = {
  0: 'อาทิตย์',
  1: 'จันทร์',
  2: 'อังคาร',
  3: 'พุธ',
  4: 'พฤหัส',
  5: 'ศุกร์',
  6: 'เสาร์',
};


function Spinner() {
  return (
    <div className="flex justify-center items-center py-10">
      <div className="w-12 h-12 border-4 border-[#30266D] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export default function VaccineList() {
  const [patient, setPatient] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);  // state เก็บ error

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

      const userRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, { credentials: 'include' });
      const user = await userRes.json();
      const userId = user?.id || user?.data?.id;

      if (!userId) {
        router.push('/login');
        return;
      }

      const patientRes = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients?filters[user][id][$eq]=${userId}&populate=user`,
        { credentials: 'include' }
      );
      const pData = await patientRes.json();

      if (!pData.data || pData.data.length === 0) {
        setPatient(null);
      } else {
        const pat = pData.data[0];
        const birthDate = pat.attributes.birth_date;
        const age = birthDate ? dayjs().diff(dayjs(birthDate), 'year') : 0;
        let gender = (pat.attributes.gender || 'any').toLowerCase();
        if (!['male', 'female'].includes(gender)) gender = 'any';

        setPatient({ id: pat.id, age, gender });
      }

      const vacRes = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?populate[booking_settings]=name,max_quota&populate[vaccine_service_days]=day&populate[vaccine_time_slots]=time`,
        { credentials: 'include' }
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
      console.error('โหลดข้อมูลล้มเหลว:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:4000', {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current.on('vaccineUpdated', () => {
      loadData();
    });

    return () => {
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
          ? !(v.max_age < minAge || v.min_age > maxAge) // ทับซ้อนกันจริง ๆ
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

  if (loading) return <Spinner />;

  return (
    <main className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-[#30266D] mb-6 text-center sm:text-left">รายการวัคซีน</h1>


      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="ค้นหาวัคซีน..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] p-3 border border-[#F9669D] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F9669D]"
          aria-label="ค้นหาวัคซีน"
        />

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-5 py-2 bg-[#30266D] text-white rounded-md flex items-center gap-2 cursor-pointer transition-shadow shadow-md hover:shadow-lg focus:ring-4 focus:ring-[#30266D]/50"
          aria-label={showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
          type="button"
        >
          {showFilters ? <X size={18} /> : <Filter size={18} />} {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
        </button>
      </div>


      {error && (
        <div
          role="alert"
          className="mb-6 rounded-md bg-red-100 border border-red-400 text-red-700 px-4 py-3"
          aria-live="assertive"
        >
          {error}
        </div>
      )}


      {showFilters && (
        <div className="bg-gray-50 p-6 rounded-md shadow mb-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="number"
              placeholder="อายุต่ำสุด"
              value={ageMinFilter}
              onChange={(e) => setAgeMinFilter(e.target.value)}
              className="w-full sm:w-1/2 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#F9669D]"
              aria-label="อายุต่ำสุด"
              min={0}
            />
            <input
              type="number"
              placeholder="อายุสูงสุด"
              value={ageMaxFilter}
              onChange={(e) => setAgeMaxFilter(e.target.value)}
              className="w-full sm:w-1/2 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#F9669D]"
              aria-label="อายุสูงสุด"
              min={0}
            />
          </div>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="w-full max-w-xs p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#F9669D]"
            aria-label="กรองตามเพศ"
          >
            <option value="any">ทุกเพศ</option>
            <option value="male">ชาย</option>
            <option value="female">หญิง</option>
          </select>

          <div className="flex flex-wrap gap-4">
            {Object.entries(dayMapShort).map(([num, label]) => (
              <label
                key={num}
                className="flex items-center gap-2 cursor-pointer select-none text-gray-700"
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
                  className="cursor-pointer"
                  aria-label={`เลือกวัน${label}`}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}


      <div className="flex justify-between items-center text-sm text-gray-600 mb-6">
        <p>พบทั้งหมด {availableVaccines.length} รายการ</p>
        <button
          onClick={() => toggleSort('name')}
          className="flex items-center gap-1 cursor-pointer transition-colors hover:text-[#30266D]"
          aria-label={`เรียงตามชื่อ ${sortOrder === 'asc' ? 'จากน้อยไปมาก' : 'จากมากไปน้อย'}`}
          type="button"
        >
          เรียงตามชื่อ {sortOrder === 'asc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>


      {availableVaccines.length === 0 ? (
        <p className="text-center text-gray-500">ไม่พบวัคซีนที่ตรงกับเงื่อนไข</p>
      ) : (
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((v) => {
            const remaining = Math.max(v.max_quota - v.booked, 0);
            return (
              <div
                key={v.id}
                className="border-l-4 border-[#30266D] bg-white p-6 shadow-lg rounded-lg flex flex-col min-h-[320px] hover:shadow-xl transition-shadow duration-300"
              >
                <h2 className="text-2xl font-extrabold text-[#30266D] mb-3 line-clamp-1">{v.name}</h2>

                <p className="text-gray-700 text-base mb-5 line-clamp-4 flex-grow">{v.description}</p>

                <div className="text-sm text-gray-600 space-y-2 mb-6 leading-relaxed">
                  <p>
                    <span className="font-semibold text-[#30266D]">เปิดจอง:</span>{' '}
                    {v.bookingStart.format('D MMM')} {v.bookingStart.year() + 543} –{' '}
                    {v.bookingEnd.format('D MMM')} {v.bookingEnd.year() + 543}
                  </p>
                  <p>
                    <span className="font-semibold text-[#F9669D]">
                      จำนวนที่จองแล้ว: {v.booked} /{' '}
                      {v.max_quota === Infinity ? 'ไม่จำกัด' : v.max_quota} (เหลือ {remaining})
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-[#30266D]">เพศที่รับได้:</span>{' '}
                    {v.gender === 'male' ? 'ชาย' : v.gender === 'female' ? 'หญิง' : 'ทุกเพศ'}
                  </p>
                  <p>
                    <span className="font-semibold text-[#30266D]">ช่วงอายุที่รับได้:</span> {v.min_age} – {v.max_age}{' '}
                    ปี
                  </p>
                </div>

                <button
                  onClick={() => router.push(`/vaccines/${v.id}`)}
                  className="mt-auto bg-[#F9669D] text-white font-semibold rounded-md py-3 shadow-md cursor-pointer transition-colors hover:bg-pink-600 focus:ring-4 focus:ring-[#F9669D]/50"
                  type="button"
                >
                  จองวัคซีน
                </button>
              </div>
            );
          })}
        </div>
      )}


      {totalPages > 1 && (
        <div className="flex justify-center mt-10 gap-3">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-md font-semibold transition-colors ${
                currentPage === page
                  ? 'bg-[#30266D] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-current={currentPage === page ? 'page' : undefined}
              aria-label={`หน้า ${page}`}
              type="button"
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
