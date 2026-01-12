
import React, { useState, useEffect } from 'react';
import FinancialDashboard from './FinancialDashboard';
import FinancialProjectsTab from './FinancialProjectsTab';
import FinancialApprovalsTab from './FinancialApprovalsTab';
import FinancialReportsTab from './FinancialReportsTab';
import FinancialTeamsTab from './FinancialTeamsTab';

type Tab = 'Overview' | 'Projects' | 'Approvals' | 'Reports' | 'Team Status';

const FinancialsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('Overview');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Overview':
                return <FinancialDashboard />;
            case 'Projects':
                return <FinancialProjectsTab />;
            case 'Approvals':
                return <FinancialApprovalsTab />;
            case 'Reports':
                return <FinancialReportsTab />;
            case 'Team Status':
                return <FinancialTeamsTab />;
            default:
                return null;
        }
    };
    
    const TabButton: React.FC<{tabName: Tab}> = ({ tabName }) => (
         <button
            onClick={() => setActiveTab(tabName)}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tabName
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-base-content-secondary hover:text-base-content hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
            }`}
        >
            {tabName}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-base-content dark:text-gray-100">Financials</h2>
            </div>

            {/* Tabs */}
            <div className="border-b border-base-300 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    <TabButton tabName="Overview" />
                    <TabButton tabName="Projects" />
                    <TabButton tabName="Approvals" />
                    <TabButton tabName="Team Status" />
                    <TabButton tabName="Reports" />
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default FinancialsPage;
