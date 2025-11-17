
import React from 'react';
import { Activity } from '../types';
import { FolderIcon, CheckCircleIcon, ReportsIcon, FinanceIcon } from './IconComponents';

interface RecentActivityProps {
  activities: Activity[];
}

const ActivityIcon: React.FC<{ type: Activity['type'] }> = ({ type }) => {
    const iconMap = {
        project: <FolderIcon className="w-5 h-5 text-blue-500" />,
        task: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
        report: <ReportsIcon className="w-5 h-5 text-purple-500" />,
        finance: <FinanceIcon className="w-5 h-5 text-orange-500" />,
    };
    const colorMap = {
        project: 'bg-blue-100',
        task: 'bg-green-100',
        report: 'bg-purple-100',
        finance: 'bg-orange-100',
    };
    return <div className={`flex items-center justify-center w-10 h-10 rounded-full ${colorMap[type]}`}>{iconMap[type]}</div>
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-md">
      <h3 className="text-lg font-bold text-base-content">Recent Activity</h3>
      <div className="mt-4 flow-root">
        <ul role="list" className="-mb-8">
          {activities.map((activity, activityIdx) => (
            <li key={activity.id}>
              <div className="relative pb-8">
                {activityIdx !== activities.length - 1 ? (
                  <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                ) : null}
                <div className="relative flex items-start space-x-3">
                  <ActivityIcon type={activity.type} />
                  <div className="min-w-0 flex-1 pt-1.5">
                    <div>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{activity.user.name}</span>{' '}
                        {activity.description}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RecentActivity;
