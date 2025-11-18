import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Team, User } from '../types';
import TeamModal from './TeamModal';
import { PlusIcon } from './IconComponents';
import { logActivity } from '../services/activityLogger';

const TeamsTab: React.FC = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);

    const teamsCollectionRef = collection(db, 'teams');
    const usersCollectionRef = collection(db, 'users');

    useEffect(() => {
        const qTeams = query(teamsCollectionRef);
        const unsubscribeTeams = onSnapshot(qTeams, (querySnapshot) => {
            const teamsData: Team[] = [];
            querySnapshot.forEach(doc => {
                teamsData.push({ ...doc.data(), id: doc.id } as Team);
            });
            setTeams(teamsData);
            if(loading) setLoading(false);
        });

        const qUsers = query(usersCollectionRef);
        const unsubscribeUsers = onSnapshot(qUsers, (querySnapshot) => {
            const usersData: User[] = [];
            querySnapshot.forEach(doc => {
                usersData.push({ ...doc.data(), id: doc.id } as User);
            });
            setAllUsers(usersData);
        });

        return () => {
            unsubscribeTeams();
            unsubscribeUsers();
        };
    }, []);

    const handleOpenModal = (team: Team | null = null) => {
        setEditingTeam(team);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingTeam(null);
        setIsModalOpen(false);
    };

    const handleSaveTeam = async (team: Omit<Team, 'id'>) => {
        if (editingTeam && editingTeam.id) {
            const teamDoc = doc(db, 'teams', editingTeam.id);
            await updateDoc(teamDoc, team);
            logActivity('Updated Team', team.name);
        } else {
            await addDoc(teamsCollectionRef, team);
            logActivity('Created Team', team.name);
        }
        handleCloseModal();
    };

    const handleDeleteTeam = async (team: Team) => {
        if(window.confirm('Are you sure you want to delete this team?')) {
            const teamDoc = doc(db, 'teams', team.id!);
            await deleteDoc(teamDoc);
            logActivity('Deleted Team', team.name);
        }
    };

    if (loading) return <div>Loading teams...</div>;

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors duration-300 flex items-center"
                >
                    <PlusIcon className="w-5 h-5 mr-2" /> Add Team
                </button>
            </div>
            <div className="bg-base-100 rounded-xl shadow-md overflow-x-auto dark:bg-gray-800">
                <table className="min-w-full divide-y divide-base-300 dark:divide-gray-700">
                    <thead className="bg-base-200 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Team Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-base-content-secondary uppercase tracking-wider dark:text-gray-400">Members</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-base-100 divide-y divide-base-200 dark:bg-gray-800 dark:divide-gray-700">
                        {teams.map(team => (
                            <tr key={team.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-base-content dark:text-gray-100">{team.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content-secondary max-w-sm truncate dark:text-gray-400">{team.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content dark:text-gray-300">{team.memberIds.length}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleOpenModal(team)} className="text-brand-primary hover:text-teal-700 mr-4">Edit</button>
                                    <button onClick={() => handleDeleteTeam(team)} className="text-red-600 hover:text-red-800">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && (
                <TeamModal
                    team={editingTeam}
                    allUsers={allUsers}
                    onClose={handleCloseModal}
                    onSave={handleSaveTeam}
                />
            )}
        </div>
    );
};

export default TeamsTab;