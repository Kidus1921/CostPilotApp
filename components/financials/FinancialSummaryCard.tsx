
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
    <div className="bg-base-100 p-6 rounded-2xl shadow-sm flex items-center justify-between transition-all transform hover:scale-[1.02] dark:bg-gray-800 border border-base-300 dark:border-gray-700">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <p className={`text-3xl font-bold ${color.includes('tertiary') ? 'text-brand-tertiary' : 'text-base-content dark:text-white'} transition-colors`}>
          {formatCurrency(amount)}
        </p>
      </div>
      <div className={`p-3 rounded-xl ${bgColor} transition-colors`}>
        <div className={color}>
          <FinanceIcon className="w-8 h-8"/>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummaryCard;
