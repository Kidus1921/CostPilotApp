import React, { useState } from 'react';
import UserManagementPage from './UserManagementPage';
import RecentActivity from './RecentActivity';
import NotificationSettingsTab from './settings/NotificationSettingsTab';
import ProfileSettingsTab from './settings/ProfileSettingsTab';
import { User } from '../types';


type Tab = 'Profile' | 'User Management' | 'Activity Log' | 'Notifications';

interface SettingsPageProps {
    currentUser: User;
    onUserUpdate: (updatedUser: User) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onUserUpdate }) => {
    const [activeTab, setActiveTab] = useState<Tab>('Profile');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Profile':
                return <ProfileSettingsTab currentUser={currentUser} onUserUpdate={onUserUpdate} />;
            case 'User Management':
                return <UserManagementPage />;
            case 'Activity Log':
                return <RecentActivity />;
            case 'Notifications':
                return <NotificationSettingsTab />;
            default:
                return null;
        }
    };

    const TabButton: React.FC<{ tabName: Tab }> = ({ tabName }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
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
            <h2 className="text-3xl font-bold text-base-content dark:text-white">Settings</h2>

            {/* Tabs */}
            <div className="border-b border-base-300 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <TabButton tabName="Profile" />
                    <TabButton tabName="User Management" />
                    <TabButton tabName="Activity Log" />
                    <TabButton tabName="Notifications" />
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default SettingsPage;
