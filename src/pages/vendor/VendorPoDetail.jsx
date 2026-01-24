import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Toast, useToast } from '../../components/Toast';
import { Loader } from '../../components/Loader';
import { api } from '../../config/api';
import { ArrowLeft, Package, Building, CheckCircle, Calendar, History, X, Filter } from 'lucide-react';

const STATUSES = ['ACCEPTED', 'PLANNED', 'DELIVERED'];

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

export function VendorPoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, showSuccess, showError } = useToast();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [acceptDates, setAcceptDates] = useState({});
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lineItemFilters, setLineItemFilters] = useState({ status: 'ALL', priority: 'ALL' });
  const [updatingItemId, setUpdatingItemId] = useState(null);

  useEffect(() => {
    loadPo();
  }, [id]);

  const loadPo = async () => {
    try {
      setLoading(true);
      const data = await api.vendor.getPoById(id);
      setPo(data);

      const dates = {};
      data.line_items.forEach(item => {
        dates[item.id] = item.expected_delivery_date || '';
      });
      setAcceptDates(dates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await api.vendor.getPoHistory(id);
      setHistory(data);
      setShowHistory(true);
    } catch (err) {
      alert('Failed to load history: ' + err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAcceptPo = async () => {
    try {
      setIsProcessing(true);
      const lineItems = po.line_items.map(item => ({
        line_item_id: item.id,
        expected_delivery_date: acceptDates[item.id]
      }));

      const allDatesProvided = lineItems.every(item => item.expected_delivery_date);

      if (!allDatesProvided) {
        showError('Please provide expected delivery dates for all line items');
        setIsProcessing(false);
        return;
      }

      await api.vendor.acceptPo(id, lineItems);
      showSuccess('PO accepted successfully!');
      await loadPo();
      setShowAcceptForm(false);
      setError('');
    } catch (err) {
      showError(err.message);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateExpectedDate = async (lineItemId, date) => {
    try {
      setIsProcessing(true);
      setUpdatingItemId(lineItemId);
      await api.vendor.updateLineItemExpectedDate(id, lineItemId, date);
      setPo({
        ...po,
        line_items: po.line_items.map(item =>
          item.id === lineItemId ? { ...item, expected_delivery_date: date } : item
        )
      });
      setError('');
      showSuccess('Expected delivery date updated successfully!');
    } catch (err) {
      showError(err.message);
      setError(err.message);
    } finally {
      setUpdatingItemId(null);
      setIsProcessing(false);
    }
  };

  const handleDateChange = async (lineItemId, newDate, currentDate) => {
    // Only make API call if the new date is different from the current date
    if (newDate && newDate !== currentDate) {
      await handleUpdateExpectedDate(lineItemId, newDate);
    }
  };

  const handleUpdateLineItemStatus = async (lineItemId, status) => {
    try {
      setIsProcessing(true);
      await api.vendor.updateLineItemStatus(id, lineItemId, status);
      showSuccess('Line item status updated successfully!');
      await loadPo();
    } catch (err) {
      showError(err.message);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLineItems = (po?.line_items || []).filter(item => {
    if (lineItemFilters.status !== 'ALL' && item.status !== lineItemFilters.status) return false;
    if (lineItemFilters.priority !== 'ALL' && item.line_priority !== lineItemFilters.priority) return false;
    return true;
  });

  if (loading) {
    return (
      <Layout role="vendor">
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  if (error && !po) {
    return (
      <Layout role="vendor">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || 'PO not found'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="vendor">
      <Loader isLoading={isProcessing} message="Processing update..." />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => { }} />}
      <div className="">
        <div>
          <button
            onClick={() => navigate(window.history.back())}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PO #{po.po_number}</h1>
                <p className="text-gray-500 text-sm">Purchase Order Details</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={loadHistory}
                disabled={loadingHistory}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <History className="w-4 h-4" />
                <span>{loadingHistory ? 'Loading...' : 'View History'}</span>
              </button>

              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[po.status]}`}>
                {po.status}
              </span>

              {po.status === 'CREATED' && (
                <button
                  onClick={() => setShowAcceptForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Accept PO</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Order Information</span>
            </h2>

            <div className="space-y-3">
              <div className='flex items-center gap-x-3'>
                <label className="text-sm text-gray-500">PO Date :</label>
                <p className="text-gray-900 font-medium">
                  {new Date(po.po_date).toLocaleDateString()}
                </p>
              </div>

              <div className='flex items-center gap-x-3'>
                <label className="text-sm text-gray-500">Type :</label>
                <p className="text-gray-900 font-medium">{po.type.replace('_', ' ')}</p>
              </div>

              <div className='flex items-center gap-x-3'>
                <label className="text-sm text-gray-500">Priority :</label>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[po.priority]}`}>
                  {po.priority}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Vendor Information</span>
            </h2>

            <div className="space-y-3">
              <div className='flex items-center gap-x-3'
              >
                <label className="text-sm text-gray-500">Vendor Name :</label>
                <p className="text-gray-900 font-medium">{po.vendor?.name}</p>
              </div>

              <div className='flex items-center gap-x-3'
              >
                <label className="text-sm text-gray-500">Contact Person :</label>
                <p className="text-gray-900 font-medium">{po.vendor?.contact_person}</p>
              </div>

              <div className='flex items-center gap-x-3'
              >
                <label className="text-sm text-gray-500">Contact Email :</label>
                <p className="text-gray-900 font-medium">{po.vendor?.contact_email}</p>
              </div>
            </div>
          </div>
        </div>

        {showAcceptForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Accept Purchase Order
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide expected delivery dates for all line items to accept this PO.
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h2>

          <div className="flex gap-4 mb-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={lineItemFilters.status}
                onChange={(e) => setLineItemFilters({ ...lineItemFilters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="CREATED">Created</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="PLANNED">Planned</option>
                <option value="DELIVERED">Delivered</option>
              </select>
              <select
                value={lineItemFilters.priority}
                onChange={(e) => setLineItemFilters({ ...lineItemFilters, priority: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <button onClick={() => {
              setLineItemFilters({ status: 'ALL', priority: 'ALL' });
            }} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">Clear Filters</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Design Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">combination Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Style</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub-Style	</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub-Color</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Polish</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST%</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">MRP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLineItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{item.design_code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.combination_code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.style || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.sub_style || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.region || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.color || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.sub_color || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.polish || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.size || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.weight || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.received_qty || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.gst_percent}%</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.price}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.mrp}</td>
                    <td className="px-4 py-3 text-sm">
                      {showAcceptForm || (item.status !== 'DELIVERED' && item.status !== 'CREATED') ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={item.expected_delivery_date || ''}
                            onChange={(e) => handleDateChange(item.id, e.target.value, item.expected_delivery_date || '')}
                            disabled={item.status === 'DELIVERED'}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          {updatingItemId === item.id && (
                            <span className="text-blue-500 text-xs whitespace-nowrap">Updating...</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">
                          {item.expected_delivery_date
                            ? new Date(item.expected_delivery_date).toLocaleDateString()
                            : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showAcceptForm && (
            <div className="mt-6 flex space-x-3">
              <button
                onClick={handleAcceptPo}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Confirm Acceptance
              </button>
              <button
                onClick={() => setShowAcceptForm(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-screen overflow-auto mx-4">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">PO History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performed By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Old Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                          No history available
                        </td>
                      </tr>
                    ) : (
                      history.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {new Date(entry.changed_at).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            }).replace(/ /g, "-")}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {entry.users?.name} ({entry.changed_by_role})
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${entry.level === 'PO' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                              {entry.level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{entry.field_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{entry.old_value || '-'}</td>
                          <td className="px-4 py-3 text-sm font-medium">{entry.new_value || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
