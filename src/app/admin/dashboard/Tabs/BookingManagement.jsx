'use client';

import React, { useState } from 'react';

import VaccineTimeSlotSection from './BookingManagement/VaccineTimeSlotSection';
import VaccineServiceDaySection from './BookingManagement/VaccineServiceDaySection';
import BookingSettingSection from './BookingManagement/BookingSettingSection';

const tabs = [
  { id: 'booking', label: 'ตั้งค่าการจองล่วงหน้า' },
  { id: 'slot', label: 'ช่วงเวลาให้บริการ' },
  { id: 'serviceDay', label: 'วันที่ให้บริการ' },
];

export default function VaccineSettingsPage() {
  const [activeTab, setActiveTab] = useState('booking');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-[#30266D] mb-6 text-center">
        จัดการรูปแบบการให้บริการของวัคซีน
      </h2>

      <div className="flex justify-center gap-4 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-full border font-medium transition-all duration-200 text-sm sm:text-base cursor-pointer
              ${activeTab === tab.id
                ? 'bg-[#30266D] text-white'
                : 'border-[#30266D] text-[#30266D] hover:bg-[#30266D] hover:text-white'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div >
        {activeTab === 'booking' && <BookingSettingSection />}
        {activeTab === 'slot' && <VaccineTimeSlotSection />}
        {activeTab === 'serviceDay' && <VaccineServiceDaySection />}
      </div>
    </div>
  );
}
