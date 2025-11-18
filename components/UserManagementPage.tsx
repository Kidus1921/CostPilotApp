

import React, { useState } from 'react';
import UsersTab from './UsersTab';
import TeamsTab from './TeamsTab';

type Tab = 'Users' | 'Teams';

const UserManagementPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('Users');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Users':
                return <UsersTab />;
            case 'Teams':
                return <TeamsTab />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-base-300 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('Users')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'Users'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-base-content-secondary hover:text-base-content hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                        }`}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('Teams')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'Teams'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-base-content-secondary hover:text-base-content hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                        }`}
                    >
                        Teams
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default UserManagementPage;