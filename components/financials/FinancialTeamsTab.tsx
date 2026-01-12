
import React, { useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { ProjectStatus } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { UserGroupIcon } from '../IconComponents';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

interface TeamMetrics {
    teamId: string;
    teamName: string;
    totalProjects: number;
    completedProjects: number;
    activeProjects: number;
    totalBudget: number;
    totalSpent: number;
    budgetHealth: number; // percentage
    deliveryRate: number; // percentage
    statusBreakdown: Record<string, number>;
}

const FinancialTeamsTab: React.FC = () => {
    const { projects, teams, users } = useAppContext();

    const teamMetrics = useMemo(() => {
        const metricsMap: Record<string, TeamMetrics> = {};

        // Initialize metrics for all known teams
        teams.forEach(team => {
            metricsMap[team.id!] = {
                teamId: team.id!,
                teamName: team.name,
                totalProjects: 0,
                completedProjects: 0,
                activeProjects: 0,
                totalBudget: 0,
                totalSpent: 0,
                budgetHealth: 0,
                deliveryRate: 0,
                statusBreakdown: {
                    [ProjectStatus.InProgress]: 0,
                    [ProjectStatus.Completed]: 0,
                    [ProjectStatus.OnHold]: 0,
                    [ProjectStatus.Pending]: 0,
                    [ProjectStatus.Rejected]: 0,
                }
            };
        });

        // Add an "Unassigned" team bucket if needed
        metricsMap['unassigned'] = {
            teamId: 'unassigned',
            teamName: 'Unassigned / No Team',
            totalProjects: 0,
            completedProjects: 0,
            activeProjects: 0,
            totalBudget: 0,
            totalSpent: 0,
            budgetHealth: 0,
            deliveryRate: 0,
            statusBreakdown: {
                [ProjectStatus.InProgress]: 0,
                [ProjectStatus.Completed]: 0,
                [ProjectStatus.OnHold]: 0,
                [ProjectStatus.Pending]: 0,
                [ProjectStatus.Rejected]: 0,
            }
        };

        // Populate metrics from Projects
        projects.forEach(project => {
            // Find the team of the project leader
            const leader = users.find(u => u.id === project.teamLeader?.id);
            const teamId = leader?.teamId || 'unassigned';

            // If the team doesn't exist in our map (maybe deleted team), treat as unassigned
            const targetMetric = metricsMap[teamId] || metricsMap['unassigned'];

            targetMetric.totalProjects++;
            targetMetric.totalBudget += (project.budget || 0);
            targetMetric.totalSpent += (project.spent || 0);

            // Count statuses
            if (targetMetric.statusBreakdown[project.status] !== undefined) {
                targetMetric.statusBreakdown[project.status]++;
            }

            if (project.status === ProjectStatus.Completed) {
                targetMetric.completedProjects++;
            } else if (project.status === ProjectStatus.InProgress) {
                targetMetric.activeProjects++;
            }
        });

        // Calculate rates
        return Object.values(metricsMap).filter(m => m.totalProjects > 0 || m.teamId !== 'unassigned').map(m => {
            const budgetHealth = m.totalBudget > 0 ? (m.totalSpent / m.totalBudget) * 100 : 0;
            const deliveryRate = m.totalProjects > 0 ? (m.completedProjects / m.totalProjects) * 100 : 0;
            return { ...m, budgetHealth, deliveryRate };
        });

    }, [projects, teams, users]);

    const chartData = teamMetrics.map(m => ({
        name: m.teamName,
        Budget: m.totalBudget,
        Spent: m.totalSpent
    }));

    const overallStatusData = useMemo(() => {
        const statusCounts: Record<string, number> = {
            [ProjectStatus.InProgress]: 0,
            [ProjectStatus.Completed]: 0,
            [ProjectStatus.OnHold]: 0,
            [ProjectStatus.Pending]: 0,
            [ProjectStatus.Rejected]: 0,
        };

        teamMetrics.forEach(team => {
            Object.entries(team.statusBreakdown).forEach(([status, count]) => {
                if (statusCounts[status] !== undefined) {
                    statusCounts[status] += count as number;
                }
            });
        });

        return Object.entries(statusCounts)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }));
    }, [teamMetrics]);

    const STATUS_COLORS: Record<string, string> = {
        [ProjectStatus.InProgress]: '#3B82F6', // Blue
        [ProjectStatus.Completed]: '#10B981',  // Green
        [ProjectStatus.OnHold]: '#F59E0B',     // Yellow
        [ProjectStatus.Pending]: '#6B7280',    // Gray
        [ProjectStatus.Rejected]: '#EF4444',   // Red
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-base-content dark:text-gray-100 flex items-center gap-2">
                <UserGroupIcon className="w-8 h-8 text-brand-primary" />
                Team Status Overview
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Budget vs Spent Chart */}
                <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Budget vs. Consumption by Team</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="name" tick={{fill: '#9CA3AF'}} />
                            <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fill: '#9CA3AF'}} />
                            <Tooltip 
                                formatter={(val: number) => formatCurrency(val)} 
                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                itemStyle={{ color: '#F3F4F6' }}
                            />
                            <Legend />
                            <Bar dataKey="Budget" fill="#3B82F6" name="Allocated Budget" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Spent" fill="#F59E0B" name="Actual Spent" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Pie Chart */}
                <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Project Status Distribution</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={overallStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                nameKey="name"
                            >
                                {overallStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#8884d8'} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                itemStyle={{ color: '#F3F4F6' }}
                            />
                            <Legend iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-base-100 rounded-xl shadow-md overflow-x-auto dark:bg-gray-800">
                 <div className="p-6 border-b border-base-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detailed Team Performance Metrics</h3>
                 </div>
                 <table className="min-w-full divide-y divide-base-300 dark:divide-gray-700">
                    <thead className="bg-base-200 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-gray-300">Team Name</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-gray-300">Projects (Active / Total)</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-gray-300">Total Budget</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-gray-300">Total Spent</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-gray-300">Consumption %</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-gray-300">Delivery Rate</th>
                        </tr>
                    </thead>
                    <tbody className="bg-base-100 divide-y divide-base-200 dark:bg-gray-800 dark:divide-gray-700">
                        {teamMetrics.map((team) => (
                            <tr key={team.teamId} className="hover:bg-base-200/50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{team.teamName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                    <span className="font-bold text-brand-primary">{team.activeProjects}</span> / {team.totalProjects}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatCurrency(team.totalBudget)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatCurrency(team.totalSpent)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                            <div 
                                                className={`h-2.5 rounded-full ${team.budgetHealth > 100 ? 'bg-red-600' : 'bg-green-500'}`} 
                                                style={{ width: `${Math.min(team.budgetHealth, 100)}%` }}>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold ${team.budgetHealth > 100 ? 'text-red-600' : 'text-green-600'}`}>{team.budgetHealth.toFixed(1)}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${team.deliveryRate >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                                        {team.deliveryRate.toFixed(1)}%
                                     </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};

export default FinancialTeamsTab;
