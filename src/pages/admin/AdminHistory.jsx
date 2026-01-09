import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Filter, Search } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { api } from '../../config/api';
import { useSortableTable } from '../../hooks/useSortableTable';

export function AdminHistory() {
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    level: 'ALL',
    poNumber: '',
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getAllHistory();
      setHistoryData(response || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = historyData.filter((entry) => {
    if (filters.level !== 'ALL' && entry.level !== filters.level) return false;
    if (filters.poNumber && !entry.po_number?.toLowerCase().includes(filters.poNumber.toLowerCase())) return false;
    return true;
  });

  const { sortedData, requestSort, getSortIcon } = useSortableTable(filteredHistory);

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Change History</h1>
              <p className="text-sm text-gray-600">View all PO and line item changes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="inline w-4 h-4 mr-1" />
                PO Number
              </label>
              <input
                type="text"
                value={filters.poNumber}
                onChange={(e) => setFilters({ ...filters, poNumber: e.target.value })}
                placeholder="Search by PO number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="inline w-4 h-4 mr-1" />
                Level
              </label>
              <select
                value={filters.level}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Levels</option>
                <option value="PO">PO Level</option>
                <option value="LINE_ITEM">Line Item Level</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No history records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('changed_at')}>
                      Date/Time {getSortIcon('changed_at')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('po_number')}>
                      PO Number {getSortIcon('po_number')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('vendor_name')}>
                      Vendor {getSortIcon('vendor_name')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('level')}>
                      Level {getSortIcon('level')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('field_name')}>
                      Field {getSortIcon('field_name')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Old Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Changed By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedData.map((entry, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/admin/pos/${entry.po_id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.changed_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                        {entry.po_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {entry.vendor_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.level === 'PO'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {entry.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{entry.field_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{entry.old_value || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.new_value || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {entry.changed_by_name} ({entry.changed_by_role})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredHistory.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
