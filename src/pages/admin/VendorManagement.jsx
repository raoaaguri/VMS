import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { TableCell, TableHeader } from '../../components/TableComponents';
import { formatDate, formatPrice, formatCurrency } from '../../utils/formatters';
import { api } from '../../config/api';
import { Building, Plus, ArrowLeft, Edit, X, CheckCircle, XCircle, ChevronDown } from 'lucide-react';

export function VendorManagement() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, active, rejected
  const [expandedActionsId, setExpandedActionsId] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalModalData, setApprovalModalData] = useState({ vendor: null, action: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const navigate = useNavigate();

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, pageSize]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Filter vendors based on selected status
  const filteredVendors = vendors.filter(vendor => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return vendor.status === 'PENDING_APPROVAL';
    if (filterStatus === 'active') return vendor.status === 'ACTIVE' && vendor.is_active === true;
    if (filterStatus === 'inactive') return vendor.is_active === false;
    if (filterStatus === 'rejected') return vendor.status === 'REJECTED';
    return true;
  });

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / pageSize));

  const getVisiblePageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);

    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const paginatedVendors = filteredVendors.slice((page - 1) * pageSize, page * pageSize);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.admin.getVendors();
      setVendors(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVendor = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const vendorData = {
      name: formData.get('name'),
      code: formData.get('code'),
      contact_person: formData.get('contact_person'),
      contact_email: formData.get('contact_email'),
      contact_phone: formData.get('contact_phone'),
      address: formData.get('address'),
      gst_number: formData.get('gst_number'),
      is_active: formData.get('is_active') === 'true'
    };

    try {
      if (editingVendor) {
        await api.admin.updateVendor(editingVendor.id, vendorData);
        setSuccess('Vendor updated successfully');
      } else {
        await api.admin.createVendor(vendorData);
        setSuccess('Vendor created successfully');
      }
      await loadVendors();
      setShowVendorForm(false);
      setEditingVendor(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password')
    };

    try {
      await api.admin.createVendorUser(showUserForm, userData);
      setSuccess('Vendor user created successfully');
      setShowUserForm(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditForm = (vendor) => {
    setEditingVendor(vendor);
    setShowVendorForm(true);
  };

  const openApprovalModal = (vendor, action) => {
    setApprovalModalData({ vendor, action });
    setShowApprovalModal(true);
    setExpandedActionsId(null);
  };

  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setApprovalModalData({ vendor: null, action: null });
  };

  const handleApproveVendor = async (vendorId) => {
    try {
      await api.admin.approveVendor(vendorId);
      setSuccess('Vendor approved successfully!');
      await loadVendors();
      closeApprovalModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectVendor = async (vendorId) => {
    try {
      await api.admin.rejectVendor(vendorId);
      setSuccess('Vendor rejected successfully');
      await loadVendors();
      closeApprovalModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleVendorStatus = async (vendorId, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} this vendor?`)) {
      return;
    }

    try {
      await api.admin.toggleVendorActiveStatus(vendorId, newStatus);
      setSuccess(`Vendor ${action}d successfully`);
      await loadVendors();
      setExpandedActionsId(null);
    } catch (err) {
      setError(err.message);
    }
  };


  return (
    <Layout role="admin">
      <div className="space-y-6">
        {/* Header */}
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
              <Building className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
                <p className="text-gray-500 text-sm">Manage vendors, approvals, and access</p>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingVendor(null);
                setShowVendorForm(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vendor</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'All Vendors', count: vendors.length },
              { value: 'pending', label: 'Pending', count: vendors.filter(v => v.status === 'PENDING_APPROVAL').length },
              { value: 'active', label: 'Active', count: vendors.filter(v => v.status === 'ACTIVE' && v.is_active === true).length },
              { value: 'inactive', label: 'Inactive', count: vendors.filter(v => !v.is_active).length },
              { value: 'rejected', label: 'Rejected', count: vendors.filter(v => v.status === 'REJECTED').length }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => {
                  setFilterStatus(tab.value);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === tab.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {tab.label} <span className="ml-2 text-xs bg-gray-200 rounded-full px-2 py-1">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {showVendorForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowVendorForm(false);
                      setEditingVendor(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmitVendor} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vendor Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={editingVendor?.name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vendor Code *
                      </label>
                      <input
                        type="text"
                        name="code"
                        required
                        defaultValue={editingVendor?.code}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Person *
                      </label>
                      <input
                        type="text"
                        name="contact_person"
                        required
                        defaultValue={editingVendor?.contact_person}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Email *
                      </label>
                      <input
                        type="email"
                        name="contact_email"
                        required
                        defaultValue={editingVendor?.contact_email}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        name="contact_phone"
                        defaultValue={editingVendor?.contact_phone}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GST Number
                      </label>
                      <input
                        type="text"
                        name="gst_number"
                        defaultValue={editingVendor?.gst_number}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      name="address"
                      rows="3"
                      defaultValue={editingVendor?.address}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="is_active"
                      defaultValue={editingVendor?.is_active !== false ? 'true' : 'false'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowVendorForm(false);
                        setEditingVendor(null);
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showUserForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Create Vendor User</h2>
                  <button
                    onClick={() => setShowUserForm(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmitUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Create User
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUserForm(null)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading vendors...</div>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-12 text-center text-gray-500">
              <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No {filterStatus !== 'all' ? filterStatus : ''} vendors found</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <TableHeader columnName="name">Vendor Name</TableHeader>
                    <TableHeader columnName="code">Code</TableHeader>
                    <TableHeader columnName="contact">Contact</TableHeader>
                    <TableHeader columnName="approval_status">Approval Status</TableHeader>
                    <TableHeader columnName="active_status">Active Status</TableHeader>
                    <TableHeader columnName="actions">Actions</TableHeader>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedVendors.map(vendor => (
                    <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell value={vendor.name} columnName="name" />
                      <TableCell value={vendor.code || '-'} columnName="code" />
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <p className="font-medium text-gray-900">{vendor.contact_person}</p>
                          <p className="text-xs text-gray-400">{vendor.contact_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${vendor.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : vendor.status === 'PENDING_APPROVAL'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                          }`}>
                          {vendor.status === 'PENDING_APPROVAL' ? '⏳ Pending' : vendor.status === 'ACTIVE' ? '✓ Active' : '✕ Rejected'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleVendorStatus(vendor.id, vendor.is_active)}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${vendor.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                        >
                          {vendor.is_active ? '🟢 Active' : '⭕ Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm relative">
                        <div className="relative group">
                          <button
                            onClick={() => setExpandedActionsId(expandedActionsId === vendor.id ? null : vendor.id)}
                            className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="More actions"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {expandedActionsId === vendor.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              {vendor.status === 'PENDING_APPROVAL' && (
                                <>
                                  <button
                                    onClick={() => openApprovalModal(vendor, 'approve')}
                                    className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 font-medium flex items-center space-x-2 border-b border-gray-100"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Approve Vendor</span>
                                  </button>
                                  <button
                                    onClick={() => openApprovalModal(vendor, 'reject')}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium flex items-center space-x-2"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    <span>Reject Vendor</span>
                                  </button>
                                </>
                              )}

                              {vendor.status === 'ACTIVE' && (
                                <>
                                  <button
                                    onClick={() => openEditForm(vendor)}
                                    className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium flex items-center space-x-2 border-b border-gray-100"
                                  >
                                    <Edit className="w-4 h-4" />
                                    <span>Edit Vendor</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && paginatedVendors.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredVendors.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredVendors.length)} of {filteredVendors.length}
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

        {/* Approval Modal */}
        {showApprovalModal && approvalModalData.vendor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {approvalModalData.action === 'approve' ? 'Approve Vendor' : 'Reject Vendor'}
                  </h2>
                  <button
                    onClick={closeApprovalModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">{approvalModalData.vendor.name}</h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Code:</span> {approvalModalData.vendor.code}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Contact:</span> {approvalModalData.vendor.contact_person}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Email:</span> {approvalModalData.vendor.contact_email}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  {approvalModalData.action === 'approve' ? (
                    <p className="text-sm text-yellow-800">
                      <span className="font-medium">⚠️ Note:</span> Once approved, this vendor will be able to login and access the system.
                    </p>
                  ) : (
                    <p className="text-sm text-yellow-800">
                      <span className="font-medium">⚠️ Note:</span> Once rejected, this vendor will not be able to login. This action cannot be undone.
                    </p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={closeApprovalModal}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (approvalModalData.action === 'approve') {
                        handleApproveVendor(approvalModalData.vendor.id);
                      } else {
                        handleRejectVendor(approvalModalData.vendor.id);
                      }
                    }}
                    className={`flex-1 text-white py-2 px-4 rounded-lg transition-colors font-medium ${approvalModalData.action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                      }`}
                  >
                    {approvalModalData.action === 'approve' ? 'Approve' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
