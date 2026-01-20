import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Project, ProjectStatus } from '../types';

interface ProjectStatusChartProps {
  projects: Project[];
}

const ProjectStatusChart: React.FC<ProjectStatusChartProps> = ({ projects }) => {
  const statusCounts = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {} as Record<ProjectStatus, number>);

  const data = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Strict Brand Color Mapping
  const COLORS: { [key in ProjectStatus]?: string } = {
    [ProjectStatus.InProgress]: '#d3a200', // Gold (secondary)
    [ProjectStatus.Completed]: '#10B981',  // Success Green
    [ProjectStatus.OnHold]: '#f9dc5c',     // Light Gold (other)
    [ProjectStatus.Pending]: '#6B7280',    // Gray
    [ProjectStatus.Rejected]: '#c41034',   // Crimson (tertiary)
  };

  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800 border border-base-300 dark:border-gray-700">
      <h3 className="text-lg font-bold text-base-content dark:text-white">Project Status Distribution</h3>
      <div style={{ width: '100%', height: 300 }} className="mt-4">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name as ProjectStatus] || '#000000'} />
              ))}
            </Pie>
            <Tooltip
                cursor={{ fill: 'rgba(200,200,200,0.1)' }}
                contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(5px)',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.5rem',
                }}
                wrapperClassName="dark:[&_.recharts-tooltip-item]:!text-white dark:[&_.recharts-tooltip-label]:!text-white dark:!bg-gray-700/80 dark:!border-gray-600"
            />
            <Legend iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProjectStatusChart;