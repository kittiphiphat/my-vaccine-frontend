'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  faSyringe, faCalendarDays, faChartBar, faUsers, faUserCircle,
  faHospital, faSignOutAlt, faChevronDown, faBars,
  faAngleDoubleLeft, faAngleDoubleRight
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';

// Lazy Load Tabs
const Vaccines = dynamic(() => import('./Tabs/Vaccines'), { ssr: false });
const BookingManagement = dynamic(() => import('./Tabs/BookingManagement'), { ssr: false });
const Reports = dynamic(() => import('./Tabs/Reports'), { ssr: false });
const UsersTab = dynamic(() => import('./Tabs/Users'), { ssr: false });
const Patients = dynamic(() => import('./Tabs/Patients'), { ssr: false });
const HospitalInfo = dynamic(() => import('./Tabs/HospitalInfo'), { ssr: false });

const TAB_LIST = [
  { id: 'vaccines', label: 'จัดการวัคซีน', icon: faSyringe },
  { id: 'booking', label: 'นัดหมายวัคซีน', icon: faCalendarDays },
  { id: 'reports', label: 'รายงาน', icon: faChartBar },
  { id: 'users', label: 'ผู้ใช้งาน', icon: faUsers },
  { id: 'patients', label: 'ผู้ป่วย', icon: faUserCircle },
  { id: 'hospital', label: 'ข้อมูลโรงพยาบาล', icon: faHospital },
];

const COMPONENTS = {
  vaccines: Vaccines,
  booking: BookingManagement,
  reports: Reports,
  users: UsersTab,
  patients: Patients,
  hospital: HospitalInfo,
};

export default function DashboardContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('vaccines');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userProfile] = useState({ name: 'ผู้ดูแลระบบ', role: 'admin' });
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleTabChange = (id) => {
    setActiveTab(id);
    router.push(`/admin/dashboard?tab=${id}`, { scroll: false });
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'ออกจากระบบ?',
      text: 'คุณแน่ใจหรือไม่ที่จะออกจากระบบ',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      customClass: {
        popup: 'bg-[var(--card)] rounded-xl shadow-2xl p-6',
        title: 'text-xl font-bold text-[var(--card-foreground)]',
        htmlContainer: 'text-[var(--muted-foreground)]',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        sessionStorage.clear();
        router.push('/login');
      }
    });
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const CurrentComponent = COMPONENTS[activeTab] || (() => (
    <div className="flex items-center justify-center py-20">
      <p className="text-xl text-[var(--muted-foreground)]">ไม่พบหน้า</p>
    </div>
  ));

  const currentTabData = TAB_LIST.find(t => t.id === activeTab) || TAB_LIST[0];

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <aside className={`hidden lg:flex lg:flex-col bg-[var(--card)] transition-all duration-300 relative ${sidebarOpen ? 'lg:w-64' : 'lg:w-20'}`}>
        {/* Logo */}
        <div className="p-6">
          {sidebarOpen ? (
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center shadow-lg">
                <FontAwesomeIcon icon={faSyringe} className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--card-foreground)]">VaccineHub</h3>
                <p className="text-xs text-[var(--muted-foreground)]">ระบบจัดการวัคซีน</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-11 h-11 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center shadow-lg">
                <FontAwesomeIcon icon={faSyringe} className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2">
          <ul className="space-y-1">
            {TAB_LIST.map((tab, i) => (
              <motion.li
                key={tab.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => handleTabChange(tab.id)}
                  className={`group w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)]/10 text-[var(--primary)] shadow-md'
                      : 'text-[var(--card-foreground)] '
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white shadow-sm' 
                      : 'bg-[var(--secondary)] text-[var(--primary)]'
                  } ${!sidebarOpen && 'mx-auto'}`}>
                    <FontAwesomeIcon icon={tab.icon} className="w-5 h-5" />
                  </div>
                  {sidebarOpen && (
                    <span className={`ml-3 text-sm font-medium ${activeTab === tab.id ? 'text-[var(--primary)]' : 'text-[var(--card-foreground)]'}`}>
                      {tab.label}
                    </span>
                  )}
                </button>
              </motion.li>
            ))}
          </ul>
        </nav>

        {/* Toggle Button */}
        <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-10">
          <motion.button
            onClick={toggleSidebar}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white shadow-xl flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={{ rotate: sidebarOpen ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              <FontAwesomeIcon icon={sidebarOpen ? faAngleDoubleLeft : faAngleDoubleRight} className="w-4 h-4" />
            </motion.div>
          </motion.button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.aside
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[var(--card)] shadow-2xl"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center shadow-lg">
                    <FontAwesomeIcon icon={faSyringe} className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--card-foreground)]">Vaccine Booking System</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">ระบบจัดการวัคซีน</p>
                  </div>
                </div>
              </div>
              <nav className="px-3 py-2">
                <ul className="space-y-1">
                  {TAB_LIST.map((tab, i) => (
                    <motion.li key={tab.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <button
                        onClick={() => { handleTabChange(tab.id); setSidebarOpen(false); }}
                        className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${
                          activeTab === tab.id
                            ? 'bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)]/10 text-[var(--primary)] shadow-md'
                            : 'text-[var(--card-foreground)] hover:bg-[var(--secondary-light)]'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                          activeTab === tab.id ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white' : 'bg-[var(--secondary)] text-[var(--primary)]'
                        } shadow-sm`}>
                          <FontAwesomeIcon icon={tab.icon} className="w-5 h-5" />
                        </div>
                        <span className={`text-sm font-medium ${activeTab === tab.id ? 'text-[var(--primary)]' : 'text-[var(--card-foreground)]'}`}>
                          {tab.label}
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </nav>
            </motion.aside>
            <motion.div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="bg-[var(--card)] shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="lg:hidden"
              >
                <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggleButton />
              
              <div className="relative">
                <Button
                  variant="ghost"
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-[var(--secondary-light)] transition-all"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-full flex items-center justify-center shadow-md">
                    <FontAwesomeIcon icon={faUserCircle} className="w-5 h-5 text-white" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-[var(--card-foreground)]">{userProfile.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)] capitalize">{userProfile.role}</p>
                  </div>
                  <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4 text-[var(--muted-foreground)]" />
                </Button>

                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      className="absolute right-0 mt-2 w-56 bg-[var(--card)] rounded-xl shadow-2xl z-50"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >

                      <div className="px-2 pb-2">
                        <Button
                          variant="ghost"
                          onClick={handleLogout}
                          className="w-full justify-start text-[var(--destructive)]  dark:hover:bg-red-900/20 rounded-lg px-3 py-2 text-sm"
                        >
                          <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4 mr-2" />
                          ออกจากระบบ
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Page Title */}
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg">
                <FontAwesomeIcon icon={currentTabData.icon} className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--card-foreground)]">{currentTabData.label}</h1>
                <p className="text-[var(--muted-foreground)]">จัดการ{currentTabData.label.toLowerCase()}ของระบบ</p>
              </div>
            </div>

            {/* Content Card */}
            <div >
              <CurrentComponent />
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}