'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import { ThaiDatePicker } from 'thaidatepicker-react';

dayjs.locale('th');
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(buddhistEra);

function formatDateToBuddhistEra(date) {
  if (!date) return '-';
  return dayjs(date).locale('th').format('D MMMM BBBB');
}

export default function ReportTab() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedVaccine, setSelectedVaccine] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('confirmed');
  const [vaccines, setVaccines] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingRes, vaccineRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?populate=patient,vaccine`, { withCredentials: true }),
        axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`, { withCredentials: true }),
      ]);
      setBookings(bookingRes.data.data);
      setVaccines(vaccineRes.data.data);
    } catch (err) {
      console.error('Error fetching report data:', err);
    }
  };

  const filtered = bookings.filter((b) => {
    const patient = b.attributes.patient?.data?.attributes;
    const vaccineId = b.attributes.vaccine?.data?.id?.toString() || '';
    const fullName = patient ? `${patient.first_name} ${patient.last_name}` : '';
    const status = b.attributes.status;
    const bookingDay = dayjs(b.attributes.bookingDate);

    const filterStartDate = startDate ? dayjs(startDate).startOf('day') : null;
    const filterEndDate = endDate ? dayjs(endDate).endOf('day') : null;

    return (
      fullName.toLowerCase().includes(search.toLowerCase()) &&
      (selectedVaccine === 'all' || selectedVaccine === vaccineId) &&
      status === selectedStatus &&
      (!filterStartDate || bookingDay.isSameOrAfter(filterStartDate)) &&
      (!filterEndDate || bookingDay.isSameOrBefore(filterEndDate))
    );
  });

  const onSort = (key) => {
    if (key === 'status') return;
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const sortedData = (data) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const getVal = (item) => {
        switch (sortConfig.key) {
          case 'fullName': {
            const p = item.attributes.patient?.data?.attributes;
            return p ? `${p.first_name} ${p.last_name}` : '';
          }
          case 'vaccineTitle':
            return item.attributes.vaccine?.data?.attributes?.title || '';
          case 'bookingDate':
            return item.attributes.bookingDate || '';
          default:
            return '';
        }
      };
      const aVal = getVal(a);
      const bVal = getVal(b);
      return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  };

  const filteredSorted = sortedData(filtered);

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[#30266D] select-none">รายงานการจองวัคซีน</h1>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded shadow cursor-pointer text-white whitespace-nowrap ${
            showFilters ? 'bg-[#F9669D] hover:bg-[#d54b86]' : 'bg-[#30266D]'
          }`}
        >
          {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 shadow-sm mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้จอง..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border px-3 py-2 rounded-md w-full"
            />

            <select
              value={selectedVaccine}
              onChange={(e) => setSelectedVaccine(e.target.value)}
              className="border px-3 py-2 rounded-md w-full"
            >
              <option value="all">วัคซีนทั้งหมด</option>
              {vaccines.map((v) => (
                <option key={v.id} value={v.id.toString()}>
                  {v.attributes.title}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border px-3 py-2 rounded-md w-full"
            >
              <option value="confirmed">จองแล้ว</option>
              <option value="cancelled">ยกเลิก</option>
            </select>

            <ThaiDatePicker
              value={startDate}
              onChange={(d) => setStartDate(d)}
              placeholder="จากวันที่"
              inputClasses="border px-3 py-2 rounded-md w-full"
              maxDate={endDate || undefined}
            />

            <ThaiDatePicker
              value={endDate}
              onChange={(d) => setEndDate(d)}
              placeholder="ถึงวันที่"
              inputClasses="border px-3 py-2 rounded-md w-full"
              minDate={startDate || undefined}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
          <thead className="bg-[#30266D] text-white">
            <tr>
              <th className="px-6 py-3 text-left cursor-pointer" onClick={() => onSort('fullName')}>
                ชื่อผู้จอง {renderSortIcon('fullName')}
              </th>
              <th className="px-6 py-3 text-left cursor-pointer" onClick={() => onSort('vaccineTitle')}>
                วัคซีน {renderSortIcon('vaccineTitle')}
              </th>
              <th className="px-6 py-3 text-left cursor-pointer" onClick={() => onSort('bookingDate')}>
                วันที่นัด {renderSortIcon('bookingDate')}
              </th>
              <th className="px-6 py-3 text-left">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length > 0 ? (
              filteredSorted.map((b) => {
                const p = b.attributes.patient?.data?.attributes;
                const v = b.attributes.vaccine?.data?.attributes;
                const fullName = p ? `${p.first_name} ${p.last_name}` : '[ไม่มีชื่อผู้จอง]';
                const vaccineTitle = v?.title || '-';
                const bookingDate = formatDateToBuddhistEra(b.attributes.bookingDate);
                const status = b.attributes.status;
                const statusText = status === 'confirmed' ? 'จองแล้ว' : 'ยกเลิก';
                const statusClass = status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap">{fullName}</td>
                    <td className="px-6 py-3 whitespace-nowrap">{vaccineTitle}</td>
                    <td className="px-6 py-3 whitespace-nowrap">{bookingDate}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusClass}`}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-6">
                  ไม่พบข้อมูลการจอง
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
