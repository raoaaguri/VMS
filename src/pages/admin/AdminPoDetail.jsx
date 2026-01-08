import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { api } from '../../config/api';
import { ArrowLeft, Package, Building, Calendar, AlertCircle } from 'lucide-react';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

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

export function AdminPoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPoPriority, setEditingPoPriority] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState(null);

  useEffect(() => {
    loadPo();
  }, [id]);

  const loadPo = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getPoById(id);
      setPo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePoPriority = async (priority) => {
    try {
      await api.admin.updatePoPriority(id, priority);
      setPo({ ...po, priority });
      setEditingPoPriority(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateLineItemPriority = async (lineItemId, priority) => {
    try {
      await api.admin.updateLineItemPriority(id, lineItemId, priority);
      setPo({
        ...po,
        line_items: po.line_items.map(item =>
          item.id === lineItemId ? { ...item, line_priority: priority } : item
        )
      });
      setEditingLineItem(null);
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

  if (error || !po) {
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
            onClick={() => navigate('/admin/dashboard')}
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

            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[po.status]}`}>
              {po.status}
            </span>
          </div>
        </div>

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
                <label className="text-sm text-gray-500 block mb-2">Priority</label>
                {editingPoPriority ? (
                  <div className="flex items-center space-x-2">
                    <select
                      defaultValue={po.priority}
                      onChange={(e) => handleUpdatePoPriority(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={po.status === 'DELIVERED'}
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setEditingPoPriority(false)}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[po.priority]}`}>
                      {po.priority}
                    </span>
                    {po.status !== 'DELIVERED' && (
                      <button
                        onClick={() => setEditingPoPriority(true)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>

              {po.erp_reference_id && (
                <div>
                  <label className="text-sm text-gray-500">ERP Reference</label>
                  <p className="text-gray-900 font-medium">{po.erp_reference_id}</p>
                </div>
              )}
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
                <label className="text-sm text-gray-500">Vendor Code</label>
                <p className="text-gray-900 font-medium">{po.vendors?.code}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Contact Person</label>
                <p className="text-gray-900 font-medium">{po.vendors?.contact_person}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Contact Email</label>
                <p className="text-gray-900 font-medium">{po.vendors?.contact_email}</p>
              </div>

              {po.vendors?.contact_phone && (
                <div>
                  <label className="text-sm text-gray-500">Contact Phone</label>
                  <p className="text-gray-900 font-medium">{po.vendors.contact_phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>

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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Line Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
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
                      {editingLineItem === item.id ? (
                        <select
                          defaultValue={item.line_priority}
                          onChange={(e) => handleUpdateLineItemPriority(item.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                          disabled={item.status === 'DELIVERED'}
                        >
                          {PRIORITIES.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[item.line_priority]}`}>
                            {item.line_priority}
                          </span>
                          {item.status !== 'DELIVERED' && (
                            <button
                              onClick={() => setEditingLineItem(item.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.expected_delivery_date
                        ? new Date(item.expected_delivery_date).toLocaleDateString()
                        : '-'}
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
        </div>
      </div>
    </Layout>
  );
}
