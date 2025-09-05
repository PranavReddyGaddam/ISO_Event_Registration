/**
 * Pagination component - Reusable pagination controls.
 */

import React from 'react';
import { PaginationMeta } from '../types';

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeSelector = true,
  className = ''
}) => {
  const { current_page, total_pages, has_next, has_prev, total, limit } = pagination;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (total_pages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages with ellipsis
      if (current_page <= 3) {
        // Show first pages
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total_pages);
      } else if (current_page >= total_pages - 2) {
        // Show last pages
        pages.push(1);
        pages.push('...');
        for (let i = total_pages - 3; i <= total_pages; i++) {
          pages.push(i);
        }
      } else {
        // Show middle pages
        pages.push(1);
        pages.push('...');
        for (let i = current_page - 1; i <= current_page + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total_pages);
      }
    }
    
    return pages;
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(event.target.value);
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  const startItem = (current_page - 1) * limit + 1;
  const endItem = Math.min(current_page * limit, total);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4 ${className}`}>
      {/* Page info */}
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </div>

      {/* Page size selector */}
      {showPageSizeSelector && onPageSizeChange && (
        <div className="flex items-center space-x-2">
          <label htmlFor="page-size" className="text-sm text-gray-700">
            Show:
          </label>
          <select
            id="page-size"
            value={limit}
            onChange={handlePageSizeChange}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700">per page</span>
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center space-x-1">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(current_page - 1)}
          disabled={!has_prev}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          Previous
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-3 py-2 text-sm text-gray-500">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={`px-3 py-2 text-sm font-medium border-t border-b ${
                  page === current_page
                    ? 'text-blue-600 bg-blue-50 border-blue-300'
                    : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}

        {/* Next button */}
        <button
          onClick={() => onPageChange(current_page + 1)}
          disabled={!has_next}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
