import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { sendEmailNotification } from './emailService';

export const createNotification = async (recipientEmail, title, message, link) => {
    try {
        // 1. Create in-app notification in Firestore
        await addDoc(collection(db, "notifications"), {
            recipientEmail,
            title,
            message,
            link,
            read: false,
            createdAt: serverTimestamp()
        });

        // 2. Send Email Notification
        // We import dynamically or at top level. Let's do top level import.
        // Assuming the file is updated to import sendEmailNotification.
        await sendEmailNotification(recipientEmail, title, message, link);

    } catch (error) {
        console.error("Error creating notification:", error);
        // Don't throw, notifications are non-critical
    }
};
