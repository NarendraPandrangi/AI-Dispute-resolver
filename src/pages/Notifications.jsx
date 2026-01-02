import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import { Bell, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "notifications"),
            where("recipientEmail", "==", currentUser.email),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotifications(notifs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleNotificationClick = async (notification) => {
        // Mark as read
        if (!notification.read) {
            const notifRef = doc(db, "notifications", notification.id);
            await updateDoc(notifRef, { read: true });
        }

        // Navigate to the linked resource
        if (notification.link) {
            navigate(notification.link);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading notifications...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8 flex items-center gap-3">
                <Bell size={32} className="text-blue-500" />
                <div>
                    <h1 className="text-3xl font-bold text-white">Notifications</h1>
                    <p className="text-gray-400">Updates on your disputes and actions</p>
                </div>
            </header>

            <div className="space-y-4">
                {notifications.length === 0 && (
                    <div className="text-center text-gray-500 py-12 bg-gray-900/50 rounded-lg border border-gray-800">
                        <Bell size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No notifications yet</p>
                    </div>
                )}

                {notifications.map((notif) => (
                    <Card
                        key={notif.id}
                        className={`p-4 transition-all cursor-pointer hover:border-blue-500/50 group ${!notif.read ? 'bg-blue-900/10 border-l-4 border-l-blue-500' : 'bg-gray-800/50 border-l-4 border-l-transparent'}`}
                        onClick={() => handleNotificationClick(notif)}
                    >
                        <div className="flex gap-4">
                            <div className={`mt-1 p-2 rounded-full h-fit ${!notif.read ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                <Bell size={18} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-semibold text-lg ${!notif.read ? 'text-white' : 'text-gray-300'}`}>
                                        {notif.title}
                                    </h3>
                                    <span className="text-xs text-gray-500">
                                        {notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-sm mt-1">{notif.message}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default Notifications;
