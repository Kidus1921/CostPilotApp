
import React from 'react';

interface ProjectOverviewCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const ProjectOverviewCard: React.FC<ProjectOverviewCardProps> = ({ title, value, icon, color }) => {
  const getBgColor = () => {
    if (color.includes('brand-primary')) return 'bg-brand-primary/10';
    if (color.includes('brand-tertiary')) return 'bg-brand-tertiary/10';
    if (color.includes('green')) return 'bg-green-500/10';
    return 'bg-gray-500/10';
  };

  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-md flex items-center justify-between transition-transform transform hover:scale-105 dark:bg-[#111111] border border-base-300 dark:border-white/10 relative overflow-hidden group">
      {/* Background Watermark Icon */}
      <div className={`absolute -right-6 -bottom-6 opacity-[0.04] dark:opacity-[0.07] pointer-events-none transform scale-[3.5] rotate-[-12deg] z-0 transition-transform duration-500 group-hover:scale-[4] group-hover:rotate-[-5deg] ${color}`}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-24 h-24" }) : icon}
      </div>

      <div className="relative z-10">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-base-content mt-1 dark:text-white tracking-tighter">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${getBgColor()} relative z-10`}>
        <div className={color}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default ProjectOverviewCard;
