
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

  /**
   * STRICT BRAND COLOR MAPPING
   * --primary-color: #65081b (Deep Wine)
   * --secondary-color: #d3a200 (Gold)
   * --tertiary-color: #c41034 (Crimson)
   * --other: #f9dc5c (Light Gold)
   */
  const COLORS: { [key in ProjectStatus]?: string } = {
    [ProjectStatus.InProgress]: '#f9dc5c', 
    [ProjectStatus.Completed]: '#d3a200',  
    [ProjectStatus.OnHold]: '#DC143C',    
    [ProjectStatus.Pending]: '#c41034',    
    [ProjectStatus.Rejected]: '#65081b',  
  };

  return (
    <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800 border border-base-300 dark:border-gray-700">
      <h3 className="text-lg font-bold text-base-content dark:text-white uppercase tracking-tighter">Project Status Distribution</h3>
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
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name as ProjectStatus] || '#6B7280'} />
              ))}
            </Pie>
            <Tooltip
                cursor={{ fill: 'rgba(200,200,200,0.1)' }}
                contentStyle={{ 
                    backgroundColor: 'rgba(17, 17, 17, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #333',
                    borderRadius: '0.75rem',
                    color: '#fff'
                }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}
                labelStyle={{ display: 'none' }}
            />
            <Legend 
              iconType="circle" 
              formatter={(value) => <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProjectStatusChart;
