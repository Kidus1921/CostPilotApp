import React from 'react';
import { FinanceIcon } from '../IconComponents';

interface FinancialSummaryCardProps {
    title: string;
    amount: number;
    color: string;
    bgColor: string;
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({ title, amount, color, bgColor }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);
  };

  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-md flex items-center justify-between transition-transform transform hover:scale-105 dark:bg-gray-800">
      <div>
        <p className="text-sm font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-base-content mt-1 dark:text-white">{formatCurrency(amount)}</p>
      </div>
      <div className={`p-3 rounded-full ${bgColor} dark:bg-opacity-20`}>
        <div className={color}>
          <FinanceIcon className="w-8 h-8"/>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummaryCard;
