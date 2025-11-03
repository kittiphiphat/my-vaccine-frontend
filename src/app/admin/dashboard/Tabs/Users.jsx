'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDownload, 
  faTrash, 
  faSearch, 
  faUserShield, 
  faUserInjured,
  faEnvelope,
  faChevronDown,
  faChevronUp,
  faEllipsisV,
  faTimes,
  faBars,
  faFilter
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);
const API_URL = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users`;
const axiosInstance = axios.create({ timeout: 10000 });

// ฟังก์ชันช่วยดึง role name ที่ถูกต้องทุกกรณี
const getRoleName = (role) => {
  if (!role) return null;

  // กรณี: role เป็น object ธรรมดา
  if (role.name) return role.name.toLowerCase();

  // กรณี: role เป็น { data: { attributes: { name } } }
  if (role.data?.attributes?.name) {
    return role.data.attributes.name.toLowerCase();
  }

  // กรณี: role เป็น array (populate ลึกเกิน)
  if (Array.isArray(role) && role[0]?.name) {
    return role[0].name.toLowerCase();
  }

  if (Array.isArray(role) && role[0]?.attributes?.name) {
    return role[0].attributes.name.toLowerCase();
  }

  return null;
};

// Role display name mapping
const roleDisplayName = {
  admin: 'ผู้ดูแล',
  patient: 'ผู้ป่วย',
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function UsersManagement({ searchTerm }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('admin');
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedUser, setExpandedUser] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const itemsPerPage = 5;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = sessionStorage.getItem('jwt');
      if (!token) throw new Error('Unauthorized: No token found');

      const res = await axiosInstance.get(`${API_URL}?populate=role`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });

      // แปลง role ให้เป็น standard format
      const normalizedUsers = (res.data || []).map(user => ({
        ...user,
        roleName: getRoleName(user.role), // เพิ่ม field นี้เพื่อความสะดวก
      }));

      setUsers(normalizedUsers);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || `ไม่สามารถดึงข้อมูลผู้ใช้ได้: ${error.message}`;
      setError(errorMessage);
      MySwal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: errorMessage.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' : errorMessage,
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-lg p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-2 rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
      });
      if (errorMessage.includes('Unauthorized')) router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCancel = async (id) => {
    const result = await MySwal.fire({
      title: 'ยืนยันการยกเลิก',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกผู้ใช้นี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ยกเลิก',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-lg p-6 max-w-md w-full',
        title: 'text-lg font-semibold text-[var(--card-foreground)]',
        htmlContainer: 'text-base text-[var(--muted-foreground)]',
        confirmButton: 'bg-[var(--destructive)] text-[var(--primary-foreground)] px-6 py-2 rounded-[var(--radius)] font-medium hover:bg-[var(--destructive)]/90 transition-all duration-200 shadow-sm',
        cancelButton: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-6 py-2 rounded-[var(--radius)] font-medium hover:bg-[var(--secondary)]/90 transition-all duration-200 shadow-sm',
      },
    });

    if (result.isConfirmed) {
      try {
        const token = sessionStorage.getItem('jwt');
        if (!token) throw new Error('Unauthorized: No token found');

        await axiosInstance.put(
          `${API_URL}/${id}`,
          { status: 'cancelled' },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
              Expires: '0',
            },
          }
        );

        fetchUsers();
        MySwal.fire({
          icon: 'success',
          title: 'ยกเลิกสำเร็จ',
          text: 'ยกเลิกผู้ใช้เรียบร้อย',
          timer: 1500,
          showConfirmButton: false,
          customClass: {
            popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-lg p-6 max-w-md w-full',
            title: 'text-lg font-semibold text-[var(--card-foreground)]',
            htmlContainer: 'text-base text-[var(--muted-foreground)]',
          },
        });
      } catch (error) {
        const errorMessage = error.response?.data?.error?.message || `ไม่สามารถยกเลิกผู้ใช้ได้: ${error.message}`;
        MySwal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: errorMessage.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' : errorMessage,
          customClass: {
            popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-lg p-6 max-w-md w-full',
            title: 'text-lg font-semibold text-[var(--card-foreground)]',
            htmlContainer: 'text-base text-[var(--muted-foreground)]',
            confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-2 rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
          },
        });
        if (errorMessage.includes('Unauthorized')) router.replace('/login');
      }
    }
  };

  const exportToExcel = () => {
    const filteredUsers = users.filter(
      (user) =>
        user.roleName === activeTab &&
        user.status !== 'cancelled' &&
        user.username.toLowerCase().includes(localSearchTerm.toLowerCase())
    );

    if (!filteredUsers.length) {
      MySwal.fire({
        icon: 'warning',
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลสำหรับส่งออก',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-lg p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-2 rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
      });
      return;
    }

    const worksheetData = filteredUsers.map((user, index) => ({
      ลำดับ: index + 1,
      'ชื่อผู้ใช้': user.username,
      'อีเมล': user.email,
      'บทบาท': roleDisplayName[user.roleName] || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ผู้ใช้งาน');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([excelBuffer], { type: 'application/octet-stream' }),
      `รายชื่อผู้ใช้งาน-${dayjs().tz('Asia/Bangkok').format('D MMMM BBBB')}.xlsx`
    );
  };

  // ใช้ roleName แทน user.role?.name
  const filteredUsers = users.filter(
    (user) =>
      user.roleName === activeTab &&
      user.status !== 'cancelled' &&
      user.username.toLowerCase().includes(localSearchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleExpanded = (id) => {
    setExpandedUser(expandedUser === id ? null : id);
  };

  return (
    <motion.div
      className="min-h-screen text-[var(--foreground)] font-prompt p-4 sm:p-4 lg:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-2xl lg:text-2xl font-bold text-[var(--foreground)] mb-2">จัดการผู้ใช้งาน</h1>
            </div>
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden p-2 h-10 w-10"
              aria-label="เมนู"
            >
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        {/* Tabs and Search - Desktop */}
        <div className="hidden sm:block">
          <motion.div 
            className="mb-6 sm:mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex flex-wrap gap-3">
                {['admin', 'patient'].map((tab) => (
                  <motion.div key={tab} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => setActiveTab(tab)}
                      className={`px-5 py-3 text-sm font-medium rounded-[var(--radius)] transition-all duration-200 shadow-sm flex items-center gap-2 ${
                        activeTab === tab
                          ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                          : 'bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] hover:bg-[var(--primary)]/10'
                      }`}
                      aria-label={tab === 'admin' ? 'แสดงผู้ดูแล' : 'แสดงผู้ป่วย'}
                    >
                      <FontAwesomeIcon 
                        icon={tab === 'admin' ? faUserShield : faUserInjured} 
                        className="w-4 h-4" 
                      />
                      {tab === 'admin' ? 'ผู้ดูแล' : 'ผู้ป่วย'}
                    </Button>
                  </motion.div>
                ))}
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={exportToExcel}
                  className="px-5 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] flex items-center gap-2 text-sm font-medium transition-all duration-200 shadow-sm"
                  aria-label="ดาวน์โหลดรายชื่อผู้ใช้งาน"
                >
                  <FontAwesomeIcon icon={faDownload} className="w-4 h-4" /> ดาวน์โหลด Excel
                </Button>
              </motion.div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <FontAwesomeIcon 
                icon={faSearch} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] w-5 h-5" 
              />
              <Input
                placeholder="ค้นหาชื่อผู้ใช้..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="pl-10 bg-[var(--card)] border-[var(--border)] text-[var(--card-foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
              />
            </div>
          </motion.div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div 
              className="sm:hidden mb-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-[var(--card)] rounded-[var(--radius)] shadow-md p-4 border border-[var(--border)]">
                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {['admin', 'patient'].map((tab) => (
                    <Button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setShowMobileMenu(false);
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-[var(--radius)] transition-all duration-200 flex items-center gap-2 ${
                        activeTab === tab
                          ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                          : 'bg-[var(--secondary)] text-[var(--secondary-foreground)]'
                      }`}
                    >
                      <FontAwesomeIcon 
                        icon={tab === 'admin' ? faUserShield : faUserInjured} 
                        className="w-4 h-4" 
                      />
                      {tab === 'admin' ? 'ผู้ดูแล' : 'ผู้ป่วย'}
                    </Button>
                  ))}
                </div>

                {/* Export Button */}
                <Button
                  onClick={() => {
                    exportToExcel();
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 shadow-sm mb-4"
                >
                  <FontAwesomeIcon icon={faDownload} className="w-4 h-4" /> ส่งออก Excel
                </Button>

                {/* Search Bar */}
                <div className="relative">
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] w-5 h-5" 
                  />
                  <Input
                    placeholder="ค้นหาชื่อผู้ใช้..."
                    value={localSearchTerm}
                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                    className="pl-10 bg-[var(--card)] border-[var(--border)] text-[var(--card-foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              className="w-12 h-12 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            />
            <p className="mt-4 text-[var(--muted-foreground)] font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FontAwesomeIcon icon={faTimes} className="w-16 h-16 text-[var(--destructive)] mb-4" />
            <p className="text-center text-[var(--destructive)] text-lg">เกิดข้อผิดพลาด: {error}</p>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FontAwesomeIcon 
              icon={activeTab === 'admin' ? faUserShield : faUserInjured} 
              className="w-16 h-16 text-[var(--muted-foreground)] mb-4" 
            />
            <p className="text-center text-[var(--muted-foreground)] text-lg">ไม่พบ{activeTab === 'admin' ? 'ผู้ดูแล' : 'ผู้ป่วย'}</p>
            <p className="text-sm mt-1 text-[var(--muted-foreground)]">ลองค้นหาด้วยคำอื่น</p>
          </div>
        ) : (
          <>
            {/* User Cards */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {paginatedUsers.map((user) => {
                const isExpanded = expandedUser === user.id;
                return (
                  <motion.div key={user.id} variants={itemVariants}>
                    <div className="bg-[var(--card)] rounded-[var(--radius)] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-[var(--border)]">
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--secondary-light)] flex items-center justify-center flex-shrink-0">
                              <FontAwesomeIcon 
                                icon={user.roleName === 'admin' ? faUserShield : faUserInjured} 
                                className={`w-5 h-5 sm:w-6 sm:h-6 ${user.roleName === 'admin' ? 'text-blue-500' : 'text-green-500'}`} 
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-base sm:text-lg text-[var(--card-foreground)] truncate">{user.username}</h3>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-[var(--muted-foreground)]">
                                <div className="flex items-center gap-1 truncate">
                                  <FontAwesomeIcon icon={faEnvelope} className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <FontAwesomeIcon 
                                    icon={user.roleName === 'admin' ? faUserShield : faUserInjured} 
                                    className="w-3 h-3 flex-shrink-0" 
                                  />
                                  <span>{roleDisplayName[user.roleName] || '-'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(user.id)}
                              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-2 h-8 w-8"
                            >
                              <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <FontAwesomeIcon icon={faEllipsisV} className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[var(--card)] border-[var(--border)]">
                                <DropdownMenuItem 
                                  onClick={() => handleCancel(user.id)}
                                  className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10 cursor-pointer"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="w-4 h-4 mr-2" />
                                  ยกเลิกผู้ใช้
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="mt-4 pt-4 border-t border-[var(--border)]"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-3">
                                  <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                                  <span className="text-[var(--card-foreground)] break-all">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <FontAwesomeIcon 
                                    icon={user.roleName === 'admin' ? faUserShield : faUserInjured} 
                                    className="w-4 h-4 text-[var(--primary)] flex-shrink-0" 
                                  />
                                  <span className="text-[var(--card-foreground)]">{roleDisplayName[user.roleName] || '-'}</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div 
                className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="text-sm text-[var(--muted-foreground)]">
                  แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, filteredUsers.length)} จากทั้งหมด {filteredUsers.length} รายการ
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary-light)]/50"
                  >
                    ก่อนหน้า
                  </Button>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-8 w-8 sm:h-auto sm:w-auto p-0 sm:p-2 ${
                            currentPage === pageNum 
                              ? "bg-[var(--primary)] text-[var(--primary-foreground)]" 
                              : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary-light)]/50"
                          }`}
                        >
                          <span className="sm:inline hidden">{pageNum}</span>
                          <span className="sm:hidden inline">{pageNum}</span>
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary-light)]/50"
                  >
                    ถัดไป
                  </Button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}