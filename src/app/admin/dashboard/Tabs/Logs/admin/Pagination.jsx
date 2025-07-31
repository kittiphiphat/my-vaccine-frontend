'use client';

import React from 'react';

export default function Pagination({ totalPages, currentPage, onPageChange }) {
  if (totalPages === 0) return null;

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className="flex justify-end items-center gap-2 mt-6 flex-wrap">


      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded-2xl border text-sm font-medium transition cursor-pointer ${
            currentPage === page
              ? 'bg-[#30266D] text-white'
              : 'bg-white text-[#30266D] hover:bg-gray-100'
          }`}
        >
          {page}
        </button>
      ))}


    </div>
  );
}
