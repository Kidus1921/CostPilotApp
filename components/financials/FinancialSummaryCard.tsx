import React from 'react';
import { FinanceIcon } from '../IconComponents';

interface FinancialSummaryCardProps {
    title: string;
    amount: number;
    totalBudget?: number;
    color?: string;
    bgColor?: string;
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({ 
    title, 
    amount, 
    totalBudget, 
    color = "text-brand-primary", 
    bgColor = "bg-brand-primary/10" 
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    }).format(value);
  };

  const percentageSpent = totalBudget && totalBudget > 0 ? (amount / totalBudget) * 100 : 0;
  
  return (
    <div className="bg-base-100 p-6 rounded-2xl shadow-sm transition-all transform hover:scale-[1.02] dark:bg-[#111111] border border-base-300 dark:border-white/10 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color.includes('tertiary') || percentageSpent > 100 ? 'text-brand-tertiary' : 'text-base-content dark:text-white'} tracking-tighter`}>
            {formatCurrency(amount)}
          </p>
          {totalBudget !== undefined && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">
              of {formatCurrency(totalBudget)} Budget
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgColor} flex-shrink-0`}>
          <div className={color}>
            <FinanceIcon className="w-8 h-8"/>
          </div>
        </div>
      </div>

      {totalBudget !== undefined && (
        <div className="mt-2">
          <div className="w-full bg-base-200 dark:bg-white/5 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out ${percentageSpent > 100 ? 'bg-brand-tertiary shadow-[0_0_8px_rgba(196,16,52,0.4)]' : 'bg-brand-primary'}`} 
              style={{ width: `${Math.min(percentageSpent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
             <span className={`text-[9px] font-bold uppercase tracking-widest ${percentageSpent > 100 ? 'text-brand-tertiary' : 'text-brand-primary'}`}>
                {percentageSpent.toFixed(1)}% Consumed
             </span>
             {percentageSpent > 100 && (
                <span className="text-[9px] font-bold text-brand-tertiary uppercase tracking-widest animate-pulse">Alert: Ceiling Exceeded</span>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialSummaryCard;