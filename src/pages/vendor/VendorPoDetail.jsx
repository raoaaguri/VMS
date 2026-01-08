import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { api } from '../../config/api';
import { ArrowLeft, Package, Building, CheckCircle, Calendar } from 'lucide-react';

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

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptDates, setAcceptDates] = useState({});
  const [showAcceptForm, setShowAcceptForm] = useState(false);

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

  const handleAcceptPo = async () => {
    try {
      const lineItems = po.line_items.map(item => ({
        line_item_id: item.id,
        expected_delivery_date: acceptDates[item.id]
      }));

      const allDatesProvided = lineItems.every(item => item.expected_delivery_date);

      if (!allDatesProvided) {
        setError('Please provide expected delivery dates for all line items');
        return;
      }

      await api.vendor.acceptPo(id, lineItems);
      await loadPo();
      setShowAcceptForm(false);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateExpectedDate = async (lineItemId, date) => {
    try {
      await api.vendor.updateLineItemExpectedDate(id, lineItemId, date);
      setPo({
        ...po,
        line_items: po.line_items.map(item =>
          item.id === lineItemId ? { ...item, expected_delivery_date: date } : item
        )
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateLineItemStatus = async (lineItemId, status) => {
    try {
      await api.vendor.updateLineItemStatus(id, lineItemId, status);
      await loadPo();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  if (error && !po) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || 'PO not found'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <button
            onClick={() => navigate('/vendor/dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PO #{po.po_number}</h1>
                <p className="text-gray-500 text-sm">Purchase Order Details</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Order Information</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">PO Date</label>
                <p className="text-gray-900 font-medium">
                  {new Date(po.po_date).toLocaleDateString()}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Type</label>
                <p className="text-gray-900 font-medium">{po.type.replace('_', ' ')}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Priority</label>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[po.priority]}`}>
                  {po.priority}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Vendor Information</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">Vendor Name</label>
                <p className="text-gray-900 font-medium">{po.vendors?.name}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Contact Person</label>
                <p className="text-gray-900 font-medium">{po.vendors?.contact_person}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Contact Email</label>
                <p className="text-gray-900 font-medium">{po.vendors?.contact_email}</p>
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST%</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {po.line_items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{item.product_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.gst_percent}%</td>
                    <td className="px-4 py-3 text-sm text-gray-500">${item.price}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">${item.mrp}</td>
                    <td className="px-4 py-3 text-sm">
                      {showAcceptForm || (item.status !== 'DELIVERED' && item.status !== 'CREATED') ? (
                        <input
                          type="date"
                          value={acceptDates[item.id] || ''}
                          onChange={(e) => {
                            if (showAcceptForm) {
                              setAcceptDates({ ...acceptDates, [item.id]: e.target.value });
                            } else {
                              handleUpdateExpectedDate(item.id, e.target.value);
                            }
                          }}
                          disabled={item.status === 'DELIVERED'}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
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
                    <td className="px-4 py-3 text-sm">
                      {!showAcceptForm && item.status !== 'DELIVERED' && item.status !== 'CREATED' && (
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateLineItemStatus(item.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          {STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      )}
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
      </div>
    </Layout>
  );
}
