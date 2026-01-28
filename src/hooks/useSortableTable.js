import { useState, useMemo } from "react";

export function useSortableTable(data, config = {}) {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  const toComparable = (value) => {
    if (value === null || value === undefined)
      return { type: "null", value: null };

    if (value instanceof Date) {
      const time = value.getTime();
      return { type: "number", value: Number.isNaN(time) ? null : time };
    }

    if (typeof value === "number") {
      return { type: "number", value: Number.isNaN(value) ? null : value };
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "" && /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
        const num = parseFloat(trimmed);
        return { type: "number", value: Number.isNaN(num) ? trimmed : num };
      }
      return { type: "string", value: trimmed };
    }

    return { type: "string", value: String(value) };
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      const aComp = toComparable(aValue);
      const bComp = toComparable(bValue);

      if (aComp.type === "null") return 1;
      if (bComp.type === "null") return -1;

      if (aComp.type === "number" && bComp.type === "number") {
        if (aComp.value < bComp.value)
          return sortConfig.direction === "asc" ? -1 : 1;
        if (aComp.value > bComp.value)
          return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      }

      const aStr = aComp.type === "string" ? aComp.value : String(aComp.value);
      const bStr = bComp.type === "string" ? bComp.value : String(bComp.value);

      const cmp = aStr.localeCompare(bStr, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [data, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return "⇅";
    }
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  return { sortedData, requestSort, getSortIcon, sortConfig };
}
