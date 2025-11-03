'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faPhone, faBirthdayCake, faEnvelope, faEdit, faTrashAlt,
  faFileExport, faMars, faVenus, faGenderless, faChevronDown, faChevronUp,
  faEllipsisV, faUserCircle, faFilter, faClock, faMapMarker, faLayerGroup, faSpinner,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import PatientsEdit from './Patients/Patientsedit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);
const API_URL = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients`;

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } };

const genderTranslations = {
  male: 'ชาย',
  female: 'หญิง',
  '': 'ไม่ระบุ',
  null: 'ไม่ระบุ',
  undefined: 'ไม่ระบุ',
};

export default function Patients({ searchTerm = '' }) {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPatient, setEditingPatient] = useState(null);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [genderFilter, setGenderFilter] = useState('');
  const [ageRange, setAgeRange] = useState({ min: '', max: '' });
  const [birthDateRange, setBirthDateRange] = useState({ start: '', end: '' });
  const [viewMode, setViewMode] = useState('timeline');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 8;

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'ไม่ระบุ';
    const birthDate = dayjs(dateOfBirth).tz('Asia/Bangkok');
    return birthDate.isValid() ? `${dayjs().diff(birthDate, 'year')} ปี` : 'ไม่ระบุ';
  };

  const formatPhoneNumber = (phone) => (phone ? phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : '-');

  const handleSearchChange = useCallback((value) => {
    setLocalSearchTerm(value);
    setSearchLoading(true);

    if (value.length > 1) {
      const suggestions = patients
        .filter(p => {
          const first = p.attributes?.first_name || p.first_name || '';
          const last = p.attributes?.last_name || p.last_name || '';
          const fullName = `${first} ${last}`.toLowerCase();
          return fullName.includes(value.toLowerCase());
        })
        .slice(0, 5)
        .map(p => `${p.attributes?.first_name || p.first_name || ''} ${p.attributes?.last_name || p.last_name || ''}`);
      setSearchSuggestions(suggestions);
    } else {
      setSearchSuggestions([]);
    }

    const timer = setTimeout(() => setSearchLoading(false), 300);
    return () => clearTimeout(timer);
  }, [patients]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('jwt');
      if (!token) throw new Error('Unauthorized: No token found');
      const res = await fetch(`${API_URL}?pagination[pageSize]=100`, {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPatients(Array.isArray(data.data) ? data.data : data);
    } catch (error) {
      MySwal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' : 'ไม่สามารถดึงข้อมูลได้',
        customClass: {
          popup: 'bg-[var(--card)] rounded-xl shadow-xl p-6 max-w-md w-full',
          title: 'text-xl font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all duration-200 shadow-md',
        },
      });
      if (error.message.includes('Unauthorized')) router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, []);

  const exportToExcel = () => {
    const filtered = filteredPatients;
    if (!filtered.length) {
      MySwal.fire({ icon: 'warning', title: 'ไม่มีข้อมูล', text: 'กรุณาค้นหาข้อมูลก่อนส่งออก' });
      return;
    }

    const excelData = filtered.map((p, i) => ({
      ลำดับ: i + 1,
      ชื่อ: p.attributes?.first_name || p.first_name || '-',
      นามสกุล: p.attributes?.last_name || p.last_name || '-',
      เพศ: genderTranslations[p.attributes?.gender || p.gender] || 'ไม่ระบุ',
      อายุ: calculateAge(p.attributes?.birth_date || p.birth_date),
      เบอร์โทร: formatPhoneNumber(p.attributes?.phone || p.phone),
      อีเมล: p.attributes?.email || p.email || '-',
      ที่อยู่: p.attributes?.address || p.address || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ผู้ป่วย');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer]), `รายชื่อผู้ป่วย-${dayjs().format('D MMMM BBBB')}.xlsx`);
  };

  const handleDelete = async (id) => {
    const result = await MySwal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลผู้ป่วยนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบ',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-[var(--card)] rounded-xl shadow-xl p-6 max-w-md w-full',
        title: 'text-xl font-bold text-[var(--card-foreground)]',
        htmlContainer: 'text-base text-[var(--muted-foreground)]',
        confirmButton: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all duration-200',
        cancelButton: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all duration-200',
      },
    });

    if (result.isConfirmed) {
      try {
        const token = sessionStorage.getItem('jwt');
        const res = await fetch(`${API_URL}/${id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { status: 'cancelled' } }),
        });
        if (!res.ok) throw new Error('Failed');
        fetchPatients();
        MySwal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false });
      } catch {
        MySwal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบข้อมูลได้' });
      }
    }
  };

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const status = (p.attributes?.status || p.status || '').toLowerCase();
      const fullName = `${p.attributes?.first_name || p.first_name || ''} ${p.attributes?.last_name || p.last_name || ''}`.toLowerCase();
      const gender = p.attributes?.gender || p.gender || '';
      const age = dayjs().diff(dayjs(p.attributes?.birth_date || p.birth_date), 'year');
      const birthDate = dayjs(p.attributes?.birth_date || p.birth_date);

      const minAge = ageRange.min ? parseInt(ageRange.min) : 0;
      const maxAge = ageRange.max ? parseInt(ageRange.max) : 100;

      return (
        status !== 'cancelled' &&
        (!localSearchTerm || fullName.includes(localSearchTerm.toLowerCase())) &&
        (!genderFilter || gender === genderFilter) &&
        age >= minAge && age <= maxAge &&
        (!birthDateRange.start || birthDate.isAfter(dayjs(birthDateRange.start).subtract(1, 'day'))) &&
        (!birthDateRange.end || birthDate.isBefore(dayjs(birthDateRange.end).add(1, 'day')))
      );
    });
  }, [patients, localSearchTerm, genderFilter, ageRange, birthDateRange]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const highlightText = (text, highlight) => {
    if (!highlight?.trim()) return text;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200 px-1 rounded font-medium">{part}</mark> : part
    );
  };

  const toggleExpanded = (id) => setExpandedPatient(expandedPatient === id ? null : id);
  const resetFilters = () => {
    setGenderFilter(''); setAgeRange({ min: '', max: '' }); setBirthDateRange({ start: '', end: '' });
    setLocalSearchTerm(''); setCurrentPage(1);
  };

  const activeFilterCount = [genderFilter, ageRange.min || ageRange.max, birthDateRange.start || birthDateRange.end].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[var(--background)] font-[var(--font-base)]">
      <motion.div className="container mx-auto p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {editingPatient ? (
          <PatientsEdit patient={editingPatient} onSave={() => { setEditingPatient(null); fetchPatients(); }} onCancel={() => setEditingPatient(null)} />
        ) : (
          <>
            {/* Header */}
            <motion.div className="mb-6 sm:mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">

                <div className="flex gap-2 sm:gap-3">
                  <Button
                    variant={viewMode === 'timeline' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setViewMode('timeline')}
                    className={`rounded-[var(--radius)] shadow-md hover:shadow-lg transition-all text-xs sm:text-sm md:text-base ${
                      viewMode === 'timeline' 
                        ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90' 
                        : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/80'
                    }`}
                  >
                    ไทม์ไลน์
                  </Button>
                  <Button
                    variant={viewMode === 'compact' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setViewMode('compact')}
                    className={`rounded-[var(--radius)] shadow-md hover:shadow-lg transition-all text-xs sm:text-sm md:text-base ${
                      viewMode === 'compact' 
                        ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90' 
                        : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/80'
                    }`}
                  >
                    กระชับ
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Search & Filters */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="relative flex-1 sm:flex-initial sm:w-96">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] w-4 h-4" />
                  <Input
                    placeholder="ค้นหาชื่อผู้ป่วย..."
                    value={localSearchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 pr-10 py-2.5 text-sm bg-[var(--card)] border-2 border-[var(--border)] rounded-[var(--radius)] shadow-sm focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/20 transition-all"
                  />
                  {searchLoading && (
                    <FontAwesomeIcon icon={faSpinner} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--primary)] w-4 h-4 animate-spin" />
                  )}
                </div>
                
                <div className="flex gap-2 sm:gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowFilters(!showFilters)} 
                    className={`rounded-[var(--radius)] shadow-md text-xs sm:text-sm transition-all whitespace-nowrap ${
                      showFilters 
                        ? 'bg-[var(--primary)] text-white border-[var(--primary)] hover:bg-[var(--primary)]/90' 
                        : 'bg-[var(--card)] text-[var(--foreground)] border-[var(--border)]'
                    }`}
                  >
                    <FontAwesomeIcon icon={faFilter} className="mr-2" />
                    ตัวกรอง 
                    {activeFilterCount > 0 && (
                      <span className="ml-2 bg-white text-[var(--primary)] text-xs px-2 py-1 rounded-full font-medium">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                  <Button 
                    onClick={exportToExcel} 
                    className="rounded-[var(--radius)] bg-[var(--primary)] text-white shadow-md hover:bg-[var(--primary)]/90 hover:shadow-lg transition-all text-xs sm:text-sm whitespace-nowrap"
                  >
                    <FontAwesomeIcon icon={faFileExport} className="mr-2" />
                    ดาวน์โหลด Excel
                  </Button>
                </div>
              </div>
            </div>

            {/* Results */}
            {loading ? (
              <div className="space-y-4 sm:space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 sm:h-40 bg-[var(--card)] border-2 border-dashed border-[var(--border)] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : paginatedPatients.length === 0 ? (
              <div className="text-center py-16 sm:py-20 md:py-24">
                <FontAwesomeIcon icon={faUserCircle} className="w-16 h-16 sm:w-20 sm:h-20 text-[var(--muted-foreground)] mb-4 sm:mb-6" />
                <p className="text-lg sm:text-xl font-semibold text-[var(--card-foreground)]">ไม่พบข้อมูลผู้ป่วย</p>
                <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1 sm:mt-2">ลองค้นหาด้วยคำอื่น</p>
                <Button onClick={resetFilters} className="mt-4 sm:mt-6 bg-[var(--primary)] text-white rounded-[var(--radius)] shadow-md text-xs sm:text-sm">ล้างตัวกรองทั้งหมด</Button>
              </div>
            ) : (
              <>
                {/* Timeline View */}
                {viewMode === 'timeline' && (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative">
                    <div className="absolute left-6 sm:left-8 md:left-10 top-0 bottom-0 w-0.5 sm:w-1 bg-[var(--primary)]/70 rounded-full"></div>
                    {paginatedPatients.map((patient) => {
                      const firstName = patient.attributes?.first_name || patient.first_name || '';
                      const lastName = patient.attributes?.last_name || patient.last_name || '';
                      const fullName = `${firstName} ${lastName}`;
                      const gender = patient.attributes?.gender || patient.gender;
                      const genderIcon = gender === 'male' ? faMars : gender === 'female' ? faVenus : faGenderless;
                      const isExpanded = expandedPatient === patient.id;

                      return (
                        <motion.div key={patient.id} variants={itemVariants} className="relative flex items-start mb-6 sm:mb-8 md:mb-10">
                          <div className="relative z-10 flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-[var(--card)] rounded-full shadow-lg border-4 border-[var(--secondary-light)]">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base md:text-xl shadow-md
                              ${gender === 'male' ? 'bg-blue-600' : gender === 'female' ? 'bg-pink-600' : 'bg-gray-500'}`}>
                              <FontAwesomeIcon icon={genderIcon} className="w-3 h-3 sm:w-4 sm:h-4 md:w-7 md:h-7" />
                            </div>
                          </div>
                          <motion.div
                            className="flex-1 ml-4 sm:ml-6 md:ml-8 bg-[var(--card)] rounded-2xl shadow-lg border border-[var(--border)] overflow-hidden relative"
                            whileHover={{ scale: 1.02, shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <div className="absolute top-3 right-3 flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => toggleExpanded(patient.id)} 
                                className="rounded-[var(--radius)] p-2 transition-colors"
                              >
                                <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[var(--muted-foreground)]" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="rounded-[var(--radius)] p-2 transition-colors"
                                  >
                                    <FontAwesomeIcon icon={faEllipsisV} className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[var(--muted-foreground)]" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[var(--card)] rounded-[var(--radius)] shadow-xl border border-[var(--border)]">
                                  <DropdownMenuItem onClick={() => setEditingPatient(patient)} className="text-[var(--primary)] font-medium text-xs sm:text-sm">
                                    แก้ไข
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(patient.id)} className="text-red-600 font-medium text-xs sm:text-sm">
                                    ลบ
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="p-4 sm:p-5 md:p-6 pr-16 sm:pr-20">
                              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-[var(--card-foreground)] truncate max-w-[180px] sm:max-w-none">
                                      {highlightText(fullName, localSearchTerm)}
                                    </h3>
                                    {/* พื้นหลังเพศ: สั้นลง, กระชับ, ไม่ล้นจอ */}
                                    <span className={`
                                      px-1.5 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap
                                      ${gender === 'male' ? 'bg-blue-600' : gender === 'female' ? 'bg-pink-600' : 'bg-gray-500'}
                                    `}>
                                      {genderTranslations[gender] || 'ไม่ระบุ'}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-[var(--muted-foreground)] text-xs sm:text-sm">
                                    <div className="flex items-center gap-1">
                                      <FontAwesomeIcon icon={faBirthdayCake} className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--primary)]" />
                                      <span>{calculateAge(patient.attributes?.birth_date || patient.birth_date)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <FontAwesomeIcon icon={faPhone} className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--primary)]" />
                                      <span className="truncate max-w-[120px] sm:max-w-none">{formatPhoneNumber(patient.attributes?.phone || patient.phone)}</span>
                                    </div>
                                    {(patient.attributes?.email || patient.email) && (
                                      <div className="flex items-center gap-1  sm:flex">
                                        <FontAwesomeIcon icon={faEnvelope} className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--primary)]" />
                                        <span className="truncate max-w-[150px]">{patient.attributes?.email || patient.email}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <AnimatePresence>
                                {isExpanded && (patient.attributes?.address || patient.address) && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 sm:mt-5 pt-3 sm:pt-5 border-t border-[var(--border)]">
                                    <div className="flex items-start gap-2 sm:gap-3">
                                      <FontAwesomeIcon icon={faMapMarker} className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[var(--primary)] mt-1" />
                                      <p className="text-[var(--card-foreground)] leading-relaxed text-xs sm:text-sm">{patient.attributes?.address || patient.address}</p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}

                {/* Compact View */}
                {viewMode === 'compact' && (
                  <div className="overflow-x-auto">
                    <table className="w-full bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)]">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-[var(--card-foreground)]">ชื่อ</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-[var(--card-foreground)]">เพศ</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-[var(--card-foreground)]">อายุ</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-[var(--card-foreground)] hidden sm:table-cell">เบอร์โทร</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-[var(--card-foreground)] hidden md:table-cell">อีเมล</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-[var(--card-foreground)]">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPatients.map((patient) => {
                          const firstName = patient.attributes?.first_name || patient.first_name || '';
                          const lastName = patient.attributes?.last_name || patient.last_name || '';
                          const fullName = `${firstName} ${lastName}`;
                          const gender = patient.attributes?.gender || patient.gender;

                          return (
                            <tr key={patient.id} className="border-b border-[var(--border)] transition-colors">
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-[var(--card-foreground)] truncate max-w-[120px] sm:max-w-none">
                                {highlightText(fullName, localSearchTerm)}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-[var(--card-foreground)]">
                                <span className={`
                                  inline-block px-1.5 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap
                                  ${gender === 'male' ? 'bg-blue-600' : gender === 'female' ? 'bg-pink-600' : 'bg-gray-500'}
                                `}>
                                  {genderTranslations[gender] || 'ไม่ระบุ'}
                                </span>
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-[var(--card-foreground)]">
                                {calculateAge(patient.attributes?.birth_date || patient.birth_date)}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-[var(--card-foreground)] hidden sm:table-cell truncate max-w-[100px]">
                                {formatPhoneNumber(patient.attributes?.phone || patient.phone)}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-[var(--card-foreground)] hidden md:table-cell truncate max-w-[120px]">
                                {patient.attributes?.email || patient.email || '-'}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="rounded-[var(--radius)] p-1 sm:p-2">
                                      <FontAwesomeIcon icon={faEllipsisV} className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-[var(--card)] rounded-[var(--radius)] shadow-xl border border-[var(--border)]">
                                    <DropdownMenuItem onClick={() => setEditingPatient(patient)} className="text-[var(--primary)] font-medium text-xs sm:text-sm">
                                      แก้ไข
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(patient.id)} className="text-red-600 font-medium text-xs sm:text-sm">
                                      ลบ
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-8 sm:mt-10 md:mt-12 gap-2 sm:gap-3 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-[var(--radius)] text-xs sm:text-sm">
                      ก่อนหน้า
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="rounded-[var(--radius)] min-w-8 sm:min-w-10 md:min-w-12 text-xs sm:text-sm"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-[var(--radius)] text-xs sm:text-sm">
                      ถัดไป
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </motion.div>

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowFilters(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-4 sm:p-6"
            >
              <div className="bg-[var(--card)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">
                <div className="bg-gradient-to-r from-[var(--primary)] to-teal-400 p-4 sm:p-6 relative">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">ตัวกรองข้อมูล</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowFilters(false)}
                      className="text-white hover:bg-white/20 rounded-full p-2"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 sm:p-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-[var(--card-foreground)] flex items-center">
                      <FontAwesomeIcon icon={faVenus} className="mr-2 text-pink-500" />
                      เพศ
                    </Label>
                    <div className="flex gap-3">
                      {[
                        { value: '', label: 'ทั้งหมด', icon: faGenderless, color: 'bg-gray-500' },
                        { value: 'male', label: 'ชาย', icon: faMars, color: 'bg-blue-500' },
                        { value: 'female', label: 'หญิง', icon: faVenus, color: 'bg-pink-500' }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={genderFilter === option.value ? 'default' : 'outline'}
                          onClick={() => setGenderFilter(option.value)}
                          className={`flex-1 rounded-[var(--radius)] text-sm transition-all flex flex-col items-center gap-2 py-3 ${
                            genderFilter === option.value 
                              ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md' 
                              : 'bg-[var(--secondary)] text-[var(--card-foreground)] border-[var(--border)]'
                          }`}
                        >
                          <FontAwesomeIcon icon={option.icon} className="w-5 h-5" />
                          <span>{option.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-[var(--card-foreground)] flex items-center">
                      <FontAwesomeIcon icon={faBirthdayCake} className="mr-2 text-orange-500" />
                      ช่วงอายุ
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-[var(--muted-foreground)]">อายุต่ำสุด</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={ageRange.min} 
                          onChange={(e) => setAgeRange({ ...ageRange, min: e.target.value })} 
                          className="mt-1 rounded-[var(--radius)] bg-[var(--input)] border-[var(--border)] focus:border-[var(--primary)] text-sm" 
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-[var(--muted-foreground)]">อายุสูงสุด</Label>
                        <Input 
                          type="number" 
                          placeholder="100" 
                          value={ageRange.max} 
                          onChange={(e) => setAgeRange({ ...ageRange, max: e.target.value })} 
                          className="mt-1 rounded-[var(--radius)] bg-[var(--input)] border-[var(--border)] focus:border-[var(--primary)] text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-[var(--card-foreground)] flex items-center">
                      <FontAwesomeIcon icon={faClock} className="mr-2 text-blue-500" />
                      ช่วงวันเกิด
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-[var(--muted-foreground)]">วันที่เริ่มต้น</Label>
                        <Input 
                          type="date" 
                          value={birthDateRange.start} 
                          onChange={(e) => setBirthDateRange({ ...birthDateRange, start: e.target.value })} 
                          className="mt-1 rounded-[var(--radius)] bg-[var(--input)] border-[var(--border)] focus:border-[var(--primary)] text-sm" 
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-[var(--muted-foreground)]">วันที่สิ้นสุด</Label>
                        <Input 
                          type="date" 
                          value={birthDateRange.end} 
                          onChange={(e) => setBirthDateRange({ ...birthDateRange, end: e.target.value })} 
                          className="mt-1 rounded-[var(--radius)] bg-[var(--input)] border-[var(--border)] focus:border-[var(--primary)] text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[var(--secondary)] p-4 sm:p-6 flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={resetFilters} 
                    className="rounded-[var(--radius)] bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] transition-all text-sm"
                  >
                    <FontAwesomeIcon icon={faFilter} className="mr-2" />
                    ล้างตัวกรอง
                  </Button>
                  <Button 
                    onClick={() => setShowFilters(false)} 
                    className="rounded-[var(--radius)] bg-[var(--primary)] text-white shadow-md hover:bg-[var(--primary)]/90 transition-all text-sm"
                  >
                    ใช้ตัวกรอง
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}