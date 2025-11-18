

import React from 'react';
import { FinanceIcon } from './IconComponents';

interface FinancialSummaryCardProps {
  totalBudget: number;
  totalSpent: number;
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({ totalBudget, totalSpent }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const variance = totalBudget - totalSpent;
  const percentageSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  const getVarianceColor = () => {
    if (variance > 0) return 'text-green-500';
    if (variance < 0) return 'text-red-500';
    return 'text-base-content-secondary';
  }

  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-md transition-transform transform hover:scale-105 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Financial Summary</p>
        <div className="p-3 rounded-full bg-brand-secondary bg-opacity-20">
          <FinanceIcon className="w-8 h-8 text-brand-secondary" />
        </div>
      </div>
      <div className="mt-2">
        <p className="text-3xl font-bold text-base-content dark:text-white">{formatCurrency(totalSpent)}</p>
        <p className="text-sm text-base-content-secondary dark:text-gray-400">spent of {formatCurrency(totalBudget)}</p>
      </div>
      <div className="mt-4">
          <div className="w-full bg-base-200 rounded-full h-2.5 dark:bg-gray-700">
              <div 
                  className="bg-brand-primary h-2.5 rounded-full" 
                  style={{ width: `${percentageSpent > 100 ? 100 : percentageSpent}%` }}>
              </div>
          </div>
          <div className="flex justify-between text-xs font-medium text-base-content-secondary mt-1 dark:text-gray-400">
              <span>Budget Utilized</span>
              <span>{percentageSpent.toFixed(0)}%</span>
          </div>
      </div>
    </div>
  );
};

export default FinancialSummaryCard;