
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Team, User } from '../types';
import TeamModal from './TeamModal';
import { PlusIcon } from './IconComponents';
import { logActivity } from '../services/activityLogger';

const TeamsTab: React.FC = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [teamsRes, usersRes] = await Promise.all([
                supabase.from('teams').select('*').order('name'),
                supabase.from('users').select('*').order('name')
            ]);

            if (teamsRes.error) throw teamsRes.error;
            if (usersRes.error) throw usersRes.error;

            setTeams(teamsRes.data as Team[]);
            setAllUsers(usersRes.data as User[]);
        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError("Could not load team data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Setup subscriptions for updates
        const teamSub = supabase.channel('teams_tab_teams')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(teamSub);
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

    const handleSaveTeam = async (teamData: Omit<Team, 'id'>) => {
        try {
            if (editingTeam && editingTeam.id) {
                // Update
                const { error } = await supabase.from('teams').update(teamData).eq('id', editingTeam.id);
                if (error) throw error;
                logActivity('Updated Team', teamData.name);
            } else {
                // Create
                const { error } = await supabase.from('teams').insert([teamData]);
                if (error) throw error;
                logActivity('Created Team', teamData.name);
            }
            handleCloseModal();
            fetchData();
        } catch (e: any) {
            console.error("Error saving team:", e);
            alert("Failed to save team: " + e.message);
        }
    };

    const handleDeleteTeam = async (team: Team) => {
        if(window.confirm(`Are you sure you want to delete the team "${team.name}"? This cannot be undone.`)) {
            try {
                const { error } = await supabase.from('teams').delete().eq('id', team.id);
                if (error) throw error;
                logActivity('Deleted Team', team.name);
                fetchData();
            } catch (e: any) {
                console.error("Error deleting team:", e);
                alert("Failed to delete team: " + e.message);
            }
        }
    };

    if (loading) return <div>Loading teams...</div>;

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                <h3 className="text-lg font-bold">An Error Occurred</h3>
                <p className="mt-2">{error}</p>
                <button onClick={fetchData} className="mt-4 text-sm text-brand-primary underline">Retry</button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => handleOpenModal(null)}
                    className="bg-brand-primary text-brand-primary-content font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors duration-300 flex items-center"
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
                                    <div className="text-sm font-bold text-base-content dark:text-gray-100">{team.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content-secondary max-w-sm truncate dark:text-gray-400">{team.description || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content dark:text-gray-300">{team.memberIds ? team.memberIds.length : 0} members</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleOpenModal(team)} className="text-brand-primary hover:text-teal-700 dark:hover:text-teal-400 mr-4 font-bold">Edit</button>
                                    <button onClick={() => handleDeleteTeam(team)} className="text-red-600 hover:text-red-800 dark:hover:text-red-400 font-bold">Delete</button>
                                </td>
                            </tr>
                        ))}
                         {teams.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-8 text-gray-500">No teams found.</td></tr>
                        )}
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
