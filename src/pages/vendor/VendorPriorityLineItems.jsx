import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { TableCell, TableHeader } from '../../components/TableComponents';
import { formatDate, formatPrice, formatCurrency } from '../../utils/formatters';
import { api } from '../../config/api';
import { Package, Filter, Eye, CheckCircle, AlertCircle, ChevronDown, ArrowLeft } from 'lucide-react';
import { useSortableTable } from '../../hooks/useSortableTable';

const STATUSES = ['Pending', 'Partially Delivered', 'Fully Delivered', 'Closed', 'Cancelled'];

const statusColors = {
  'Pending': 'bg-blue-100 text-blue-800',
  'Partially Delivered': 'bg-orange-100 text-orange-800',
  'Fully Delivered': 'bg-green-100 text-green-800',
  'Closed': 'bg-purple-100 text-purple-800',
  'Cancelled': 'bg-red-100 text-red-800'
};

const priorityColors = {
  'LOW': 'text-gray-600',
  'MEDIUM': 'text-blue-600',
  'HIGH': 'text-orange-600',
  'URGENT': 'text-red-600'
};

export function VendorPriorityLineItems() {
  const { priority } = useParams();
  const navigate = useNavigate();
  const [lineItems, setLineItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState(['Pending', 'Partially Delivered']);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [itemNameFilter, setItemNameFilter] = useState('');
  const [styleFilter, setStyleFilter] = useState('ALL');
  const [availableFilters, setAvailableFilters] = useState({
    categories: [],
    itemNames: [],
    styles: []
  });
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef(null);

  // Initialize sortable table with item_name as default sort
  const { sortedData, requestSort, getSortIcon } = useSortableTable(lineItems, {
    defaultSortKey: 'product_name',
    defaultDirection: 'asc'
  });

  useEffect(() => {
    loadPriorityLineItems();
  }, [priority, statusFilter, categoryFilter, itemNameFilter, styleFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, itemNameFilter, styleFilter, pageSize]);

  useEffect(() => {
    // Extract available filters from loaded line items
    extractAvailableFilters();
  }, [lineItems]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPriorityLineItems = async () => {
    try {
      setLoading(true);
      const params = {
        priority: priority,
        page: page,
        limit: pageSize  // Backend expects 'limit' not 'pageSize'
      };

      if (statusFilter && statusFilter.length > 0) params.status = statusFilter;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (itemNameFilter) params.itemName = itemNameFilter;
      if (styleFilter !== 'ALL') params.style = styleFilter;

      const response = await api.vendor.getLineItemsByPriority(params);
      setLineItems(response.items || []);  // Use "items" instead of "data"
      setTotal(response.total || response.items?.length || 0);  // Handle missing total
    } catch (err) {
      console.error('Failed to load priority line items:', err);
      setError('Failed to load line items');
    } finally {
      setLoading(false);
    }
  };

  const extractAvailableFilters = () => {
    if (!lineItems || lineItems.length === 0) return;

    const categories = new Set();
    const itemNames = new Set();
    const styles = new Set();

    lineItems.forEach(item => {
      // Extract categories
      if (item.category) categories.add(item.category);
      else if (item.region) categories.add(item.region);

      // Extract item names
      if (item.product_name) itemNames.add(item.product_name);

      // Extract styles
      if (item.style) styles.add(item.style);
    });

    setAvailableFilters({
      categories: Array.from(categories).sort(),
      itemNames: Array.from(itemNames).sort(),
      styles: Array.from(styles).sort(),
    });
  };

  const updateFilters = (nextFilters) => {
    setPage(1);
    setStatusFilter(nextFilters.status);
    setCategoryFilter(nextFilters.category);
    setItemNameFilter(nextFilters.itemName);
    setStyleFilter(nextFilters.style);
  };

  const filteredLineItems = sortedData.filter(item => {
    const statusMatch = statusFilter.length === 0 || statusFilter.includes(item.status);

    // Category filter
    const categoryMatch = categoryFilter === 'ALL' ||
      (item.category && item.category === categoryFilter) ||
      (!item.category && item.region === categoryFilter);

    // Item Name filter
    const itemNameMatch = itemNameFilter === '' ||
      item.product_name === itemNameFilter;

    // Style filter
    const styleMatch = styleFilter === 'ALL' || item.style === styleFilter;

    return statusMatch && categoryMatch && itemNameMatch && styleMatch;
  });

  const getPriorityDisplayName = (priority) => {
    const names = {
      'LOW': 'Low',
      'MEDIUM': 'Medium',
      'HIGH': 'High',
      'URGENT': 'Urgent'
    };
    return names[priority] || priority;
  };

  const getStatusColor = (status) => {
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    return priorityColors[priority] || 'text-gray-600';
  };

  return (
    <Layout role="vendor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/vendor/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <Package className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              PO Line Items - {getPriorityDisplayName(priority)} Priority
            </h1>
            <p className="text-sm text-gray-600">
              All line items with {getPriorityDisplayName(priority).toLowerCase()} priority
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between space-x-4 flex-wrap gap-2">
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              <Filter className="w-5 h-5 text-gray-400" />

              {/* Status Filter */}
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:border-gray-300 flex items-center space-x-2"
                >
                  <span>Status ({statusFilter.length})</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showStatusDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      {STATUSES.map(status => (
                        <label key={status} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={statusFilter.includes(status)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setStatusFilter([...statusFilter, status]);
                              } else {
                                setStatusFilter(statusFilter.filter(s => s !== status));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
              >
                <option value="ALL">All Categories</option>
                {availableFilters.categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {/* Item Name Filter */}
              <select
                value={itemNameFilter}
                onChange={(e) => setItemNameFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
              >
                <option value="">All Items</option>
                {availableFilters.itemNames.map(itemName => (
                  <option key={itemName} value={itemName}>{itemName}</option>
                ))}
              </select>

              {/* Style Filter */}
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
              >
                <option value="ALL">All Styles</option>
                {availableFilters.styles.map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>

            <button onClick={() => {
              setStatusFilter(['Pending', 'Partially Delivered']);
              setCategoryFilter('ALL');
              setItemNameFilter('');
              setStyleFilter('ALL');
            }} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
              Clear Filters
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredLineItems.length}</span> of{' '}
              <span className="font-semibold">{total}</span> {getPriorityDisplayName(priority).toLowerCase()} priority line items
            </p>

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:border-gray-300"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              {error}
            </div>
          ) : filteredLineItems.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              No line items found for {getPriorityDisplayName(priority).toLowerCase()} priority
            </div>
          ) : (
            <div className="overflow-x-auto overflow-scroll">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <TableHeader
                      columnName="design_code"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('design_code')}
                    >
                      Design No
                    </TableHeader>
                    <TableHeader
                      columnName="combination_code"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('combination_code')}
                    >
                      Combination ID
                    </TableHeader>
                    <TableHeader
                      columnName="product_name"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('product_name')}
                    >
                      Item Name
                    </TableHeader>
                    <TableHeader
                      columnName="style"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('style')}
                    >
                      Style
                    </TableHeader>
                    <TableHeader
                      columnName="color"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('color')}
                    >
                      Color
                    </TableHeader>
                    <TableHeader
                      columnName="sub_color"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('sub_color')}
                    >
                      Sub-Color
                    </TableHeader>
                    <TableHeader
                      columnName="polish"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('polish')}
                    >
                      Polish
                    </TableHeader>
                    <TableHeader
                      columnName="size"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('size')}
                    >
                      Size
                    </TableHeader>
                    <TableHeader
                      columnName="weight"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('weight')}
                    >
                      Weight
                    </TableHeader>
                    <TableHeader
                      columnName="quantity"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('quantity')}
                    >
                      Order Qty
                    </TableHeader>
                    <TableHeader
                      columnName="received_qty"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('received_qty')}
                    >
                      Delivered Qty
                    </TableHeader>
                    <TableHeader
                      columnName="pending_qty"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('pending_qty')}
                    >
                      Pending Qty
                    </TableHeader>
                    <TableHeader
                      columnName="price"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('price')}
                    >
                      Price
                    </TableHeader>
                    <TableHeader
                      columnName="expected_delivery_date"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('expected_delivery_date')}
                    >
                      Expected Delivery Date
                    </TableHeader>
                    <TableHeader
                      columnName="status"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('status')}
                    >
                      Status
                    </TableHeader>
                    <TableHeader
                      columnName="priority"
                      sortable={true}
                      onSort={requestSort}
                      sortDirection={getSortIcon('priority')}
                    >
                      Priority
                    </TableHeader>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLineItems.length === 0 && (
                    <tr>
                      <td colSpan="17" className="px-4 py-8 text-center text-gray-500">
                        No line items match the selected filters
                      </td>
                    </tr>
                  )}
                  {filteredLineItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <TableCell value={parseInt(item.design_code) || 0} columnName="design_code" />
                      <TableCell
                        value={item.combination_code || 0}
                        columnName="combination_code"
                      />
                      <TableCell value={item.product_name} columnName="product_name" />
                      <TableCell value={item.style || '-'} columnName="style" />
                      <TableCell value={item.color || '-'} columnName="color" />
                      <TableCell value={item.sub_color || '-'} columnName="sub_color" />
                      <TableCell value={item.polish || '-'} columnName="polish" />
                      <TableCell value={item.size || '-'} columnName="size" />
                      <TableCell value={item.weight || '-'} columnName="weight" />
                      <TableCell value={item.quantity || 0} columnName="quantity" />
                      <TableCell value={item.received_qty || 0} columnName="received_qty" />
                      <TableCell
                        value={(parseInt(item.quantity) - parseInt(item.received_qty || 0)) || 0}
                        columnName="pending_qty"
                      />
                      <TableCell value={formatPrice(item.price)} columnName="price" />
                      <TableCell
                        value={item.expected_delivery_date ? formatDate(item.expected_delivery_date) : '-'}
                        columnName="expected_delivery_date"
                      />
                      <TableCell
                        value={
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                            {item.status || 'Unknown'}
                          </span>
                        }
                        columnName="status"
                      />
                      <TableCell
                        value={
                          <span className={`font-medium ${getPriorityColor(item.line_priority)}`}>
                            {getPriorityDisplayName(item.line_priority)}
                          </span>
                        }
                        columnName="priority"
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {page} of {Math.ceil(total / pageSize)}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / pageSize)}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
