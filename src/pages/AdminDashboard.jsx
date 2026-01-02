import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ShieldAlert, Check, X, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    const { currentUser } = useAuth();
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);

    // In a real app, you'd check a custom claim or a user role in Firestore
    const isAdmin = currentUser?.email?.includes('admin'); // Simple check for demo

    useEffect(() => {
        const fetchAllDisputes = async () => {
            try {
                const q = query(collection(db, "disputes"), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);
                setDisputes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Failed to fetch disputes", err);
            } finally {
                setLoading(false);
            }
        };

        if (isAdmin) {
            fetchAllDisputes();
        }
    }, [isAdmin]);

    const updateStatus = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, 'disputes', id), { status: newStatus });
            setDisputes(disputes.map(d => d.id === id ? { ...d, status: newStatus } : d));
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-[60vh] flex-col text-center">
                <ShieldAlert size={64} className="text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-gray-400">You do not have permission to view this page.</p>
                <Link to="/dashboard" className="mt-4 text-blue-400 hover:text-blue-300">Return to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
                    <p className="text-gray-400">Monitor disputes and manage abuse</p>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-10 text-gray-500">Loading...</div>
            ) : (
                <div className="grid gap-4">
                    <Card className="p-0 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-800/50 text-gray-400 text-sm border-b border-gray-700">
                                    <th className="p-4 font-medium">Title</th>
                                    <th className="p-4 font-medium">Participants</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Date</th>
                                    <th className="p-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {disputes.map((dispute) => (
                                    <tr key={dispute.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-white font-medium">{dispute.title}</td>
                                        <td className="p-4 text-gray-400 text-sm">
                                            <div className="flex flex-col">
                                                {dispute.participants.map(p => <span key={p}>{p}</span>)}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${dispute.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                                                    dispute.status === 'escalated' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {dispute.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">
                                            {dispute.createdAt?.seconds ? new Date(dispute.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link to={`/dispute/${dispute.id}`} className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="View details">
                                                    <Eye size={18} />
                                                </Link>
                                                {dispute.status === 'escalated' && (
                                                    <button
                                                        onClick={() => updateStatus(dispute.id, 'resolved')}
                                                        className="p-2 hover:bg-green-900/30 rounded text-green-400"
                                                        title="Resolve"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                )}
                                                <button className="p-2 hover:bg-red-900/30 rounded text-red-400" title="Ban User / Delete">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
