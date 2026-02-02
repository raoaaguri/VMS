import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { TableCell, TableHeader } from '../../components/TableComponents';
import { formatDate, formatPrice, formatCurrency } from '../../utils/formatters';
import { api } from '../../config/api';
import { Toast, useToast } from '../../components/Toast';
import { useSortableTable } from '../../hooks/useSortableTable';
import { Package, Filter, Eye, AlertCircle, Clock, CheckCircle, TrendingUp } from 'lucide-react';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
// const STATUSES = ['CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED'];
const STATUSES = ['Cancelled', 'Fully Purchased', 'Pending', 'Partially Purchased', 'Writeoff done'];

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800'
};

const statusColors = {
  CREATED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  PLANNED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800'
};

export function AdminDashboard() {
  const { toast, showSuccess, showError } = useToast();

  const [pos, setPos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [vendors, setVendors] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const vendorDropdownRef = useRef(null);


  const navigate = useNavigate();

  useEffect(() => {
    loadPos();
    loadStats();
    loadVendors();
  }, [statusFilter, priorityFilter, typeFilter, vendorFilter, page, pageSize]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target)) {
        setShowVendorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, typeFilter, vendorFilter, pageSize]);

  useEffect(() => {
    // Extract types from the loaded PO data
    if (pos.length > 0) {
      const types = [...new Set(pos.map(po => po.type).filter(Boolean))];
      setAvailableTypes(types.sort());
    }
  }, [pos]);

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

  const updateFilters = (nextFilters) => {
    setPage(1);
    setStatusFilter(nextFilters.status);
    setPriorityFilter(nextFilters.priority);
    setTypeFilter(nextFilters.type);
    setVendorFilter(nextFilters.vendor_id);
  };

  const getFilteredVendors = () => {
    if (!vendorSearchTerm) return vendors;
    return vendors.filter(vendor =>
      vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase())
    );
  };

  const handleVendorSelect = (vendorId, vendorName) => {
    setVendorFilter(vendorId);
    setVendorSearchTerm(vendorName);
    setShowVendorDropdown(false);
    updateFilters({
      status: statusFilter,
      priority: priorityFilter,
      type: typeFilter,
      vendor_id: vendorId
    });
  };

  const handleVendorInputClick = () => {
    setShowVendorDropdown(true);
    if (vendorFilter) {
      setVendorSearchTerm('');
    }
  };

  const handleVendorInputChange = (e) => {
    setVendorSearchTerm(e.target.value);
    setShowVendorDropdown(true);
  };

  const loadPos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (typeFilter) params.type = typeFilter;
      if (vendorFilter) params.vendor_id = vendorFilter;

      // Add pagination parameters
      params.page = page;
      params.limit = pageSize;

      const data = await api.admin.getPos(params);
      // Handle both paginated and non-paginated response formats
      if (data && typeof data === 'object') {
        if (data.items && Array.isArray(data.items)) {
          // Paginated response
          setPos(data.items);
          setTotal(data.total || data.items.length);
        } else if (Array.isArray(data)) {
          // Direct array response
          setPos(data);
          setTotal(data.length);
        } else {
          // Fallback
          setPos([]);
          setTotal(0);
        }
      } else {
        setPos([]);
        setTotal(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const data = await api.admin.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadVendors = async () => {
    try {
      const data = await api.admin.getVendors();
      setVendors(data);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    }
  };


  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-500 text-sm">Monitor purchase orders and performance</p>
            </div>
          </div>

        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => { }} />}


        {!loadingStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delayed POs</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{stats.delayed_po_count}</p>
                </div>
                <div className="bg-red-100 rounded-full p-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delivering Today</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.delivering_today_po_count}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delivered (Month)</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.delivered_po_counts.this_month}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">On-Time Rate</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.on_time_delivery_rate}%</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 col-span-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Open POs by Priority</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">{stats.open_pos_by_priority.LOW}</p>
                  <p className="text-sm text-gray-500 mt-1">Low</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.open_pos_by_priority.MEDIUM}</p>
                  <p className="text-sm text-blue-500 mt-1">Medium</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{stats.open_pos_by_priority.HIGH}</p>
                  <p className="text-sm text-orange-500 mt-1">High</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{stats.open_pos_by_priority.URGENT}</p>
                  <p className="text-sm text-red-500 mt-1">Urgent</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => updateFilters({ ...{ status: e.target.value, priority: priorityFilter, type: typeFilter, vendor_id: vendorFilter } })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
              >
                <option value="">All Statuses</option>
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => updateFilters({ ...{ status: statusFilter, priority: e.target.value, type: typeFilter, vendor_id: vendorFilter } })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => updateFilters({ ...{ status: statusFilter, priority: priorityFilter, type: e.target.value, vendor_id: vendorFilter } })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
              >
                <option value="">All Types</option>
                <option value="NEW_ITEMS">New Items</option>
                <option value="REPEAT">Repeat</option>
              </select>
              <div className="relative" ref={vendorDropdownRef}>
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
            </div>
            <button onClick={() => {
              updateFilters({ status: '', priority: '', type: '', vendor_id: '' });
              setVendorSearchTerm('');
              setShowVendorDropdown(false);
            }} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">Clear Filters</button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <TableHeader columnName="po_number">PO Number</TableHeader>
                    <TableHeader columnName="po_date">PO Date</TableHeader>
                    <TableHeader columnName="vendor">Vendor</TableHeader>
                    <TableHeader columnName="type">Type</TableHeader>
                    <TableHeader columnName="priority">Priority</TableHeader>
                    <TableHeader columnName="status">Status</TableHeader>
                    <TableHeader columnName="line_items">Line Items</TableHeader>
                    <TableHeader columnName="actions">Actions</TableHeader>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pos.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        No purchase orders found
                      </td>
                    </tr>
                  ) : (
                    pos.map(po => (
                      <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell value={po.po_number} columnName="po_number" />
                        <TableCell value={po.po_date} columnName="po_date" type="date" />
                        <TableCell value={po.vendor?.name || 'N/A'} columnName="vendor" />
                        <TableCell value={po.type.replace('_', ' ')} columnName="type" />
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[po.priority]}`}>
                            {po.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[po.status]}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {po.line_items_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => navigate(`/admin/pos/${po.id}`)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && pos.length > 0 && (
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
    </Layout>
  );
}
