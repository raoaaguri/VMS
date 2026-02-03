import { useState } from 'react';
import { X, Package, DollarSign, Calendar, User } from 'lucide-react';

/**
 * Product details popup component
 */
export function ProductPopup({
  isOpen,
  onClose,
  product
}) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Product Details</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Image */}
            <div className="col-span-1">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                {parseInt(product.combination_code) ? (
                  <img
                    src={'https://kushals-hq-prod.s3.ap-south-1.amazonaws.com/images/' + parseInt(product.combination_code) + '.jpg'}
                    alt={product.product_name || product.name || 'Product Image'}
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="text-gray-400 text-center" style={{ display: parseInt(product.combination_code) ? 'none' : 'flex' }}>
                  <Package className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-sm">No Image Available</p>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="col-span-1 space-y-4">
              {/* Product Name */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {product.product_name || product.name || 'Unknown Product'}
                </h3>
                <p className="text-sm text-gray-600">
                  Combination No: <span className="font-medium">{parseInt(product.combination_code) || product.product_code || '-'}</span>
                </p>
              </div>

              {/* Product Information Grid */}
              <div className="space-y-3">
                {product.product_code && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Product Code:</span>
                    <span className="text-sm font-medium text-gray-900">{product.product_code}</span>
                  </div>
                )}

                {parseInt(product.combination_code) && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Design No:</span>
                    <span className="text-sm font-medium text-gray-900">{parseInt(product.design_code)}</span>
                  </div>
                )}

                {product.unit_price !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Unit Price:
                    </span>
                    <span className="text-sm font-medium text-gray-900">₹{parseFloat(product.unit_price).toFixed(2)}</span>
                  </div>
                )}

                {product.quantity !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Quantity:</span>
                    <span className="text-sm font-medium text-gray-900">{product.quantity}</span>
                  </div>
                )}

                {product.total_amount !== undefined && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Total Amount:
                    </span>
                    <span className="text-sm font-medium text-gray-900">₹{parseFloat(product.total_amount).toFixed(2)}</span>
                  </div>
                )}

                {product.specifications && (
                  <div className="py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600 block mb-2">Specifications:</span>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{product.specifications}</p>
                  </div>
                )}

                {product.description && (
                  <div className="py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600 block mb-2">Description:</span>
                    <p className="text-sm text-gray-900">{product.description}</p>
                  </div>
                )}

                {product.expected_delivery_date && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Expected Delivery:
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(product.expected_delivery_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}

                {product.status && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${product.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      product.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        product.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                      }`}>
                      {product.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Details Section */}
          {(product.notes || product.remarks || product.vendor_name) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Information</h4>
              <div className="space-y-2">
                {product.vendor_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>Vendor: {product.vendor_name}</span>
                  </div>
                )}
                {product.notes && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Notes: </span>
                    {product.notes}
                  </div>
                )}
                {product.remarks && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Remarks: </span>
                    {product.remarks}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
