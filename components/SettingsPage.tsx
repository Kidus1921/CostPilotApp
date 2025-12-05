
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import UserManagementPage from './UserManagementPage';
import RecentActivity from './RecentActivity';
import NotificationSettingsTab from './settings/NotificationSettingsTab';
import ProfileSettingsTab from './settings/ProfileSettingsTab';
import PrivilegeSettingsTab from './settings/PrivilegeSettingsTab';
import { UserRole } from '../types';

interface SettingsPageProps { initialTab?: string; }

const SettingsPage: React.FC<SettingsPageProps> = ({ initialTab }) => {
    const { currentUser, setCurrentUser } = useAppContext();
    const [activeTab, setActiveTab] = useState<string>(initialTab || 'Profile');

    if (!currentUser) return null;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Profile': return <ProfileSettingsTab currentUser={currentUser} onUserUpdate={setCurrentUser} />;
            case 'User Management': return currentUser.role === UserRole.Admin ? <UserManagementPage /> : null;
            case 'Activity Log': return currentUser.role === UserRole.Admin ? <RecentActivity /> : null;
            case 'Privilege Management': return currentUser.role === UserRole.Admin ? <PrivilegeSettingsTab /> : null;
            case 'Notifications': return <NotificationSettingsTab currentUser={currentUser} />;
            default: return <ProfileSettingsTab currentUser={currentUser} onUserUpdate={setCurrentUser} />;
        }
    };

    const TabButton: React.FC<{ name: string }> = ({ name }) => (
        <button onClick={() => setActiveTab(name)} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === name ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {name}
        </button>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold dark:text-white">Settings</h2>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    <TabButton name="Profile" />
                    {currentUser.role === UserRole.Admin && <><TabButton name="User Management" /><TabButton name="Activity Log" /><TabButton name="Privilege Management" /></>}
                    <TabButton name="Notifications" />
                </nav>
            </div>
            <div className="mt-6">{renderTabContent()}</div>
        </div>
    );
};

export default SettingsPage;
