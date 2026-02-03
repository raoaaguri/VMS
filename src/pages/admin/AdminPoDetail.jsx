import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Toast, useToast } from '../../components/Toast';
import { Loader } from '../../components/Loader';
import { TableCell, TableHeader } from '../../components/TableComponents';
import { ProductPopup } from '../../components/ProductPopup';
import { formatDate, formatPrice, formatCurrency } from '../../utils/formatters';
import { api } from '../../config/api';
import { ArrowLeft, Package, Building, Calendar, AlertCircle, History, X, Filter, Download, ChevronDown } from 'lucide-react';

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
  const { toast, showSuccess, showError } = useToast();


  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [editingPoPriority, setEditingPoPriority] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lineItemPage, setLineItemPage] = useState(1);
  const [lineItemPageSize, setLineItemPageSize] = useState(10);
  const [lineItemFilters, setLineItemFilters] = useState({ status: 'ALL', priority: 'ALL' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductPopup, setShowProductPopup] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  useEffect(() => {
    loadPo();
  }, [id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  // Add handler for product popup
  const handleProductClick = (item) => {
    setSelectedProduct(item);
    setShowProductPopup(true);
  };

  const closeProductPopup = () => {
    setShowProductPopup(false);
    setSelectedProduct(null);
  };

  const exportPOData = () => {
    if (!po) return;

    // Create CSV content
    const headers = [
      'Design Code',
      'Combination Code',
      'Product Name',
      'Style',
      'Sub-Style',
      'Region',
      'Color',
      'Sub-Color',
      'Polish',
      'Size',
      'Weight',
      'Quantity',
      'Delivered Qty',
      'Pending Qty',
      'GST%',
      'Price',
      'MRP',
      'Expected Date',
      'Status',
      'Priority'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredLineItems.map(item => [
        parseInt(item.design_code) || 0,
        parseInt(item.combination_code) || 0,
        `"${item.product_name || ''}"`,
        `"${item.style || ''}"`,
        `"${item.sub_style || ''}"`,
        `"${item.region || ''}"`,
        `"${item.color || ''}"`,
        `"${item.sub_color || ''}"`,
        `"${item.polish || ''}"`,
        `"${item.size || ''}"`,
        item.weight || 0,
        item.quantity || 0,
        item.received_qty || 0,
        (item.quantity || 0) - (item.received_qty || 0),
        item.gst_percent || 0,
        item.price || 0,
        item.mrp || 0,
        formatDate(item.expected_delivery_date),
        `"${item.status || ''}"`,
        `"${item.line_priority || ''}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `PO_${po.po_number}_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportDropdown(false);
    showSuccess('PO data exported successfully!');
  };

  const exportWithImage = () => {
    // For now, just show a message that this is not implemented
    setShowExportDropdown(false);
    showError('Export with images feature coming soon!');
  };

  useEffect(() => {
    setLineItemPage(1);
  }, [lineItemFilters, lineItemPageSize]);


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

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await api.admin.getPoHistory(id);
      setHistory(data);
      setShowHistory(true);
    } catch (err) {
      alert('Failed to load history: ' + err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdatePoPriority = async (priority) => {
    try {
      setIsProcessing(true);
      await api.admin.updatePoPriority(id, priority);
      setPo({ ...po, priority });
      setEditingPoPriority(false);
      showSuccess('PO priority updated successfully!');
    } catch (err) {
      showError(err.message);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateLineItemPriority = async (lineItemId, priority) => {
    try {
      setIsProcessing(true);
      await api.admin.updateLineItemPriority(id, lineItemId, priority);
      setPo({
        ...po,
        line_items: po.line_items.map(item =>
          item.id === lineItemId ? { ...item, line_priority: priority } : item
        )
      });
      setEditingLineItem(null);
      showSuccess('Line item priority updated successfully!');
    } catch (err) {
      showError(err.message);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLineItems = po?.line_items?.filter(item => {
    const statusMatch = lineItemFilters.status === 'ALL' || item.status === lineItemFilters.status;
    const priorityMatch = lineItemFilters.priority === 'ALL' || item.line_priority === lineItemFilters.priority;
    return statusMatch && priorityMatch;
  }) || [];

  const totalLineItems = filteredLineItems.length;
  const totalPagesLineItems = Math.max(1, Math.ceil(totalLineItems / lineItemPageSize));
  const startIndex = (lineItemPage - 1) * lineItemPageSize;
  const endIndex = startIndex + lineItemPageSize;
  const paginatedLineItems = filteredLineItems.slice(startIndex, endIndex);

  const getVisiblePageNumbersLineItems = () => {
    if (totalPagesLineItems <= 5) return Array.from({ length: totalPagesLineItems }, (_, i) => i + 1);

    let start = Math.max(1, lineItemPage - 2);
    let end = Math.min(totalPagesLineItems, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  if (loading) {
    return (
      <Layout role="admin">
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  if (error || !po) {
    return (
      <Layout role="admin">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || 'PO not found'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <Loader isLoading={isProcessing} message="Processing update..." />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => { }} />}
      <div className="space-y-6">
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

              <div className="relative export-dropdown">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export PO</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={exportPOData}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Just Data</span>
                    </button>
                    <button
                      onClick={exportWithImage}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Package className="w-4 h-4" />
                      <span>With Images</span>
                    </button>
                  </div>
                )}
              </div>

              {/* <button className='bg-orange-500 px-4 py-2 text-white rounded-lg hover:bg-orange-600' disabled>Pending</button> */}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Order Information</span>
            </h2>

            <div className="grid grid-cols-2 gap-x-2">
              <div className="space-y-3">
                <div className='flex items-center gap-x-3'>
                  <label className="text-sm text-gray-500">PO Date :</label>
                  <p className="text-gray-900 font-medium text-sm">
                    {formatDate(po.po_date)}
                  </p>
                </div>

                <div className='flex items-center gap-x-3'>
                  <label className="text-sm text-gray-500">Type :</label>
                  <p className="text-gray-900 font-medium text-sm">{po.type.replace('_', ' ')}</p>
                </div>

                <div className='flex items-center gap-x-3'>
                  <label className="text-sm text-gray-500 block mb-2">Priority :</label>
                  {editingPoPriority ? (
                    <div className="flex items-center space-x-2">
                      <select
                        defaultValue={po.priority}
                        onChange={(e) => handleUpdatePoPriority(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
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
              </div>

              <div className="">
                <div className='flex items-center gap-x-3'>
                  <label className="text-sm text-gray-500">Status :</label>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full bg-yellow-300 ${statusColors[po.status]}`}>
                    {po.status}
                  </span>
                </div>
                {po.erp_reference_id && (
                  <div className='flex items-center gap-x-3'>
                    <label className="text-sm text-gray-500">ERP Reference</label>
                    <p className="text-gray-900 font-medium text-sm">{po.erp_reference_id}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Vendor Information</span>
            </h2>

            <div className="grid grid-cols-2 gap-x-2 space-y-2">
              <div className='flex items-center gap-x-3'>
                <label className="text-sm text-gray-500">Vendor Name :</label>
                <p className="text-gray-900 font-medium text-sm">{po.vendor?.name}</p>
              </div>

              <div className='flex items-center gap-x-3'>
                <label className="text-sm text-gray-500">Vendor Code :</label>
                <p className="text-gray-900 font-medium text-sm">{po.vendor?.code}</p>
              </div>

              <div className='flex items-center gap-x-3'>
                <label className="text-sm text-gray-500">Contact Person :</label>
                <p className="text-gray-900 font-medium text-sm">{po.vendor?.contact_person}</p>
              </div>

              <div className='flex items-center gap-x-3'>
                <label className="text-sm text-gray-500">Contact Email :</label>
                <p className="text-gray-900 font-medium text-sm">{po.vendor?.contact_email}</p>
              </div>

              {po.vendor?.contact_phone && (
                <div className='flex items-center gap-x-3'>
                  <label className="text-sm text-gray-500">Contact Phone :</label>
                  <p className="text-gray-900 font-medium text-sm">{po.vendor.contact_phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h2>

          <div className="flex gap-4 mb-4 justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={lineItemFilters.status}
                onChange={(e) => setLineItemFilters({ ...lineItemFilters, status: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
              >
                <option value="ALL">All Statuses</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Fully Purchased">Fully Purchased</option>
                <option value="Pending">Pending</option>
                <option value="Partially Purchased">Partially Purchased</option>
                <option value="Writeoff done">Writeoff done</option>
              </select>

              <select
                value={lineItemFilters.priority}
                onChange={(e) => setLineItemFilters({ ...lineItemFilters, priority: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-300"
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

          <div className="overflow-x-auto overflow-scroll">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <TableHeader columnName="design_code">Design Code</TableHeader>
                  <TableHeader columnName="combination_code">Combination Code</TableHeader>
                  <TableHeader columnName="product_name">Product Name</TableHeader>
                  <TableHeader columnName="style">Style</TableHeader>
                  <TableHeader columnName="sub_style">Sub-Style</TableHeader>
                  <TableHeader columnName="region">Region</TableHeader>
                  <TableHeader columnName="color">Color</TableHeader>
                  <TableHeader columnName="sub_color">Sub-Color</TableHeader>
                  <TableHeader columnName="polish">Polish</TableHeader>
                  <TableHeader columnName="size">Size</TableHeader>
                  <TableHeader columnName="weight">Weight</TableHeader>
                  <TableHeader columnName="quantity">Quantity</TableHeader>
                  <TableHeader columnName="received_qty">Delivered Qty</TableHeader>
                  <TableHeader columnName="pending_qty">Pending Qty</TableHeader>
                  <TableHeader columnName="gst_percent">GST%</TableHeader>
                  <TableHeader columnName="price">Price</TableHeader>
                  <TableHeader columnName="mrp">MRP</TableHeader>
                  <TableHeader columnName="expected_delivery_date">Expected Date</TableHeader>
                  <TableHeader columnName="status">Status</TableHeader>
                  <TableHeader columnName="priority">Priority</TableHeader>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedLineItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <TableCell value={parseInt(item.design_code) || 0} columnName="design_code" />
                    <TableCell
                      value={parseInt(item.combination_code) || 0}
                      columnName="combination_code"
                      onClick={() => handleProductClick(item)}
                    />
                    <TableCell value={item.product_name} columnName="product_name" />
                    <TableCell value={item.style} columnName="style" />
                    <TableCell value={item.sub_style} columnName="sub_style" />
                    <TableCell value={item.region} columnName="region" />
                    <TableCell value={item.color} columnName="color" />
                    <TableCell value={item.sub_color} columnName="sub_color" />
                    <TableCell value={item.polish} columnName="polish" />
                    <TableCell value={item.size} columnName="size" />
                    <TableCell value={item.weight} columnName="weight" type="price" />
                    <TableCell value={item.quantity} columnName="quantity" />
                    <TableCell value={item.received_qty || 0} columnName="received_qty" />
                    <TableCell value={(item.quantity || 0) - (item.received_qty || 0)} columnName="pending_qty" />
                    <TableCell value={item.gst_percent} columnName="gst_percent" />
                    <TableCell value={item.price} columnName="price" type="currency" />
                    <TableCell value={item.mrp} columnName="mrp" type="currency" />
                    <TableCell value={item.expected_delivery_date} columnName="expected_delivery_date" type="date" />
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingLineItem === item.id ? (
                        <select
                          defaultValue={item.line_priority}
                          onChange={(e) => handleUpdateLineItemPriority(item.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-gray-300"
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginatedLineItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No line items match the selected filters
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {totalLineItems === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalLineItems)} of {totalLineItems} line items
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page</span>
                <select
                  value={lineItemPageSize}
                  onChange={(e) => {
                    setLineItemPage(1);
                    setLineItemPageSize(parseInt(e.target.value, 10));
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
                  onClick={() => setLineItemPage((p) => Math.max(1, p - 1))}
                  disabled={lineItemPage <= 1}
                  className={`px-3 py-2 text-sm rounded-md border ${lineItemPage <= 1 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                  Prev
                </button>
                {getVisiblePageNumbersLineItems().map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setLineItemPage(p)}
                    className={`px-3 py-2 text-sm rounded-md border ${p === lineItemPage ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setLineItemPage((p) => Math.min(totalPagesLineItems, p + 1))}
                  disabled={lineItemPage >= totalPagesLineItems}
                  className={`px-3 py-2 text-sm rounded-md border ${lineItemPage >= totalPagesLineItems ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-50 flex items-center justify-center z-50" id='historyPopUp'>
          <div className="bg-white rounded-lg shadow-lg pt-0 px-6 pb-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pt-4 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">PO History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
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
                          {formatDate(entry.changed_at)}
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

      {/* Product Popup */}
      <ProductPopup
        isOpen={showProductPopup}
        onClose={closeProductPopup}
        product={selectedProduct}
      />
    </Layout>
  );
}
