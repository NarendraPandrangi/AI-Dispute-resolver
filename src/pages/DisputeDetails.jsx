import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { analyzeDispute } from '../services/ai';
import { generateResolutionPDF } from '../services/pdfGenerator';
import { createNotification } from '../services/notifications';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Send, FileText, Shield, CheckCircle, Clock, Sparkles, X, Trash2 } from 'lucide-react';

const MAX_MESSAGES = 20;

const DisputeDetails = () => {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [dispute, setDispute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!id) return;
        const unsubscribe = onSnapshot(doc(db, "disputes", id), (doc) => {
            if (doc.exists()) {
                setDispute({ id: doc.id, ...doc.data() });
            } else {
                navigate('/dashboard');
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching dispute:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id, navigate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [dispute?.messages]);

    const handleSuggestionVote = async (index, vote) => {
        if (!dispute.aiAnalysis) return;

        const currentVotes = dispute.aiAnalysis.votes || {};
        const suggestionVotes = currentVotes[index] || {};

        // Toggle vote: if clicking same vote, remove it
        const newVote = suggestionVotes[currentUser.email] === vote ? null : vote;

        const updatedSuggestionVotes = {
            ...suggestionVotes,
            [currentUser.email]: newVote
        };

        // Clean up if vote is null 
        if (!newVote) {
            delete updatedSuggestionVotes[currentUser.email];
        }

        const updatedVotes = {
            ...currentVotes,
            [index]: updatedSuggestionVotes
        };

        // Notify other participants if I accepted a suggestion
        if (newVote === 'accept') {
            const participants = dispute.participants || [];
            const otherParticipants = participants.filter(p => p !== currentUser.email);

            // Check if this is the first acceptance for this user for this suggestion to avoid spamming?
            // For now, simple notification logic
            for (const recipient of otherParticipants) {
                await createNotification(
                    recipient.toLowerCase(),
                    "Suggestion Accepted",
                    `${currentUser.email} accepted a suggestion in dispute "${dispute.title}"`,
                    `/dispute/${id}`
                );
            }
        }

        // Check for consensus (All participants accepted this specific suggestion)
        const participants = dispute.participants || [];
        const isConsensus = participants.length > 0 && participants.every(p => updatedSuggestionVotes[p] === 'accept');

        const updates = {
            "aiAnalysis.votes": updatedVotes
        };

        // If everyone accepted, mark as resolved and save the resolution text
        if (isConsensus) {
            const resolutionText = dispute.aiAnalysis.suggestions[index];
            updates.status = 'resolved';
            updates.resolution = resolutionText;

            // Generate PDF
            generateResolutionPDF({ ...dispute, status: 'resolved' }, resolutionText);
            alert("Consensus reached! The dispute is now resolved and a resolution agreement PDF is being generated.");
        }

        await updateDoc(doc(db, "disputes", id), updates);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const message = {
                sender: currentUser.email,
                content: newMessage,
                timestamp: Timestamp.now()
            };

            await updateDoc(doc(db, "disputes", id), {
                messages: arrayUnion(message)
            });

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleResolve = async () => {
        if (window.confirm("Are you sure you want to mark this dispute as resolved?")) {
            await updateDoc(doc(db, "disputes", id), {
                status: 'resolved'
            });
        }
    };

    const handleEscalate = async () => {
        if (window.confirm("Escalate this to a human admin?")) {
            await updateDoc(doc(db, "disputes", id), {
                status: 'escalated'
            });
        }
    };

    const handleGenerateAnalysis = async () => {
        setAnalyzing(true);
        try {
            const result = await analyzeDispute(dispute.id, dispute.description, dispute.messages, dispute.evidence);
            await updateDoc(doc(db, "disputes", id), {
                aiAnalysis: result
            });
        } catch (error) {
            console.error("Error saving analysis:", error);
            alert("Failed to save AI analysis.");
        }
        setAnalyzing(false);
    };

    console.log("Rendering DisputeDetails state:", { loading, dispute });

    if (loading) return <div className="p-8 text-center text-gray-400">Loading dispute details...</div>;

    if (!dispute) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl text-red-500 mb-2">Dispute Not Found</h2>
                <p className="text-gray-400">The requested dispute could not be loaded.</p>
                <Button variant="secondary" onClick={() => navigate('/dashboard')} className="mt-4">
                    Return to Dashboard
                </Button>
            </div>
        );
    }

    const isResolved = dispute.status === 'resolved';

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col md:flex-row gap-6">
            {/* Left Column: Chat Area */}
            <div className="flex-1 flex flex-col h-full min-h-[600px]">
                <Card className="flex-1 flex flex-col p-0 overflow-hidden h-full border-none">
                    <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isResolved ? 'bg-green-500' : 'bg-green-500 animate-pulse'}`}></span>
                            Dispute Chat
                        </h2>
                        <div className="text-xs text-gray-500">
                            Participants: {dispute.participants?.join(', ') || 'Unknown'}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/20">
                        {dispute.messages?.length === 0 && (
                            <div className="text-center text-gray-500 mt-10">
                                <p>No messages yet. Start the conversation to resolve this issue.</p>
                            </div>
                        )}

                        {dispute.messages?.map((msg, index) => {
                            const isMe = msg.sender === currentUser.email;
                            return (
                                <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg p-3 ${isMe
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-gray-700 text-gray-200 rounded-tl-none'
                                        }`}>
                                        <p className="text-sm">{msg.content}</p>
                                        <span className="text-[10px] opacity-70 block mt-1 text-right">
                                            {msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800 bg-gray-900/50">
                        {/* Message Limit Indicator */}
                        <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                {isResolved ? 'Chat Closed' : 'Limited Session'}
                            </span>
                            <span className={`text-xs font-medium ${dispute.messages?.length >= MAX_MESSAGES ? 'text-red-400' : 'text-gray-400'}`}>
                                {dispute.messages?.length || 0} / {MAX_MESSAGES} Messages
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-gray-800 border-none rounded-md px-4 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder={
                                    isResolved ? "Dispute Resolved" :
                                        (dispute.messages?.length >= MAX_MESSAGES) ? "Limit reached. Generate Analysis." :
                                            "Type your message..."
                                }
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                disabled={isResolved || (dispute.messages?.length >= MAX_MESSAGES)}
                            />
                            <Button
                                type="submit"
                                disabled={!newMessage.trim() || isResolved || (dispute.messages?.length >= MAX_MESSAGES)}
                                className="px-4 disabled:bg-gray-700 disabled:text-gray-500"
                            >
                                <Send size={18} />
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>

            {/* Right Column: Info & AI */}
            <div className="w-full md:w-96 flex flex-col gap-6 overflow-y-auto">

                {/* Status Card */}
                <Card className="p-5">
                    <h3 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">Status</h3>
                    <div className="flex items-center gap-3 mb-6">
                        {isResolved ? (
                            <div className="bg-green-500/20 text-green-400 p-2 rounded-full"><CheckCircle size={24} /></div>
                        ) : (
                            <div className="bg-yellow-500/20 text-yellow-400 p-2 rounded-full"><Clock size={24} /></div>
                        )}
                        <div>
                            <p className="text-xl font-bold capitalize text-white">{dispute.status?.replace('_', ' ') || 'Active'}</p>
                            <p className="text-xs text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    {!isResolved && (
                        <div className="flex flex-col gap-2">
                            <Button variant="secondary" onClick={handleResolve} className="w-full text-green-400 border-green-900 hover:bg-green-900/20">
                                Mark as Resolved
                            </Button>
                            <Button variant="secondary" onClick={handleEscalate} className="w-full text-red-400 border-red-900 hover:bg-red-900/20">
                                Escalate Dispute
                            </Button>
                        </div>
                    )}

                    {(dispute.creatorId === currentUser.uid || dispute.creatorEmail === currentUser.email) && (
                        <div className="mt-4 pt-4 border-t border-gray-800">
                            <Button
                                variant="secondary"
                                onClick={async () => {
                                    if (window.confirm("Are you sure? This will permanently delete the dispute.")) {
                                        await deleteDoc(doc(db, "disputes", id));
                                        navigate('/dashboard');
                                    }
                                }}
                                className="w-full bg-red-600 text-white hover:bg-red-700 border-none"
                            >
                                <Trash2 size={16} className="mr-2" /> Delete Dispute
                            </Button>
                        </div>
                    )}
                </Card>

                {/* Dispute Info */}
                <Card className="p-5">
                    <h3 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">Case Details</h3>
                    <h4 className="font-semibold text-white mb-2">{dispute.title}</h4>
                    <div className="bg-gray-800/50 p-3 rounded text-sm text-gray-300 mb-4 max-h-40 overflow-y-auto">
                        {dispute.description}
                    </div>

                    {dispute.evidence?.length > 0 && (
                        <div>
                            <h5 className="text-xs font-medium text-gray-500 mb-2">Evidence</h5>
                            <div className="flex flex-wrap gap-2">
                                {dispute.evidence.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-12 h-12 bg-gray-700 rounded-md overflow-hidden hover:opacity-80 transition-opacity border border-gray-600">
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <FileText size={20} />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                {/* AI Analysis Section */}
                <Card className="p-5 relative overflow-hidden border-blue-500/30">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Shield size={60} />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-blue-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={16} />
                            AI Mediator
                        </h3>
                        {dispute.aiAnalysis && (
                            <button
                                onClick={handleGenerateAnalysis}
                                disabled={analyzing}
                                className="text-xs text-blue-400 hover:text-white transition-colors flex items-center gap-1"
                                title="Regenerate Analysis"
                            >
                                <Sparkles size={12} /> Regenerate
                            </button>
                        )}
                    </div>

                    {!dispute.aiAnalysis && (
                        <div className="flex justify-center my-4 relative z-10">
                            <button
                                onClick={handleGenerateAnalysis}
                                disabled={analyzing}
                                className="btn btn-ai-gen"
                            >
                                {analyzing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Generate AI Analysis
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {analyzing ? (
                        <div className="text-center py-6">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-xs text-blue-300">Reviewing evidence & statements...</p>
                        </div>
                    ) : dispute.aiAnalysis ? (
                        <div className="space-y-4 animate-fade-in relative z-10">
                            <div>
                                <h4 className="text-white font-medium mb-1">Summary</h4>
                                <p className="text-sm text-gray-400 leading-relaxed">{dispute.aiAnalysis.summary}</p>
                            </div>

                            {dispute.aiAnalysis.evidenceAnalysis && (
                                <div className="bg-blue-900/10 border border-blue-500/20 p-3 rounded-md">
                                    <h4 className="text-blue-400 font-medium text-xs uppercase mb-1 flex items-center gap-1">
                                        <FileText size={12} /> Evidence Analysis
                                    </h4>
                                    <p className="text-sm text-gray-300 italic">"{dispute.aiAnalysis.evidenceAnalysis}"</p>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-white font-medium">Suggested Resolutions</h4>
                                </div>
                                {dispute.aiAnalysis.suggestions && dispute.aiAnalysis.suggestions.length > 0 ? (
                                    <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {dispute.aiAnalysis.suggestions.map((suggestion, index) => {
                                            const suggestionVotes = dispute.aiAnalysis.votes?.[index] || {};
                                            const myVote = suggestionVotes[currentUser.email];
                                            const isAccepted = myVote === 'accept';
                                            const isRejected = myVote === 'reject';

                                            const acceptedBy = Object.keys(suggestionVotes).filter(email => suggestionVotes[email] === 'accept');
                                            const rejectedBy = Object.keys(suggestionVotes).filter(email => suggestionVotes[email] === 'reject');

                                            return (
                                                <li key={index} className="bg-slate-800/80 border border-slate-700 rounded-lg overflow-hidden shadow-sm hover:border-blue-500/30 transition-all">
                                                    <div className="p-3 flex gap-3">
                                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5">
                                                            {index + 1}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className={`text-sm text-gray-200 leading-relaxed ${isRejected ? 'text-gray-500 line-through' : ''}`}>
                                                                {suggestion}
                                                            </p>

                                                            {/* Actions Row */}
                                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/50">
                                                                <div className="flex gap-2">
                                                                    {acceptedBy.map((email, i) => (
                                                                        <span key={i} className="text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded border border-green-900/50" title={email}>
                                                                            ✓ {email.split('@')[0]}
                                                                        </span>
                                                                    ))}
                                                                </div>

                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleSuggestionVote(index, 'accept')}
                                                                        className={`p-1.5 rounded transition-colors ${isAccepted ? 'bg-green-600 text-white' : 'hover:bg-green-900/30 text-gray-400 hover:text-green-400'}`}
                                                                        title="Accept"
                                                                    >
                                                                        <CheckCircle size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleSuggestionVote(index, 'reject')}
                                                                        className={`p-1.5 rounded transition-colors ${isRejected ? 'bg-red-600 text-white' : 'hover:bg-red-900/30 text-gray-400 hover:text-red-400'}`}
                                                                        title="Reject"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 italic text-center text-sm py-4">No specific suggestions provided by AI.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-2 text-gray-500 text-xs text-opacity-70">
                            <p>Unlock AI-powered insights to resolve this instantly.</p>
                        </div>
                    )}
                </Card>

            </div>
        </div>
    );
};

export default DisputeDetails;
