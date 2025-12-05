
import { supabase } from '../supabaseClient';
import { User } from '../types';

/**
 * Logs a system activity to the database.
 * @param action - Short description of action (e.g., "Created Project")
 * @param details - More details (e.g., Project Name)
 * @param actingUser - (Optional) Pass the current user object if available to avoid extra DB calls
 */
export const logActivity = async (action: string, details: string, actingUser?: User | null) => {
    try {
        let userInfo = { id: 'system', name: 'System' };
        
        if (actingUser) {
             userInfo = {
                id: actingUser.id || 'unknown',
                name: actingUser.name || actingUser.email
            };
        } else {
            // Fallback: Try to get session user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Try to get profile info for better name
                const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).single();
                userInfo = {
                    id: user.id,
                    name: profile?.name || user.email || 'Unknown User'
                };
            }
        }

        await supabase.from('activities').insert([{
            action,
            details,
            user: userInfo,
            timestamp: new Date().toISOString()
        }]);
    } catch (error) {
        console.error("Error logging activity: ", error);
        // We do not throw here to prevent breaking the main app flow
    }
};
