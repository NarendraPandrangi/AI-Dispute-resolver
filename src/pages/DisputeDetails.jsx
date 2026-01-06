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
import { Send, FileText, Shield, CheckCircle, Clock, Sparkles, X, Trash2, Scale, MessageSquare, Download } from 'lucide-react';

const MAX_MESSAGES = 20;

const DisputeDetails = () => {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [dispute, setDispute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState('discussion'); // 'discussion' | 'resolution'
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
    }, [dispute?.messages, activeTab]);

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
        <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col">
            {/* Header with Tabs */}
            <div className="bg-slate-900/50 sticky top-0 z-20 pb-4 pt-2 px-2 flex flex-wrap items-center justify-between gap-4 border-b border-gray-800/50 mb-4 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        {dispute.title}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium uppercase tracking-wider ${isResolved ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-blue-500 text-blue-400 bg-blue-500/10'}`}>
                            {dispute.status?.replace('_', ' ')}
                        </span>
                    </h2>
                </div>

                <div className="flex items-center shadow-2xl">
                    <button
                        onClick={() => setActiveTab('discussion')}
                        className={`relative px-12 py-4 text-lg font-black tracking-wider rounded-l-2xl border-y-2 border-l-2 transition-all duration-300 flex items-center gap-3 ${activeTab === 'discussion' ? 'bg-sky-400 border-sky-400 text-black shadow-[0_0_30px_rgba(56,189,248,0.6)] z-10' : 'bg-black/40 border-slate-700 text-sky-400 hover:bg-sky-400/10 hover:border-sky-400/50 z-0'} border-r-0`}
                    >
                        <MessageSquare size={24} strokeWidth={2.5} />
                        DISCUSSION
                    </button>
                    <button
                        onClick={() => setActiveTab('resolution')}
                        className={`relative px-12 py-4 text-lg font-black tracking-wider rounded-r-2xl border-2 transition-all duration-300 flex items-center gap-3 ${activeTab === 'resolution' ? 'bg-fuchsia-500 border-fuchsia-500 text-white shadow-[0_0_30px_rgba(217,70,239,0.6)] z-10' : 'bg-black/40 border-slate-700 text-fuchsia-500 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/50 z-0'}`}
                    >
                        <Sparkles size={24} strokeWidth={2.5} className={activeTab === 'resolution' ? 'animate-pulse' : ''} />
                        RESOLUTION CENTER
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-hidden relative">

                {/* --- DISCUSSION TAB --- */}
                {activeTab === 'discussion' && (
                    <div className="flex flex-col md:flex-row gap-6 h-full pb-4">
                        {/* Left: Chat Area */}
                        <div className="flex-1 flex flex-col h-full">
                            <Card className="flex-1 flex flex-col p-0 overflow-hidden h-full border-none shadow-none bg-transparent">
                                <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center rounded-t-xl border border-slate-700/50">
                                    <h2 className="font-semibold text-gray-200 flex items-center gap-2">
                                        Live Chat
                                        <span className="text-xs font-normal text-gray-500 ml-2">({dispute.messages?.length || 0} msgs)</span>
                                    </h2>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/20 border-x border-slate-700/50">
                                    {dispute.messages?.length === 0 && (
                                        <div className="text-center text-gray-500 mt-10">
                                            <p>No messages yet. Start the conversation to resolve this issue.</p>
                                        </div>
                                    )}

                                    {dispute.messages?.map((msg, index) => {
                                        const isMe = msg.sender === currentUser.email;
                                        const senderName = msg.sender.split('@')[0];
                                        return (
                                            <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm ${isMe
                                                    ? 'bg-blue-600/90 text-white rounded-tr-sm'
                                                    : 'bg-slate-700/80 text-gray-100 rounded-tl-sm'
                                                    }`}>
                                                    {!isMe && (
                                                        <p className="text-[10px] font-bold text-blue-300 mb-1 uppercase tracking-wider">
                                                            {senderName}
                                                        </p>
                                                    )}
                                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                                    <span className="text-[10px] opacity-60 block mt-1 text-right">
                                                        {msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <form onSubmit={handleSendMessage} className="p-4 border-t border-b border-x border-gray-800 bg-gray-900/50 rounded-b-xl border-slate-700/50">
                                    <div className="flex gap-3">
                                        <input
                                            className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none disabled:opacity-50 transition-all placeholder-gray-500"
                                            placeholder={isResolved ? "Dispute Resolved" : "Type your message..."}
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            disabled={isResolved || (dispute.messages?.length >= MAX_MESSAGES)}
                                        />
                                        <Button
                                            type="submit"
                                            disabled={!newMessage.trim() || isResolved || (dispute.messages?.length >= MAX_MESSAGES)}
                                            className="px-5 rounded-lg"
                                        >
                                            <Send size={18} />
                                        </Button>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{dispute.messages?.length}/{MAX_MESSAGES} Messages exchanged</span>
                                    </div>
                                </form>
                            </Card>
                        </div>

                        {/* Right: Info Sidebar */}
                        <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                            <Card className="p-5 border-slate-700/50">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Case Details</h3>
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-sm text-gray-300 leading-relaxed mb-4">
                                    {dispute.description}
                                </div>

                                {dispute.evidence?.length > 0 && (
                                    <div>
                                        <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Evidence</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {dispute.evidence.map((url, i) => (
                                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-gray-400 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-700 hover:text-white transition-all">
                                                    <FileText size={18} />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>

                            <Card className="p-5 border-slate-700/50">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Actions</h3>
                                <div className="space-y-3">
                                    {isResolved && (
                                        <Button
                                            variant="secondary"
                                            onClick={() => generateResolutionPDF(dispute, dispute.resolution || "Resolved Manually")}
                                            className="w-full justify-start text-sm border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300 transition-colors mb-3"
                                        >
                                            <Download size={16} className="mr-2" /> Download Agreement
                                        </Button>
                                    )}
                                    {!isResolved && (
                                        <>
                                            <Button variant="secondary" onClick={handleResolve} className="w-full justify-start text-sm hover:border-green-500/30 hover:bg-green-500/5 hover:text-green-400 transition-colors">
                                                <CheckCircle size={16} className="mr-2" /> Mark as Resolved
                                            </Button>
                                            <Button variant="secondary" onClick={handleEscalate} className="w-full justify-start text-sm hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 transition-colors">
                                                <Shield size={16} className="mr-2" /> Escalate to Admin
                                            </Button>
                                        </>
                                    )}
                                    <Button variant="secondary" onClick={() => navigate('/dashboard')} className="w-full justify-start text-sm">
                                        Exit to Dashboard
                                    </Button>
                                </div>

                                {(dispute.creatorId === currentUser.uid || dispute.creatorEmail === currentUser.email) && (
                                    <div className="mt-6 pt-4 border-t border-slate-800">
                                        <button
                                            onClick={async () => {
                                                if (window.confirm("Are you sure? This will permanently delete the dispute.")) {
                                                    await deleteDoc(doc(db, "disputes", id));
                                                    navigate('/dashboard');
                                                }
                                            }}
                                            className="w-full text-xs text-red-500/70 hover:text-red-400 flex items-center justify-center gap-2 py-2"
                                        >
                                            <Trash2 size={12} /> Delete Permanently
                                        </button>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                )}

                {/* --- RESOLUTION TAB --- */}
                {
                    activeTab === 'resolution' && (
                        <div className="h-full overflow-y-auto pr-2 custom-scrollbar pb-10">
                            <div className="max-w-4xl mx-auto">

                                {/* Dashboard Header */}
                                <div className="text-center mb-10 mt-6 animate-fade-in">
                                    <h2 className="text-3xl font-bold text-white mb-2">AI Resolution Center</h2>
                                    <p className="text-gray-400 max-w-lg mx-auto">
                                        Our impartial AI mediator analyzes the chat and evidence to propose
                                        fair solutions. Vote on suggestions to reach a binding agreement.
                                    </p>
                                </div>

                                {/* Main Analysis Container */}
                                {!dispute.aiAnalysis && !analyzing && (
                                    <div className="text-center py-16 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl">
                                        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
                                            <Sparkles size={40} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3">Ready to Mediate?</h3>
                                        <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                                            Generate an AI analysis to get action-based suggestions grounded in your provided evidence.
                                        </p>
                                        <button
                                            onClick={handleGenerateAnalysis}
                                            className="btn btn-ai-gen text-lg px-8 py-3 shadow-xl hover:shadow-2xl shadow-blue-500/20"
                                        >
                                            Start AI Analysis
                                        </button>
                                    </div>
                                )}

                                {analyzing && (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="relative w-24 h-24 mb-6">
                                            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-t-blue-500 border-r-purple-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Sparkles size={24} className="text-white animate-pulse" />
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">Analyzing Dispute...</h3>
                                        <p className="text-gray-500">Reading evidence, reviewing timeline, and drafting suggestions.</p>
                                    </div>
                                )}

                                {dispute.aiAnalysis && !analyzing && (
                                    <div className="space-y-10 animate-fade-in pb-20">

                                        {/* Summaries Stack (No Grid) */}
                                        <div className="flex flex-col gap-6">
                                            <div className="relative group w-full">
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                                                <div className="relative bg-slate-900/90 p-8 rounded-2xl border border-white/10 backdrop-blur-xl h-full">
                                                    <h4 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                                                        <FileText size={18} /> CASE SUMMARY
                                                    </h4>
                                                    <p className="text-gray-300 leading-relaxed text-sm lg:text-base">
                                                        {dispute.aiAnalysis.summary}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="relative group w-full">
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                                                <div className="relative bg-slate-900/90 p-8 rounded-2xl border border-white/10 backdrop-blur-xl h-full">
                                                    <h4 className="text-sm font-black text-fuchsia-400 uppercase tracking-widest mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                                                        <Shield size={18} /> EVIDENCE REVIEW
                                                    </h4>
                                                    <p className="text-gray-300 leading-relaxed italic text-sm lg:text-base pl-4 border-l-4 border-fuchsia-500/50">
                                                        "{dispute.aiAnalysis.evidenceAnalysis || "No critical evidence flags detected."}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Header */}
                                        <div className="flex items-center justify-between mt-12 mb-8 px-2">
                                            <h3 className="text-2xl font-black text-white flex items-center gap-4">
                                                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 text-lg">
                                                    {dispute.aiAnalysis.suggestions?.length || 0}
                                                </span>
                                                PROPOSED RESOLUTIONS
                                            </h3>
                                            <button
                                                onClick={handleGenerateAnalysis}
                                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-all flex items-center gap-2"
                                            >
                                                <Sparkles size={14} /> Regenerate
                                            </button>
                                        </div>

                                        {/* Suggestions Cards */}
                                        <div className="space-y-6">
                                            {dispute.aiAnalysis.suggestions?.map((suggestionText, index) => {
                                                const suggestionVotes = dispute.aiAnalysis.votes?.[index] || {};
                                                const myVote = suggestionVotes[currentUser.email];
                                                const acceptedBy = Object.keys(suggestionVotes).filter(email => suggestionVotes[email] === 'accept');

                                                // Check if THIS suggestion is fully resolved (consensus)
                                                const participants = dispute.participants || [];
                                                const isConsensus = participants.length > 0 && participants.every(p => suggestionVotes[p] === 'accept');

                                                // Check if ANY suggestion is resolved
                                                const resolutionText = dispute.resolution || (dispute.status === 'resolved' ? dispute.aiAnalysis.suggestions.find((_, i) => {
                                                    const votes = dispute.aiAnalysis.votes?.[i] || {};
                                                    return participants.length > 0 && participants.every(p => votes[p] === 'accept');
                                                }) : null);

                                                const isResolved = !!resolutionText;
                                                const isThisTheResolution = isConsensus || (resolutionText === suggestionText);

                                                let actionPart = suggestionText;
                                                let reasonPart = null;
                                                const reasonMatch = suggestionText.match(/(?:Reason|Reasoning|Rational):\s*(.*)/i);
                                                if (reasonMatch) {
                                                    actionPart = suggestionText.replace(reasonMatch[0], '').trim();
                                                    reasonPart = reasonMatch[1].trim();
                                                }
                                                actionPart = actionPart.replace(/^(Suggestion\s*\d+:)\s*/i, '').trim();

                                                return (
                                                    <div
                                                        key={index}
                                                        className={`relative group rounded-3xl transition-all duration-300 ${isResolved && !isThisTheResolution
                                                            ? 'opacity-30 pointer-events-none grayscale'
                                                            : ''} ${myVote === 'accept'
                                                                ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-500/50 shadow-[0_0_50px_-12px_rgba(34,197,94,0.3)]'
                                                                : myVote === 'reject'
                                                                    ? 'bg-red-950/30 border border-red-500/30 opacity-75'
                                                                    : 'bg-slate-800/40 border border-white/5 hover:bg-slate-800/60 hover:border-white/20'
                                                            }`}
                                                    >
                                                        <div className="p-8">
                                                            <div className="flex flex-col md:flex-row gap-8">
                                                                {/* Number Column */}
                                                                <div className="flex-shrink-0">
                                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black border-2 ${myVote === 'accept' ? 'bg-green-500 text-white border-green-400 shadow-lg shadow-green-500/40' :
                                                                        'bg-slate-900 text-slate-500 border-slate-700'
                                                                        }`}>
                                                                        {index + 1}
                                                                    </div>
                                                                </div>

                                                                {/* Content Column */}
                                                                <div className="flex-1 space-y-6">
                                                                    <div>
                                                                        <h5 className={`text-xl font-bold leading-relaxed mb-4 ${myVote === 'reject' ? 'text-gray-500 line-through decoration-red-500/50' : 'text-white'}`}>
                                                                            {actionPart}
                                                                        </h5>
                                                                        {reasonPart && (
                                                                            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                                                                <p className="text-sm text-gray-400 leading-relaxed font-medium">
                                                                                    <span className="text-blue-400 font-bold uppercase text-xs tracking-wider mr-2">Rationale:</span>
                                                                                    {reasonPart}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Action Bar */}
                                                                    <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/5">

                                                                        {/* Status Badges */}
                                                                        <div className="flex items-center gap-3">
                                                                            {acceptedBy.length > 0 ? (
                                                                                <div className="flex -space-x-3">
                                                                                    {acceptedBy.map((email, i) => (
                                                                                        <div key={i} className="w-10 h-10 rounded-full bg-slate-900 border-2 border-green-500 flex items-center justify-center text-xs font-bold text-green-400 shadow-lg shadow-green-900/50" title={email}>
                                                                                            {email.charAt(0).toUpperCase()}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest px-3 py-1 rounded-full border border-slate-800">
                                                                                    Awaiting Votes
                                                                                </span>
                                                                            )}
                                                                            {isThisTheResolution && (
                                                                                <span className="ml-2 px-3 py-1 rounded-full bg-green-500 text-black text-xs font-bold uppercase tracking-wider animate-pulse">
                                                                                    Resolution Reached
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Buttons */}
                                                                        <div className="flex items-center gap-4">
                                                                            {!isResolved && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() => handleSuggestionVote(index, 'reject')}
                                                                                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 border-2 ${myVote === 'reject'
                                                                                            ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/40'
                                                                                            : 'bg-transparent border-slate-700 text-slate-500 hover:border-red-500 hover:text-red-500 hover:bg-red-500/10'
                                                                                            }`}
                                                                                    >
                                                                                        <span className="flex items-center gap-2">
                                                                                            <X size={16} strokeWidth={3} /> REJECT
                                                                                        </span>
                                                                                    </button>

                                                                                    <button
                                                                                        onClick={() => handleSuggestionVote(index, 'accept')}
                                                                                        className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 border-2 ${myVote === 'accept'
                                                                                            ? 'bg-green-500 border-green-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.6)] scale-105'
                                                                                            : 'bg-transparent border-green-500/30 text-green-400 hover:bg-green-500 hover:border-green-400 hover:text-black hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                                                                                            }`}
                                                                                    >
                                                                                        <span className="flex items-center gap-2">
                                                                                            <CheckCircle size={16} strokeWidth={3} />
                                                                                            {myVote === 'accept' ? 'ACCEPTED' : 'ACCEPT'}
                                                                                        </span>
                                                                                    </button>
                                                                                </>
                                                                            )}

                                                                            {isResolved && isThisTheResolution && (
                                                                                <div className="flex items-center gap-2 md:gap-4 mt-2 md:mt-0">
                                                                                    <button disabled className="px-4 py-2 md:px-6 md:py-3 rounded-xl bg-green-600 text-white font-bold opacity-100 cursor-default shadow-lg shadow-green-900/40 text-[10px] md:text-xs">
                                                                                        AGREEMENT FINALIZED
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => generateResolutionPDF(dispute, suggestionText)}
                                                                                        className="px-4 py-2 md:px-6 md:py-3 rounded-xl bg-slate-800 border border-slate-600 text-white font-bold hover:bg-slate-700 hover:border-slate-500 transition-all flex items-center gap-2 shadow-lg text-[10px] md:text-xs"
                                                                                        title="Download Agreement PDF"
                                                                                    >
                                                                                        <Download size={14} className="md:w-[18px] md:h-[18px]" />
                                                                                        <span>PDF</span>
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

export default DisputeDetails;
