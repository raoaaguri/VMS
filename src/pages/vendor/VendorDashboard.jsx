import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { TableCell, TableHeader } from '../../components/TableComponents';
import { formatDate, formatPrice, formatCurrency } from '../../utils/formatters';
import { api } from '../../config/api';
import { Package, Filter, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { useSortableTable } from '../../hooks/useSortableTable';

const STATUSES = ['Cancelled', 'Fully Purchased', 'Pending', 'Partially Purchased', 'Writeoff done'];


const statusColors = {
  Draft: 'bg-gray-100 text-gray-800',
  Issued: 'bg-yellow-100 text-yellow-800',
  Acknowledged: 'bg-blue-100 text-blue-800',
  'Partially Delivered': 'bg-orange-100 text-orange-800',
  'Fully Delivered': 'bg-green-100 text-green-800',
  Closed: 'bg-purple-100 text-purple-800',
  Cancelled: 'bg-red-100 text-red-800'
};

export function VendorDashboard() {
  const [pos, setPos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    loadPos();
    loadStats();
  }, [statusFilter, priorityFilter, typeFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, typeFilter, pageSize]);

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
  };

  const loadPos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (typeFilter) params.type = typeFilter;

      // Add pagination parameters
      params.page = page;
      params.limit = pageSize;

      const data = await api.vendor.getPos(params);
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
      const data = await api.vendor.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };


  const getNearestExpectedDate = (po) => {
    if (!po.line_items || po.line_items.length === 0) return null;

    const dates = po.line_items
      .map(item => item.expected_delivery_date)
      .filter(date => date)
      .sort();

    return dates.length > 0 ? dates[0] : null;
  };

  return (
    <Layout role="vendor">
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Package className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
            <p className="text-gray-500 text-sm">View and manage your purchase orders</p>
          </div>
        </div>

        {!loadingStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">On-Time (This Month)</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.on_time_line_item_count_this_month}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delayed (This Month)</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{stats.delayed_line_item_count_this_month}</p>
                </div>
                <div className="bg-red-100 rounded-full p-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-sm font-medium text-gray-600 mb-3">Open POs by Priority</h4>
              <div className="grid grid-cols-2 gap-x-10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Low:</span>
                  <span className="font-semibold text-gray-900">{stats.open_pos_by_priority.LOW}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Medium:</span>
                  <span className="font-semibold text-blue-900">{stats.open_pos_by_priority.MEDIUM}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-orange-600">High:</span>
                  <span className="font-semibold text-orange-900">{stats.open_pos_by_priority.HIGH}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-600">Urgent:</span>
                  <span className="font-semibold text-red-900">{stats.open_pos_by_priority.URGENT}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between space-x-4 flex-wrap gap-2">
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => updateFilters({ ...{ status: e.target.value, priority: priorityFilter, type: typeFilter } })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
              >
                <option value="">All Statuses</option>
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              {/* <select
                value={priorityFilter}
                onChange={(e) => updateFilters({ ...{ status: statusFilter, priority: e.target.value, type: typeFilter } })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select> */}

              <select
                value={typeFilter}
                onChange={(e) => updateFilters({ ...{ status: statusFilter, priority: priorityFilter, type: e.target.value } })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
              >
                <option value="">All Types</option>
                <option value="NEW_ITEMS">New Items</option>
                <option value="REPEAT">Repeat</option>
              </select>
            </div>
            <button onClick={() => {
              updateFilters({ status: '', priority: '', type: '' });
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
                    <TableHeader columnName="type">Type</TableHeader>
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
                        <TableCell value={po.type.replace('_', ' ')} columnName="type" />
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[po.status]}`}>
                            {po.status}
                          </span>
                        </td>
                        <TableCell value={po.line_items_count} columnName="line_items" />
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => navigate(`/vendor/pos/${po.id}`)}
                              className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                          </div>
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
    </Layout >
  );
}
