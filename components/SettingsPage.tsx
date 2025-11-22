
import React, { useState, useEffect } from 'react';
import UserManagementPage from './UserManagementPage';
import RecentActivity from './RecentActivity';
import NotificationSettingsTab from './settings/NotificationSettingsTab';
import ProfileSettingsTab from './settings/ProfileSettingsTab';
import PrivilegeSettingsTab from './settings/PrivilegeSettingsTab';
import { User, UserRole } from '../types';


type Tab = 'Profile' | 'User Management' | 'Activity Log' | 'Notifications' | 'Privilege Management';

interface SettingsPageProps {
    currentUser: User;
    onUserUpdate: (updatedUser: User) => void;
    initialTab?: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onUserUpdate, initialTab }) => {
    const [activeTab, setActiveTab] = useState<string>('Profile');

    // Sync state if initialTab prop changes, enforcing role access
    useEffect(() => {
        if (initialTab) {
            if ((initialTab === 'User Management' || initialTab === 'Activity Log' || initialTab === 'Privilege Management') && currentUser.role !== UserRole.Admin) {
                setActiveTab('Profile');
            } else {
                setActiveTab(initialTab);
            }
        }
    }, [initialTab, currentUser.role]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Profile':
                return <ProfileSettingsTab currentUser={currentUser} onUserUpdate={onUserUpdate} />;
            case 'User Management':
                // Only Admin
                return currentUser.role === UserRole.Admin ? <UserManagementPage /> : null;
            case 'Activity Log':
                // Only Admin
                return currentUser.role === UserRole.Admin ? <RecentActivity /> : null;
            case 'Privilege Management':
                // Only Admin
                return currentUser.role === UserRole.Admin ? <PrivilegeSettingsTab /> : null;
            case 'Notifications':
                return <NotificationSettingsTab />;
            default:
                return <ProfileSettingsTab currentUser={currentUser} onUserUpdate={onUserUpdate} />;
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
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    <TabButton tabName="Profile" />
                    
                    {/* Conditionally render admin tabs */}
                    {currentUser.role === UserRole.Admin && (
                        <>
                            <TabButton tabName="User Management" />
                            <TabButton tabName="Activity Log" />
                            <TabButton tabName="Privilege Management" />
                        </>
                    )}

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
