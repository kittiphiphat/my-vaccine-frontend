'use client';

import React from 'react';

const actionLabels = {
  login: 'เข้าสู่ระบบ',
  logout: 'ออกจากระบบ',
  patient_updated: 'แก้ไขข้อมูลผู้ป่วย',
  vaccine_created: 'สร้างข้อมูลวัคซีน',
  vaccine_updated: 'แก้ไขข้อมูลวัคซีน',
  booking_setting_created: 'สร้างตั้งค่าการจอง',
  booking_setting_updated: 'แก้ไขตั้งค่าการจอง',
  booking_setting_deleted: 'ลบการตั้งค่าช่วงเวลาการจอง',
  vaccine_service_day_deleted: 'ลบวันให้บริการวัคซีน',
  vaccine_time_slot_created: 'สร้างช่วงเวลาวัคซีน',
  vaccine_time_slot_deleted: 'ลบช่วงเวลาวัคซีน',
  vaccine_service_day_created: 'สร้างวันให้บริการวัคซีน',
  hospitel_detail_created: 'สร้างข้อมูลใบนัด',
  hospitel_detail_updated: 'แก้ไขข้อมูลใบนัด',
};

export default function FilterSearch({ filterAction, setFilterAction, searchTerm, setSearchTerm, setCurrentPage }) {
  const onFilterChange = (e) => {
    setFilterAction(e.target.value);
    setCurrentPage(1);
  };

  const onSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <select
        value={filterAction}
        onChange={onFilterChange}
        className="border rounded px-3 py-2 max-w-xs cursor-pointer"
      >
        <option value="">ทุกประเภท</option>
        {Object.entries(actionLabels).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <input
        type="text"
        placeholder="ค้นหาข้อความในบันทึก..."
        value={searchTerm}
        onChange={onSearchChange}
        className="flex-grow border rounded px-3 py-2"
      />
    </div>
  );
}
