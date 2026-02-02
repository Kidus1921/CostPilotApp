import React from 'react';

interface ProjectOverviewCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const ProjectOverviewCard: React.FC<ProjectOverviewCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-md flex items-center justify-between transition-transform transform hover:scale-105 dark:bg-[#111111] border border-base-300 dark:border-white/10">
      <div>
        <p className="text-sm font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-base-content mt-1 dark:text-white">{value}</p>
      </div>
      <div className={`p-3 rounded-full bg-opacity-20 ${color.replace('text-', 'bg-')}`}>
        <div className={color}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default ProjectOverviewCard;