
import React from 'react';

interface ProjectOverviewCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const ProjectOverviewCard: React.FC<ProjectOverviewCardProps> = ({ title, value, icon, color }) => {
  // Use a safer background mapping for brand colors
  const getBgColor = () => {
    if (color.includes('brand-primary')) return 'bg-brand-primary/10';
    if (color.includes('brand-tertiary')) return 'bg-brand-tertiary/10';
    if (color.includes('green')) return 'bg-green-500/10';
    return 'bg-gray-500/10';
  };

  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-md flex items-center justify-between transition-transform transform hover:scale-105 dark:bg-gray-800 border border-base-300 dark:border-gray-700">
      <div>
        <p className="text-sm font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-base-content mt-1 dark:text-white">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${getBgColor()}`}>
        <div className={color}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default ProjectOverviewCard;
