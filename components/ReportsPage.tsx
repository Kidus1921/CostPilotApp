import React, { useState, useMemo, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Project, Task, User, ExpenseCategory, ProjectStatus } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


type ReportType = 'Financial' | 'Project Status' | 'User Activity';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);


const ReportsPage: React.FC = () => {
    const [reportType, setReportType] = useState<ReportType>('Financial');
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const qProjects = query(collection(db, "projects"));
        const unsubscribeProjects = onSnapshot(qProjects, (querySnapshot) => {
            const projectsData: Project[] = [];
            querySnapshot.forEach((doc) => {
                projectsData.push({ id: doc.id, ...doc.data() } as Project);
            });
            setAllProjects(projectsData);
            if (loading) setLoading(false);
        });

        const qUsers = query(collection(db, "users"));
        const unsubscribeUsers = onSnapshot(qUsers, (querySnapshot) => {
            const usersData: User[] = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ id: doc.id, ...doc.data() } as User);
            });
            setAllUsers(usersData);
        });

        return () => {
            unsubscribeProjects();
            unsubscribeUsers();
        };
    }, []);

    const reportData = useMemo(() => {
        let filteredProjects = allProjects;

        if (selectedProjectIds.length > 0) {
            filteredProjects = filteredProjects.filter(p => p.id && selectedProjectIds.includes(p.id));
        }

        const tasks: (Task & { projectName: string })[] = filteredProjects.flatMap(p =>
            (p.tasks || []).map(t => ({ ...t, projectName: p.title }))
        );

        let filteredTasks = tasks;

        if (selectedUserIds.length > 0) {
            filteredTasks = filteredTasks.filter(t => t.completionDetails && selectedUserIds.includes(t.assignedTo.id));
        }
        if (startDate) {
            filteredTasks = filteredTasks.filter(t => t.completionDetails && new Date(t.completionDetails.completedAt) >= new Date(startDate));
        }
        if (endDate) {
            filteredTasks = filteredTasks.filter(t => t.completionDetails && new Date(t.completionDetails.completedAt) <= new Date(endDate));
        }

        switch (reportType) {
            case 'Financial': {
                const spendingByCategory = filteredTasks.reduce((acc, task) => {
                    if (task.completionDetails) {
                        const { category, actualCost } = task.completionDetails;
                        acc[category] = (acc[category] || 0) + actualCost;
                    }
                    return acc;
                }, {} as Record<ExpenseCategory, number>);

                const spendingByProject = filteredProjects.reduce((acc, project) => {
                    acc[project.title] = project.spent;
                    return acc;
                }, {} as Record<string, number>);

                return {
                    byCategory: Object.entries(spendingByCategory).map(([name, amount]) => ({ name, amount })),
                    byProject: Object.entries(spendingByProject).map(([name, amount]) => ({ name, amount })),
                    total: filteredTasks.reduce((sum, task) => sum + (task.completionDetails?.actualCost || 0), 0)
                };
            }
            case 'Project Status': {
                const statusCounts = filteredProjects.reduce((acc, project) => {
                    acc[project.status] = (acc[project.status] || 0) + 1;
                    return acc;
                }, {} as Record<ProjectStatus, number>);
                return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
            }
            case 'User Activity': {
                 return allUsers.map(user => {
                    const userTasks = filteredTasks.filter(task => task.assignedTo.id === user.id);
                    const completedTasks = userTasks.filter(t => t.completionDetails).length;
                    const totalCost = userTasks.reduce((sum, task) => sum + (task.completionDetails?.actualCost || 0), 0);
                    return {
                        name: user.name,
                        completedTasks,
                        totalCost
                    };
                }).filter(u => u.completedTasks > 0 || u.totalCost > 0);
            }
            default:
                return null;
        }
    }, [reportType, selectedProjectIds, selectedUserIds, startDate, endDate, allProjects, allUsers]);

    const renderReport = () => {
        if (loading) return <p className="text-center text-gray-500 dark:text-gray-400">Loading report data...</p>;
        if (!reportData) return <p className="text-center text-gray-500 dark:text-gray-400">Select a report type to get started.</p>;

        switch (reportType) {
            case 'Financial':
                const financialData = reportData as { byCategory: any[], byProject: any[], total: number };
                return (
                    <div className="space-y-6">
                         <div className="text-center">
                            <p className="text-base-content-secondary dark:text-gray-400">Total Expenses</p>
                            <p className="text-4xl font-bold text-base-content dark:text-white">{formatCurrency(financialData.total)}</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                                <h3 className="text-lg font-bold dark:text-white">Spending by Category</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={financialData.byCategory} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
                                        <YAxis tickFormatter={(val) => formatCurrency(val as number)} tick={{ fill: '#9CA3AF' }}/>
                                        <Tooltip wrapperClassName="dark:!bg-gray-700/80 dark:!border-gray-600" cursor={{fill: 'rgba(150,150,150,0.1)'}} />
                                        <Bar dataKey="amount" fill="#0D9488" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                                <h3 className="text-lg font-bold dark:text-white">Spending by Project</h3>
                                 <div className="overflow-x-auto mt-4">
                                    <table className="min-w-full">
                                        <thead><tr className="text-left text-sm text-base-content-secondary dark:text-gray-400"><th className="pb-2">Project</th><th className="pb-2">Amount</th></tr></thead>
                                        <tbody>{financialData.byProject.map(p => (<tr key={p.name} className="border-t border-base-200 dark:border-gray-700"><td className="py-2 font-medium dark:text-gray-200">{p.name}</td><td className="dark:text-gray-300">{formatCurrency(p.amount)}</td></tr>))}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Project Status':
                const projectStatusData = reportData as { name: string, value: number }[];
                const COLORS: Record<string, string> = { [ProjectStatus.InProgress]: '#3B82F6', [ProjectStatus.Completed]: '#10B981', [ProjectStatus.OnHold]: '#F97316', [ProjectStatus.Pending]: '#6B7280' };
                return (
                     <div className="bg-base-100 p-6 rounded-xl shadow-md dark:bg-gray-800">
                        <h3 className="text-lg font-bold text-base-content dark:text-white">Project Status Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={projectStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                    {projectStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />)}
                                </Pie>
                                <Tooltip wrapperClassName="dark:!bg-gray-700/80 dark:!border-gray-600" />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'User Activity':
                const userActivityData = reportData as { name: string, completedTasks: number, totalCost: number }[];
                return (
                    <div className="bg-base-100 p-6 rounded-xl shadow-md overflow-x-auto dark:bg-gray-800">
                        <h3 className="text-lg font-bold dark:text-white">User Activity Summary</h3>
                         <table className="min-w-full divide-y divide-base-200 dark:divide-gray-700 mt-4">
                            <thead className="bg-base-200 dark:bg-gray-700/50"><tr className="text-left text-sm text-base-content-secondary uppercase dark:text-gray-400"><th className="px-6 py-3">User</th><th className="px-6 py-3">Completed Tasks</th><th className="px-6 py-3">Total Cost Contributed</th></tr></thead>
                            <tbody className="bg-base-100 divide-y divide-base-200 dark:bg-gray-800 dark:divide-gray-700">{userActivityData.map(user => (<tr key={user.name}><td className="px-6 py-4 font-medium dark:text-gray-200">{user.name}</td><td className="px-6 py-4 dark:text-gray-300">{user.completedTasks}</td><td className="px-6 py-4 dark:text-gray-300">{formatCurrency(user.totalCost)}</td></tr>))}</tbody>
                        </table>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-base-content dark:text-white">Reports & Analytics</h2>
                 <div className="flex gap-2">
                    <button className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700">Export to Excel</button>
                    <button className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700">Export to PDF</button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-base-100 p-4 rounded-xl shadow-md dark:bg-gray-800">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="reportType" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Report Type</label>
                        <select id="reportType" value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="mt-1 w-full px-4 py-2 border rounded-lg bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option>Financial</option>
                            <option>Project Status</option>
                            <option>User Activity</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="projects-filter" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Projects</label>
                         <select id="projects-filter" multiple value={selectedProjectIds} onChange={e => setSelectedProjectIds(Array.from(e.target.selectedOptions, option => (option as HTMLOptionElement).value))} className="mt-1 w-full px-4 py-2 border rounded-lg bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {allProjects.map(p => <option key={p.id} value={p.id!}>{p.title}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="users-filter" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Users</label>
                         <select id="users-filter" multiple value={selectedUserIds} onChange={e => setSelectedUserIds(Array.from(e.target.selectedOptions, option => (option as HTMLOptionElement).value))} className="mt-1 w-full px-4 py-2 border rounded-lg bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                             {allUsers.map(u => <option key={u.id} value={u.id!}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Start Date</label>
                        <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-lg bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:[color-scheme:dark]"/>
                    </div>
                     <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">End Date</label>
                        <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-lg bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:[color-scheme:dark]"/>
                    </div>
                </div>
            </div>

            {/* Report Display */}
            <div className="mt-6">
                {renderReport()}
            </div>
        </div>
    );
};

export default ReportsPage;