import React, { useState } from 'react';
import { Trash2, Search, Filter, ArrowUpDown, Calendar } from 'lucide-react';
import { CATEGORY_COLORS } from './ExpenseCharts';

export default function ExpenseList({ expenses, onDeleteExpense }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState('date'); // 'date' | 'amount'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  const categories = ['groceries', 'food', 'fuel', 'bills', 'travel', 'shopping', 'entertainment', 'medical', 'others'];

  // Toggle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter and Search Logic
  const filteredExpenses = expenses.filter(item => {
    const matchesSearch = item.note?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(item.amount).includes(searchTerm);
    const matchesCategory = categoryFilter === '' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Sort Logic
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let aVal = sortField === 'amount' ? Number(a.amount) : a.date;
    let bVal = sortField === 'amount' ? Number(b.amount) : b.date;

    if (sortField === 'date') {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="glass-panel list-card">
      <div className="list-header">
        <h3 className="list-title">Expense Records</h3>
        
        {/* Controls: Search and Filter */}
        <div className="list-controls">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search note or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-select-wrapper">
            <Filter size={16} className="filter-icon" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {sortedExpenses.length === 0 ? (
        <div className="empty-list-state">
          <p className="text-muted">No transactions match your criteria.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="expense-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('date')} className="sortable-header">
                  <div className="header-cell">
                    Date <ArrowUpDown size={14} className="sort-icon-indicator" />
                  </div>
                </th>
                <th>Category</th>
                <th onClick={() => handleSort('amount')} className="sortable-header text-right">
                  <div className="header-cell justify-end">
                    Amount <ArrowUpDown size={14} className="sort-icon-indicator" />
                  </div>
                </th>
                <th>Notes</th>
                <th className="action-th"></th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map((expense) => (
                <tr key={expense.id} className="expense-row">
                  <td className="date-cell">
                    <Calendar size={14} className="text-muted" style={{ marginRight: '6px' }} />
                    {formatDate(expense.date)}
                  </td>
                  <td>
                    <span 
                      className="category-badge"
                      style={{ 
                        '--badge-color': CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.others,
                        '--badge-bg': `${CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.others}18`
                      }}
                    >
                      {expense.category || 'others'}
                    </span>
                  </td>
                  <td className="amount-cell text-right text-semibold">
                    ₹{Number(expense.amount || 0).toLocaleString()}
                  </td>
                  <td className="note-cell text-muted" title={expense.note}>
                    {expense.note}
                  </td>
                  <td className="action-cell">
                    <button 
                      onClick={() => onDeleteExpense(expense.id)}
                      className="btn-icon-delete"
                      aria-label="Delete expense"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
