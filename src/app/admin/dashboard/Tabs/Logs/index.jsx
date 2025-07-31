'use client';

import React, { useEffect, useState } from 'react';


import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminLogs from './admin/AdminLogs';
import PatientLogs from './patient/PatientLogs';

const TABS = [
  { id: 'admin', label: 'Admin Logs' },
  { id: 'patient', label: 'Patient Logs' },
];

export default function LogsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabFromQuery = searchParams.get('tab') || 'log';
  console.log('tabFromQuery:', tabFromQuery);

  const [activeTab, setActiveTab] = useState(tabFromQuery);

  useEffect(() => {
    if (TABS.some(tab => tab.id === tabFromQuery)) {
      setActiveTab(tabFromQuery);
    } else {
      setActiveTab('log'); // fallback default
    }
  }, [tabFromQuery]);

  const handleTabChange = (tabId) => {
    console.log('Tab clicked:', tabId);
    setActiveTab(tabId);
  
  };

  console.log('Rendering with activeTab:', activeTab);

  return (
    <div>
      <div className="mb-6 flex gap-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-6 py-2 font-semibold rounded-full transition cursor-pointer
              ${activeTab === tab.id
                ? 'bg-[#30266D] text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {(activeTab !== 'admin' && activeTab !== 'patient') && (
       <div className="flex flex-col items-center justify-center py-32 px-12  text-gray-600 max-w-4xl mx-auto animate-fadeIn">
        <Image
          src="/medcmu2.png"width={200} height={200} alt="Logo" className="mx-auto mb-4 animate-bounce"/>
        <h2 className="text-4xl font-extrabold mb-4 text-gray-800">ระบบ Log สำหรับผู้ดูแลระบบ</h2>
        <p className="text-center text-gray-500 text-lg max-w-xl">
          โปรดเลือกแท็บด้านบน
        </p>
      </div>
      )}

      {activeTab === 'admin' && <AdminLogs />}
      {activeTab === 'patient' && <PatientLogs />}
      </div>
    </div>
  );
}
