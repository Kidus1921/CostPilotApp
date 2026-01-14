
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

    // Strict Brand Color Constants
    const BRAND = {
        PRIMARY: '#d3a200',   // Brownish Yellow
        SECONDARY: '#f9dc5c', // Secondary Yellow
        TERTIARY: '#c41034',  // Tertiary Red
        DARK_RED: '#65081b',  // Dark Red
        SUCCESS: '#10B981',   // Standard Green for Delivery
        NEUTRAL: '#6B7280'    // Gray for Pending
    };

    const teamMetrics = useMemo(() => {
        const metricsMap: Record<string, TeamMetrics> = {};

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

        projects.forEach(project => {
            const leader = users.find(u => u.id === project.teamLeader?.id);
            const teamId = leader?.teamId || 'unassigned';
            const targetMetric = metricsMap[teamId] || metricsMap['unassigned'];

            targetMetric.totalProjects++;
            targetMetric.totalBudget += (project.budget || 0);
            targetMetric.totalSpent += (project.spent || 0);

            if (targetMetric.statusBreakdown[project.status] !== undefined) {
                targetMetric.statusBreakdown[project.status]++;
            }

            if (project.status === ProjectStatus.Completed) {
                targetMetric.completedProjects++;
            } else if (project.status === ProjectStatus.InProgress) {
                targetMetric.activeProjects++;
            }
        });

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
        [ProjectStatus.InProgress]: BRAND.PRIMARY,
        [ProjectStatus.Completed]: BRAND.SUCCESS,
        [ProjectStatus.OnHold]: BRAND.SECONDARY,
        [ProjectStatus.Pending]: BRAND.NEUTRAL,
        [ProjectStatus.Rejected]: BRAND.TERTIARY,
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-base-content dark:text-gray-100 flex items-center gap-2">
                <UserGroupIcon className="w-8 h-8 text-brand-primary" />
                Team Status Overview
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800 border border-base-300 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Budget Utilization by Team</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                            <XAxis dataKey="name" tick={{fill: '#9CA3AF', fontSize: 10}} />
                            <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fill: '#9CA3AF', fontSize: 10}} />
                            <Tooltip 
                                formatter={(val: number) => formatCurrency(val)} 
                                contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="Budget" fill={BRAND.PRIMARY} name="Approved Budget" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Spent" fill={BRAND.DARK_RED} name="Actual Spent" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800 border border-base-300 dark:border-gray-700">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Portfolio Portfolio Health</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={overallStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={8}
                                dataKey="value"
                                nameKey="name"
                            >
                                {overallStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || BRAND.NEUTRAL} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-base-100 rounded-xl shadow-md overflow-x-auto dark:bg-gray-800 border border-base-300 dark:border-gray-700">
                 <div className="p-6 border-b border-base-200 dark:border-gray-700 bg-base-200/30">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Performance Audit by Team</h3>
                 </div>
                 <table className="min-w-full divide-y divide-base-300 dark:divide-gray-700">
                    <thead className="bg-base-200/50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Team Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Active Scale</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Approved Budget</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Actual Spend</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Budget Utilization</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">KPI Delivery</th>
                        </tr>
                    </thead>
                    <tbody className="bg-base-100 divide-y divide-base-200 dark:bg-gray-800 dark:divide-gray-700">
                        {teamMetrics.map((team) => (
                            <tr key={team.teamId} className="hover:bg-base-200/50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">{team.teamName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                    <span className="font-bold text-brand-primary">{team.activeProjects}</span><span className="text-xs text-gray-400"> / {team.totalProjects} active</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 font-medium">{formatCurrency(team.totalBudget)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-bold">{formatCurrency(team.totalSpent)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-base-300 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-700 ${team.budgetHealth > 100 ? 'bg-brand-tertiary' : 'bg-brand-primary'}`} 
                                                style={{ width: `${Math.min(team.budgetHealth, 100)}%` }}>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold ${team.budgetHealth > 100 ? 'text-brand-tertiary' : 'text-brand-primary'}`}>{team.budgetHealth.toFixed(1)}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                     <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${team.deliveryRate >= 80 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400' : 'bg-brand-secondary/10 text-brand-primary border-brand-secondary/20'}`}>
                                        {team.deliveryRate.toFixed(0)}% RATE
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
