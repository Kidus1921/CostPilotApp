import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// In a real app, you'd get the current user from your auth context
const getCurrentUser = () => ({
    id: 'u1', // Matches seeded admin user
    name: 'Alice Johnson' 
});

export const logActivity = async (action: string, details: string) => {
    try {
        await addDoc(collection(db, 'activities'), {
            action,
            details,
            user: getCurrentUser(),
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error logging activity: ", error);
    }
};
