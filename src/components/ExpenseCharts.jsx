import React from 'react';

// Color Mapping for Expenses
export const CATEGORY_COLORS = {
  groceries: '#10b981',    // Emerald
  food: '#f59e0b',         // Amber
  fuel: '#ef4444',         // Red
  bills: '#3b82f6',        // Blue
  travel: '#06b6d4',       // Cyan
  shopping: '#ec4899',     // Pink
  entertainment: '#8b5cf6', // Purple
  medical: '#14b8a6',      // Teal
  others: '#64748b'        // Slate
};

export default function ExpenseCharts({ expenses }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="empty-chart-state glass-panel">
        <p className="text-muted">No transaction data available yet.</p>
        <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
          Record your first expense using the voice assistant to see charts.
        </p>
      </div>
    );
  }

  // 1. Group expenses by category
  const categoryTotals = expenses.reduce((acc, curr) => {
    const cat = curr.category || 'others';
    const amount = Number(curr.amount) || 0;
    acc[cat] = (acc[cat] || 0) + amount;
    return acc;
  }, {});

  // 2. Sort categories by spending amount descending
  const sortedCategories = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      color: CATEGORY_COLORS[category] || CATEGORY_COLORS.others
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalSpent = sortedCategories.reduce((sum, item) => sum + item.amount, 0);

  // 3. Compute SVG coordinates for the Donut Chart
  // Circle parameters: center=(50, 50), radius=35, circumference = 2 * pi * r = 219.91
  const radius = 30;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * radius;
  
  let accumulatedPercent = 0;
  const donutSegments = sortedCategories.map((item) => {
    const percent = totalSpent > 0 ? (item.amount / totalSpent) * 100 : 0;
    const strokeLength = (percent / 100) * circumference;
    const strokeOffset = circumference - strokeLength + (accumulatedPercent / 100) * circumference;
    
    accumulatedPercent += percent;
    return {
      ...item,
      percent,
      strokeLength,
      strokeOffset: -strokeOffset // SVG offsets are counter-clockwise when negative
    };
  });

  return (
    <div className="analytics-grid">
      
      {/* Donut Chart Visualizer */}
      <div className="glass-panel chart-card">
        <h4 className="chart-title">Spending Breakdown</h4>
        <div className="donut-chart-container">
          <div className="donut-svg-wrapper">
            <svg viewBox="0 0 100 100" className="donut-svg">
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                className="donut-bg-circle"
                strokeWidth="10"
              />
              {donutSegments.map((segment, idx) => (
                <circle
                  key={segment.category}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  stroke={segment.color}
                  strokeWidth="10"
                  strokeDasharray={`${segment.strokeLength} ${circumference}`}
                  strokeDashoffset={segment.strokeOffset}
                  strokeLinecap="round"
                  className="donut-segment"
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%',
                    transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              ))}
            </svg>
            <div className="donut-center-text">
              <span className="donut-total-label">Total</span>
              <span className="donut-total-val">₹{totalSpent.toLocaleString()}</span>
            </div>
          </div>

          <div className="donut-legend">
            {sortedCategories.slice(0, 4).map((item) => {
              const pct = totalSpent > 0 ? ((item.amount / totalSpent) * 100).toFixed(0) : 0;
              return (
                <div key={item.category} className="legend-item">
                  <span 
                    className="legend-dot" 
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="legend-name">{item.category}</span>
                  <span className="legend-val">{pct}%</span>
                </div>
              );
            })}
            {sortedCategories.length > 4 && (
              <div className="legend-item text-muted text-xs">
                <span>+ {sortedCategories.length - 4} more categories</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Bar Chart / List Progress */}
      <div className="glass-panel chart-card">
        <h4 className="chart-title">Categories</h4>
        <div className="bar-chart-list">
          {sortedCategories.map((item) => {
            const pct = totalSpent > 0 ? (item.amount / totalSpent) * 100 : 0;
            return (
              <div key={item.category} className="bar-chart-item">
                <div className="bar-info">
                  <span className="bar-category-name">{item.category}</span>
                  <span className="bar-amount">₹{item.amount.toLocaleString()}</span>
                </div>
                <div className="bar-track">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${pct}%`,
                      backgroundColor: item.color,
                      boxShadow: `0 0 10px ${item.color}40`
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
