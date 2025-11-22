
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, UserRole, UserStatus, Team, NotificationType, NotificationPriority } from '../types';
import UserModal from './UserModal';
import { PlusIcon } from './IconComponents';
import { logActivity } from '../services/activityLogger';
import { createNotification } from '../services/notificationService';

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const colorMap: Record<UserRole, string> = {
        [UserRole.Admin]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        [UserRole.ProjectManager]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        [UserRole.Finance]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorMap[role]}`}>{role}</span>;
};

const StatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => {
    const colorMap: Record<UserStatus, string> = {
        [UserStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        [UserStatus.Inactive]: 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorMap[status]}`}>{status}</span>;
};


const UsersTab: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const usersCollectionRef = collection(db, 'users');
    const teamsCollectionRef = collection(db, 'teams');

    useEffect(() => {
        let usersLoaded = false;
        let teamsLoaded = false;

        const checkLoading = () => {
            if (usersLoaded && teamsLoaded) {
                setLoading(false);
            }
        };

        const qUsers = query(usersCollectionRef);
        const unsubscribeUsers = onSnapshot(qUsers, (querySnapshot) => {
            const usersData: User[] = [];
            querySnapshot.forEach(doc => {
                usersData.push({ ...doc.data(), id: doc.id } as User);
            });
            setUsers(usersData);
            if (!usersLoaded) {
                usersLoaded = true;
                checkLoading();
            }
            setError(null);
        }, (err) => {
            console.error("Failed to fetch users:", err);
            setError("Could not load user data.");
            setLoading(false);
        });

        const qTeams = query(teamsCollectionRef);
        const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
            const teamsData: Team[] = [];
            snapshot.forEach(doc => teamsData.push({ id: doc.id, ...doc.data() } as Team));
            setTeams(teamsData);
            if (!teamsLoaded) {
                teamsLoaded = true;
                checkLoading();
            }
            setError(null);
        }, (err) => {
            console.error("Failed to fetch teams:", err);
            setError("Could not load team data.");
            setLoading(false);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeTeams();
        };
    }, []);

    const teamMap = useMemo(() => {
        return new Map(teams.map(team => [team.id, team.name]));
    }, [teams]);

    const handleOpenModal = (user: User | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingUser(null);
        setIsModalOpen(false);
    };

    const handleSaveUser = async (user: User) => {
        if (user.id) { // Editing existing user
            const userDocRef = doc(db, 'users', user.id);
            const originalUserDoc = await getDoc(userDocRef);
            const originalUser = originalUserDoc.data() as User;

            const { id, ...userData } = user;
            await updateDoc(userDocRef, userData);
            logActivity('Updated User', user.name);

            // Check if role changed and notify
            if (originalUser.role !== user.role) {
                createNotification({
                    userId: user.id,
                    title: 'Your Role Has Changed',
                    message: `Your role has been updated to ${user.role}.`,
                    type: NotificationType.System,
                    priority: NotificationPriority.High,
                });
            }

        } else { // Adding new user
            const { id, ...userData } = user;
            const newUserRef = await addDoc(usersCollectionRef, userData);
            logActivity('Created User', user.name);
            
            // Send welcome notification
            createNotification({
                userId: newUserRef.id,
                title: 'Welcome to CostPilot!',
                message: 'Your account has been created. Explore the dashboard to get started.',
                type: NotificationType.System,
                priority: NotificationPriority.Medium,
            });
        }
        handleCloseModal();
    };

    const handleDeleteUser = async (user: User) => {
        if(window.confirm('Are you sure you want to delete this user?')) {
            const userDoc = doc(db, 'users', user.id!);
            await deleteDoc(userDoc);
            logActivity('Deleted User', user.name);
        }
    };
    
    if (loading) return <div>Loading users...</div>;

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                <h3 className="text-lg font-bold">An Error Occurred</h3>
                <p className="mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-brand-primary text-brand-primary-content font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors duration-300 flex items-center"
                >
                    <PlusIcon className="w-5 h-5 mr-2" /> Add User
                </button>
            </div>
            <div className="bg-base-100 rounded-xl shadow-md overflow-x-auto dark:bg-gray-800">
                <table className="min-w-full divide-y divide-base-300 dark:divide-gray-700">
                    <thead className="bg-base-200 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Role</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Team</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Status</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-base-100 divide-y divide-base-200 dark:bg-gray-800 dark:divide-gray-700">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-base-content dark:text-gray-100">{user.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-base-content dark:text-gray-300">{user.email}</div>
                                    <div className="text-sm text-base-content-secondary dark:text-gray-400">{user.phone}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap"><RoleBadge role={user.role} /></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content dark:text-gray-300">{user.teamId ? teamMap.get(user.teamId) || 'N/A' : 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={user.status} /></td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleOpenModal(user)} className="text-brand-primary hover:text-teal-700 mr-4">Edit</button>
                                    <button onClick={() => handleDeleteUser(user)} className="text-red-600 hover:text-red-800">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && (
                <UserModal
                    user={editingUser}
                    teams={teams}
                    onClose={handleCloseModal}
                    onSave={handleSaveUser}
                />
            )}
        </div>
    );
};

export default UsersTab;