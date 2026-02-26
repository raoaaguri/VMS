import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronDown, Filter } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { TableCell, TableHeader } from '../../components/TableComponents';
import { formatDate, formatPrice, formatCurrency } from '../../utils/formatters';
import { api } from '../../config/api';
import { useSortableTable } from '../../hooks/useSortableTable';

const STATUSES = ['Pending', 'Partially Delivered', 'Fully Delivered', 'Closed', 'Cancelled'];

export function VendorLineItems() {
  const navigate = useNavigate();
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    status: ['Pending', 'Partially Delivered'],
    priority: 'ALL',
    itemName: '',
  });
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef(null);
  const [availableItemNames, setAvailableItemNames] = useState([]);
  const { sortedData, requestSort, getSortIcon } = useSortableTable(lineItems);

  useEffect(() => {
    fetchLineItems();
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (lineItems.length > 0) {
      const itemNames = [...new Set(lineItems.map(item => item.product_name).filter(Boolean))].sort();
      setAvailableItemNames(itemNames);
    }
  }, [lineItems]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
      // Close status dropdown when clicking outside
      if (!event.target.closest('.status-dropdown-container')) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const updateFilters = (nextFilters) => {
    setPage(1);
    setFilters(nextFilters);
  };

  const fetchLineItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status && filters.status.length > 0) params.status = filters.status;
      if (filters.priority !== 'ALL') params.priority = filters.priority;
      if (filters.itemName && filters.itemName !== '') {
        params.items_name = filters.itemName;
      }

      params.page = page;
      params.limit = pageSize;

      const response = await api.vendor.getLineItems(params);
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
    <Layout role="vendor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Line Items</h1>
              <p className="text-sm text-gray-600">View and track all your purchase order line items</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-4 mb-6 justify-between items-end">
            <div className="flex items-center gap-x-4">
              <div className="">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative status-dropdown-container">
                    <button
                      type="button"
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-300 min-w-[150px] text-left bg-white"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {filters.status.length === 0 ? 'Select statuses...' :
                            filters.status.length === 1 ? filters.status[0] :
                              `${filters.status.length} statuses selected`}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>

                    {showStatusDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        <div className="p-2">
                          <label className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.status.includes('Partially Delivered')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters({ ...filters, status: [...filters.status, 'Partially Delivered'] });
                                } else {
                                  setFilters({ ...filters, status: filters.status.filter(s => s !== 'Partially Delivered') });
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">Partially Delivered</span>
                          </label>
                          <label className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.status.includes('Pending')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters({ ...filters, status: [...filters.status, 'Pending'] });
                                } else {
                                  setFilters({ ...filters, status: filters.status.filter(s => s !== 'Pending') });
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">Pending</span>
                          </label>
                          {STATUSES.filter(status => !['Pending', 'Partially Delivered'].includes(status)).map(status => (
                            <label key={status} className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={filters.status.includes(status)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFilters({ ...filters, status: [...filters.status, status] });
                                  } else {
                                    setFilters({ ...filters, status: filters.status.filter(s => s !== status) });
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm">{status}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => updateFilters({ ...filters, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name
                </label>
                <select
                  value={filters.itemName}
                  onChange={(e) => updateFilters({ ...filters, itemName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Items</option>
                  {availableItemNames.map(itemName => (
                    <option key={itemName} value={itemName}>{itemName}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={() => {
              updateFilters({ status: ['Pending', 'Partially Delivered'], priority: 'ALL', itemName: '' });
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
                      onClick={() => requestSort('ReceivedQty')}
                    >
                      Received Qty {getSortIcon('ReceivedQty')}
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
                      onClick={() => navigate(`/vendor/pos/${item.po_id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                        {item.po_number}
                      </td>
                      <TableCell value={parseInt(item.product_code) || 0} columnName="product_code" />
                      <TableCell value={item.product_name} columnName="product_name" />
                      <TableCell value={item.quantity} columnName="quantity" />
                      <TableCell value={item.received_qty || 0} columnName="received_qty" />
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
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      </div>
    </Layout>
  );
}
