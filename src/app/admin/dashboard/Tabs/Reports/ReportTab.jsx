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
  return dayjs(date).locale('th').format('D MMMM BBBB'); // 24 กรกฎาคม 2568
}

function SortIcon({ direction }) {
  return (
    <svg
      className={`inline-block w-3 h-3 ml-1 text-gray-400 ${
        direction === 'asc' ? 'rotate-180' : ''
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
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
        axios.get(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?populate=patient,vaccine`,
          { withCredentials: true }
        ),
        axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`, {
          withCredentials: true,
        }),
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
    const bookingDateRaw = b.attributes.bookingDate;
    const bookingDay = dayjs(bookingDateRaw);

    const filterStartDate = startDate ? dayjs(startDate).startOf('day') : null;
    const filterEndDate = endDate ? dayjs(endDate).endOf('day') : null;

    const isInDateRange =
      (!filterStartDate || bookingDay.isSameOrAfter(filterStartDate)) &&
      (!filterEndDate || bookingDay.isSameOrBefore(filterEndDate));

    return (
      fullName.toLowerCase().includes(search.toLowerCase()) &&
      (selectedVaccine === 'all' || selectedVaccine === vaccineId) &&
      status === selectedStatus &&
      isInDateRange
    );
  });

  const onSort = (key) => {
    if (key === 'status') return; // ไม่อนุญาตเรียงสถานะ

    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = (data) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case 'fullName':
          aVal = a.attributes.patient?.data?.attributes
            ? `${a.attributes.patient.data.attributes.first_name} ${a.attributes.patient.data.attributes.last_name}`
            : '';
          bVal = b.attributes.patient?.data?.attributes
            ? `${b.attributes.patient.data.attributes.first_name} ${b.attributes.patient.data.attributes.last_name}`
            : '';
          break;

        case 'vaccineTitle':
          aVal = a.attributes.vaccine?.data?.attributes?.title || '';
          bVal = b.attributes.vaccine?.data?.attributes?.title || '';
          break;

        case 'bookingDate':
          aVal = a.attributes.bookingDate || '';
          bVal = b.attributes.bookingDate || '';
          break;

        default:
          aVal = '';
          bVal = '';
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredSorted = sortedData(filtered);

  const exportToCSV = () => {
    const headers = ['ชื่อผู้จอง', 'วัคซีน', 'วันที่นัด', 'สถานะ'];
    const rows = filteredSorted.map((b) => {
      const patient = b.attributes.patient?.data?.attributes;
      const vaccine = b.attributes.vaccine?.data?.attributes;
      const fullName = patient ? `${patient.first_name} ${patient.last_name}` : '-';
      const vaccineTitle = vaccine?.title || '-';
      const bookingDateRaw = b.attributes.bookingDate;
      const bookingDate = formatDateToBuddhistEra(bookingDateRaw);
      const status = b.attributes.status === 'confirmed' ? 'จองแล้ว' : 'ยกเลิก';
      return [fullName, vaccineTitle, bookingDate, status];
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')
      )
      .join('\r\n');

    const csvWithBOM = '\uFEFF' + csvContent;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return <SortIcon direction={sortConfig.direction} />;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-[#30266D] mb-6 text-center select-none">
        รายงานการจองวัคซีน
      </h2>

      <div className="flex flex-wrap items-center gap-4 mb-6 p-6 rounded-lg shadow-md bg-white">
        <button
          className="px-4 py-2 bg-[#30266D] text-white rounded-md shadow hover:bg-[#cc4e7a] transition cursor-pointer"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
        </button>

        {showFilters && (
          <>
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้จอง..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#30266D]"
            />

            <select
              value={selectedVaccine}
              onChange={(e) => setSelectedVaccine(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#30266D] cursor-pointer"
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
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm w-48 focus:outline-none focus:ring-2 focus:ring-[#30266D]  cursor-pointer"
            >
              <option value="confirmed">จองแล้ว</option>
              <option value="cancelled">ยกเลิก</option>
            </select>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-semibold text-[#30266D] select-none">จากวันที่</label>
              <ThaiDatePicker
                value={startDate}
                onChange={(d) => setStartDate(d)}
                displayFormat="D MMMM BBBB"
                inputClasses="px-3 py-2 border rounded-md shadow-sm w-48 focus:outline-none focus:ring-2 focus:ring-[#30266D]"
                placeholder="วัน เดือน ปี"
                maxDate={endDate || undefined}
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-semibold text-[#30266D] select-none">ถึงวันที่</label>
              <ThaiDatePicker
                value={endDate}
                onChange={(d) => setEndDate(d)}
                displayFormat="D MMMM BBBB"
                inputClasses="px-3 py-2 border rounded-md shadow-sm w-48 focus:outline-none focus:ring-2 focus:ring-[#30266D]"
                placeholder="วัน เดือน ปี"
                minDate={startDate || undefined}
              />
            </div>

            <button
              onClick={exportToCSV}
              className="ml-auto px-5 py-2 bg-gradient-to-r from-[#30266D] to-[#F9669D] text-white font-semibold rounded-md shadow hover:brightness-110 transition  cursor-pointer"
              title="ดาวน์โหลดรายงาน CSV"
            >
              ดาวน์โหลด CSV
            </button>
          </>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse border border-gray-200 shadow-sm rounded-lg">
          <thead className="bg-[#30266D] text-white select-none">
            <tr>
              <th
                className="cursor-pointer px-6 py-3 text-left font-semibold tracking-wider"
                onClick={() => onSort('fullName')}
              >
                ชื่อผู้จอง {renderSortIcon('fullName')}
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left font-semibold tracking-wider"
                onClick={() => onSort('vaccineTitle')}
              >
                วัคซีน {renderSortIcon('vaccineTitle')}
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left font-semibold tracking-wider"
                onClick={() => onSort('bookingDate')}
              >
                วันที่นัด {renderSortIcon('bookingDate')}
              </th>
              <th className="px-6 py-3 text-left font-semibold tracking-wider">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length > 0 ? (
              filteredSorted.map((b, i) => {
                const patient = b.attributes.patient?.data?.attributes;
                const vaccine = b.attributes.vaccine?.data?.attributes;
                const fullName = patient ? `${patient.first_name} ${patient.last_name}` : '-';
                const vaccineTitle = vaccine?.title || '-';
                const bookingDateRaw = b.attributes.bookingDate;
                const bookingDate = formatDateToBuddhistEra(bookingDateRaw);
                const statusRaw = b.attributes.status;
                const statusText = statusRaw === 'confirmed' ? 'จองแล้ว' : 'ยกเลิก';
                const statusColor =
                  statusRaw === 'confirmed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800';

                return (
                  <tr
                    key={b.id}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}
                  >
                    <td className="px-6 py-3 text-gray-700 font-medium whitespace-nowrap">{fullName}</td>
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap">
                      <span className="inline-block px-3 py-1 bg-pink-100 text-pink-700 text-sm font-medium rounded-full">
                        {vaccineTitle}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap">{bookingDate}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusColor}`}
                      >
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-8 select-none">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
