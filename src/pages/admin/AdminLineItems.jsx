import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronDown } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { TableCell, TableHeader } from '../../components/TableComponents';
import { formatDate, formatPrice, formatCurrency } from '../../utils/formatters';
import { api } from '../../config/api';
import { useSortableTable } from '../../hooks/useSortableTable';

export function AdminLineItems() {
  const navigate = useNavigate();
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [vendors, setVendors] = useState([]);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const vendorDropdownRef = useRef(null);
  const monthDropdownRef = useRef(null);
  const [filters, setFilters] = useState({
    status: 'ALL',
    priority: 'ALL',
    vendor_id: 'ALL',
    month: 'ALL',
    itemName: '',
  });
  const [availableItemNames, setAvailableItemNames] = useState([]);
  const { sortedData, requestSort, getSortIcon } = useSortableTable(lineItems);

  useEffect(() => {
    fetchLineItems();
  }, [filters, page, pageSize]);

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    if (lineItems.length > 0) {
      const itemNames = [...new Set(lineItems.map(item => item.product_name).filter(Boolean))].sort();
      setAvailableItemNames(itemNames);
    }
  }, [lineItems]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target)) {
        setShowVendorDropdown(false);
      }
      // Close month dropdown when clicking outside
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target)) {
        setShowMonthDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadVendors = async () => {
    try {
      const data = await api.admin.getVendors();
      setVendors(data);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    }
  };

  const updateFilters = (nextFilters) => {
    setPage(1);
    setFilters(nextFilters);
  };

  const getFilteredVendors = () => {
    if (!vendorSearchTerm) return vendors;
    return vendors.filter(vendor =>
      vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase())
    );
  };

  const handleVendorSelect = (vendorId, vendorName) => {
    setFilters({ ...filters, vendor_id: vendorId });
    setVendorSearchTerm(vendorName);
    setShowVendorDropdown(false);
  };

  const handleVendorInputClick = () => {
    setShowVendorDropdown(true);
    if (filters.vendor_id !== 'ALL') {
      setVendorSearchTerm('');
    }
  };

  const handleVendorInputChange = (e) => {
    setVendorSearchTerm(e.target.value);
    setShowVendorDropdown(true);
  };

  // Calculate date range for month filters
  const getMonthDateRange = (filter) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    switch (filter) {
      case 'last_month':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
        return {
          start: lastMonthStart.toISOString().split('T')[0],
          end: lastMonthEnd.toISOString().split('T')[0]
        };

      case 'last_2_months':
        const twoMonthsStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        return {
          start: twoMonthsStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };

      case 'last_3_months':
        const threeMonthsStart = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        return {
          start: threeMonthsStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };

      case 'last_6_months':
        const sixMonthsStart = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        return {
          start: sixMonthsStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };

      default:
        return null;
    }
  };

  const fetchLineItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status && filters.status !== 'ALL') params.status = filters.status;
      if (filters.priority !== 'ALL') params.priority = filters.priority;
      if (filters.vendor_id !== 'ALL') params.vendor_id = filters.vendor_id;
      if (filters.itemName && filters.itemName !== '') params.items_name = filters.itemName;

      // Add month filter date range
      if (filters.month && filters.month !== 'ALL') {
        const dateRange = getMonthDateRange(filters.month);
        if (dateRange) {
          params.start_date = dateRange.start;
          params.end_date = dateRange.end;
        }
      }

      params.page = page;
      params.limit = pageSize;

      const response = await api.admin.getLineItems(params);
      setLineItems(response.items || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Failed to fetch line items:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getVisiblePageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);

    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Partially Delivered': 'bg-orange-100 text-orange-800',
      'Fully Delivered': 'bg-green-100 text-green-800',
      'Closed': 'bg-purple-100 text-purple-800',
      'Cancelled': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Line Items</h1>
              <p className="text-sm text-gray-600">View and manage all purchase order line items</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-3">
          <div className="flex gap-4 mb-4 justify-between items-end">
            <div className="flex items-center gap-x-4">
              <div className="">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-300"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Partially Delivered">Partially Delivered</option>
                  <option value="Fully Delivered">Fully Delivered</option>
                  <option value="Closed">Closed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => updateFilters({ ...filters, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-300"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="relative" ref={vendorDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendors
                </label>
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={vendorSearchTerm}
                  onChange={handleVendorInputChange}
                  onClick={handleVendorInputClick}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 w-48"
                />
                {showVendorDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-sm text-gray-500 border-b border-gray-200">
                      {vendorSearchTerm ? `Search results for "${vendorSearchTerm}"` : 'All Vendors'}
                    </div>
                    <div
                      onClick={() => {
                        setFilters({ ...filters, vendor_id: 'ALL' });
                        setVendorSearchTerm('');
                        setShowVendorDropdown(false);
                      }}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 font-medium text-blue-600"
                    >
                      All Vendors
                    </div>
                    {getFilteredVendors().length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">No vendors found</div>
                    ) : (
                      getFilteredVendors().map(vendor => (
                        <div
                          key={vendor.id}
                          onClick={() => handleVendorSelect(vendor.id, vendor.name)}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          {vendor.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {/* Month Filter */}
              <div className="relative" ref={monthDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period
                </label>
                <button
                  type="button"
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-300 min-w-[150px] text-left bg-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {filters.month === 'ALL' || filters.month === '' ? 'Select period...' :
                        filters.month === 'last_month' ? 'Last Month' :
                          filters.month === 'last_2_months' ? 'Last 2 Months' :
                            filters.month === 'last_3_months' ? 'Last 3 Months' :
                              filters.month === 'last_6_months' ? 'Last 6 Months' :
                                filters.month}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </button>

                {showMonthDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    <div className="p-2">
                      <div
                        onClick={() => {
                          updateFilters({ ...filters, month: 'ALL' });
                          setShowMonthDropdown(false);
                        }}
                        className="p-2 text-sm cursor-pointer hover:bg-gray-100 rounded"
                      >
                        All Periods
                      </div>
                      <div
                        onClick={() => {
                          updateFilters({ ...filters, month: 'last_month' });
                          setShowMonthDropdown(false);
                        }}
                        className="p-2 text-sm cursor-pointer hover:bg-gray-100 rounded"
                      >
                        Last Month
                      </div>
                      <div
                        onClick={() => {
                          updateFilters({ ...filters, month: 'last_2_months' });
                          setShowMonthDropdown(false);
                        }}
                        className="p-2 text-sm cursor-pointer hover:bg-gray-100 rounded"
                      >
                        Last 2 Months
                      </div>
                      <div
                        onClick={() => {
                          updateFilters({ ...filters, month: 'last_3_months' });
                          setShowMonthDropdown(false);
                        }}
                        className="p-2 text-sm cursor-pointer hover:bg-gray-100 rounded"
                      >
                        Last 3 Months
                      </div>
                      <div
                        onClick={() => {
                          updateFilters({ ...filters, month: 'last_6_months' });
                          setShowMonthDropdown(false);
                        }}
                        className="p-2 text-sm cursor-pointer hover:bg-gray-100 rounded"
                      >
                        Last 6 Months
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Item Name Filter */}
              <div className="">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name
                </label>
                <select
                  value={filters.itemName}
                  onChange={(e) => updateFilters({ ...filters, itemName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-300"
                >
                  <option value="">All Items</option>
                  {availableItemNames.map(itemName => (
                    <option key={itemName} value={itemName}>{itemName}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={() => {
              updateFilters({ status: 'ALL', priority: 'ALL', vendor_id: 'ALL', month: 'ALL', itemName: '' });
              setVendorSearchTerm('');
              setShowVendorDropdown(false);
              setShowMonthDropdown(false);
            }} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">Clear Filters</button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading line items...</p>
            </div>
          ) : sortedData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No line items found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('po_number')}
                    >
                      PO Number {getSortIcon('po_number')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('vendor_name')}
                    >
                      Vendor Name {getSortIcon('vendor_name')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('product_code')}
                    >
                      Product Code {getSortIcon('product_code')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('product_name')}
                    >
                      Product Name {getSortIcon('product_name')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('quantity')}
                    >
                      Quantity {getSortIcon('quantity')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('line_priority')}
                    >
                      Priority {getSortIcon('line_priority')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('expected_delivery_date')}
                    >
                      Expected Delivery {getSortIcon('expected_delivery_date')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('status')}
                    >
                      Status {getSortIcon('status')}
                    </th>
                    <TableHeader columnName="delayed">Delayed</TableHeader>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedData.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/admin/pos/${item.po_id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                        {item.po_number}
                      </td>
                      <TableCell value={item.vendor_name} columnName="vendor_name" />
                      <TableCell value={parseInt(item.product_code) || 0} columnName="product_code" />
                      <TableCell value={item.product_name} columnName="product_name" />
                      <TableCell value={item.quantity} columnName="quantity" />
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.line_priority)}`}>
                          {item.line_priority}
                        </span>
                      </td>
                      <TableCell value={item.expected_delivery_date} columnName="expected_delivery_date" type="date" />
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <TableCell value={item.is_delayed ? 'Yes' : 'No'} columnName="delayed" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && sortedData.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">
                Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPage(1);
                      setPageSize(parseInt(e.target.value, 10));
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-300"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className={`px-3 py-2 text-sm rounded-md border ${page <= 1 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    Prev
                  </button>
                  {getVisiblePageNumbers().map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`px-3 py-2 text-sm rounded-md border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className={`px-3 py-2 text-sm rounded-md border ${page >= totalPages ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div >
    </Layout >
  );
}
