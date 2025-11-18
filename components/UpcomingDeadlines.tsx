

import React from 'react';
import { Project } from '../types';
import { ClockIcon } from './IconComponents';

interface UpcomingDeadlinesProps {
  projects: Project[];
}

const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ projects }) => {
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff < 0) return { days: 0, text: 'Overdue', color: 'text-red-500' };
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    
    if (days <= 7) return { days, text: `${days} days left`, color: 'text-red-500' };
    if (days <= 30) return { days, text: `${days} days left`, color: 'text-yellow-500' };
    return { days, text: `${days} days left`, color: 'text-green-500' };
  };

  const upcomingProjects = projects
    .filter(p => p.status !== 'Completed')
    .map(p => ({ ...p, deadlineInfo: getDaysRemaining(p.endDate) }))
    .sort((a, b) => a.deadlineInfo.days - b.deadlineInfo.days)
    .slice(0, 5);

  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-md h-full dark:bg-gray-800">
      <h3 className="text-lg font-bold text-base-content flex items-center dark:text-white">
        <ClockIcon className="w-6 h-6 mr-2 text-brand-primary"/>
        Upcoming Deadlines
      </h3>
      <div className="mt-4 space-y-4">
        {upcomingProjects.length > 0 ? (
          upcomingProjects.map(project => (
            <div key={project.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-base-content dark:text-gray-100">{project.title}</p>
                <p className="text-sm text-base-content-secondary dark:text-gray-400">{new Date(project.endDate).toLocaleDateString()}</p>
              </div>
              <div className={`text-sm font-bold ${project.deadlineInfo.color}`}>
                {project.deadlineInfo.text}
              </div>
            </div>
          ))
        ) : (
          <p className="text-base-content-secondary text-center py-4 dark:text-gray-400">No upcoming deadlines.</p>
        )}
      </div>
    </div>
  );
};

export default UpcomingDeadlines;