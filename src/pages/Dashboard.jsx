import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const Dashboard = () => {
    const { currentUser } = useAuth();
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const filter = searchParams.get('filter');

    const handleDelete = async (e, disputeId) => {
        e.preventDefault();
        e.stopPropagation();

        if (window.confirm("Are you sure you want to delete this dispute? This action cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "disputes", disputeId));
                setDisputes(disputes.filter(d => d.id !== disputeId));
            } catch (error) {
                console.error("Error deleting dispute:", error);
                alert("Failed to delete dispute. You may not have permission.");
            }
        }
    };

    useEffect(() => {
        const fetchDisputes = async () => {
            try {
                const q = query(
                    collection(db, "disputes"),
                    where("participants", "array-contains", currentUser.email)
                );

                const querySnapshot = await getDocs(q);
                const disputesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setDisputes(disputesData);
            } catch (error) {
                console.error("Error fetching disputes:", error);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchDisputes();
        }
    }, [currentUser]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return 'text-green-400 bg-green-500/10 border border-green-500/30';
            case 'action_required': return 'text-red-400 bg-red-500/10 border border-red-500/30';
            default: return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'resolved': return <CheckCircle size={16} />;
            case 'action_required': return <AlertCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    const filteredDisputes = disputes.filter(dispute => {
        if (filter === 'created_by_me') {
            return dispute.creatorEmail === currentUser.email || dispute.creatorId === currentUser.uid;
        }
        if (filter === 'against_me') {
            return dispute.creatorEmail !== currentUser.email && dispute.creatorId !== currentUser.uid;
        }
        return true;
    });

    const getTitle = () => {
        if (filter === 'created_by_me') return 'Created By Me';
        if (filter === 'against_me') return 'Filed Against Me';
        return 'Dashboard';
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{getTitle()}</h1>
                    <p className="text-gray-400">Manage and track your ongoing resolutions</p>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-20 text-gray-500">Loading disputes...</div>
            ) : filteredDisputes.length === 0 ? (
                <Card className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="text-gray-400" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No disputes found</h3>
                    <p className="text-gray-400 mb-6">
                        {filter ? "No disputes match this filter." : "You haven't been involved in any disputes yet."}
                    </p>
                    <Link to="/create-dispute" className="btn btn-primary">Start a New Dispute</Link>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredDisputes.map((dispute) => (
                        <motion.div
                            key={dispute.id}
                            whileHover={{ scale: 1.01 }}
                            onClick={() => navigate(`/dispute/${dispute.id}`)}
                            className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors relative group cursor-pointer"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider flex items-center gap-1 ${getStatusColor(dispute.status)}`}>
                                        {getStatusIcon(dispute.status)}
                                        {dispute.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {dispute.createdAt?.seconds ? new Date(dispute.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-white">{dispute.title}</h3>
                                <p className="text-sm text-gray-400 line-clamp-1">{dispute.description}</p>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex -space-x-2">
                                    {dispute.participants?.map((email, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-gray-700 border-2 border-[var(--bg-card)] flex items-center justify-center text-xs text-white first:bg-blue-600 last:bg-sky-600" title={email}>
                                            {email[0].toUpperCase()}
                                        </div>
                                    ))}
                                </div>

                                {(dispute.creatorId === currentUser.uid || dispute.creatorEmail === currentUser.email) && (
                                    <button
                                        onClick={(e) => handleDelete(e, dispute.id)}
                                        className="btn btn-danger px-4 py-2 text-sm font-semibold"
                                        title="Delete Case"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
