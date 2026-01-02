import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const createNotification = async (recipientEmail, title, message, link) => {
    try {
        await addDoc(collection(db, "notifications"), {
            recipientEmail,
            title,
            message,
            link,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error creating notification:", error);
        // Don't throw, notifications are non-critical
    }
};
