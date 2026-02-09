
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
        
        // 1. If actingUser provided, we use that, but we prefer a quick fetch to get the absolute latest from DB
        // to handle the case where the user JUST changed their name in the session.
        // Use type casting to bypass property existence check on SupabaseAuthClient
        const { data: { user } } = await (supabase.auth as any).getUser();
        
        if (user) {
            // Fetch the very latest profile name to ensure consistency
            const { data: profile } = await supabase
                .from('users')
                .select('name')
                .eq('id', user.id)
                .single();

            userInfo = {
                id: user.id,
                name: profile?.name || user.user_metadata?.name || user.email || 'Unknown User'
            };
        } else if (actingUser) {
             userInfo = {
                id: actingUser.id || 'unknown',
                name: actingUser.name || actingUser.email
            };
        }

        await supabase.from('activities').insert([{
            action,
            details,
            user: userInfo,
            timestamp: new Date().toISOString()
        }]);
    } catch (error) {
        console.error("Error logging activity: ", error);
    }
};
