import { formatDate, formatPrice, formatCurrency, getColumnAlignment } from '../utils/formatters';

/**
 * Reusable table cell component with automatic formatting
 */
export function TableCell({
  value,
  columnName,
  type = 'text',
  currency = '₹',
  className = '',
  onClick = null
}) {
  // Determine formatting based on type or column name
  let formattedValue = value;
  let alignmentClass = getColumnAlignment(columnName);

  switch (type) {
    case 'date':
      formattedValue = formatDate(value);
      break;
    case 'price':
      formattedValue = formatPrice(value);
      alignmentClass = 'text-right';
      break;
    case 'currency':
      formattedValue = formatCurrency(value, currency);
      alignmentClass = 'text-right';
      break;
    default:
      // Auto-detect based on column name
      if (columnName && columnName.toLowerCase().includes('date')) {
        formattedValue = formatDate(value);
      } else if (columnName && (columnName.toLowerCase().includes('price') ||
        columnName.toLowerCase().includes('amount') ||
        columnName.toLowerCase().includes('cost'))) {
        formattedValue = formatCurrency(value, currency);
      }
  }

  const cellClasses = `px-4 py-3 text-sm ${alignmentClass} ${className}`.trim();

  if (onClick) {
    return (
      <td
        className={`${cellClasses} cursor-pointer hover:bg-blue-50 text-blue-600 hover:text-blue-800`}
        onClick={onClick}
      >
        {formattedValue}
      </td>
    );
  }

  return (
    <td className={cellClasses}>
      {formattedValue}
    </td>
  );
}

/**
 * Table header component with proper alignment
 */
export function TableHeader({
  children,
  columnName,
  className = '',
  sortable = false,
  onSort = null,
  sortDirection = null
}) {
  const alignmentClass = getColumnAlignment(columnName);
  const headerClasses = `px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${alignmentClass} ${className}`.trim();

  if (sortable && onSort) {
    const sortIcon = sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : '';

    return (
      <th
        className={`${headerClasses} cursor-pointer hover:bg-gray-100`}
        onClick={() => onSort(columnName)}
      >
        {children}
        {sortIcon && <span className="ml-1">{sortIcon}</span>}
      </th>
    );
  }

  return (
    <th className={headerClasses}>
      {children}
    </th>
  );
}
