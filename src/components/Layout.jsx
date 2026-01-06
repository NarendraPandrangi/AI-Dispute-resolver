import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Scale, LogOut, LayoutDashboard, PlusCircle, User, Bell, FileText, ShieldAlert, Settings } from 'lucide-react';

const Layout = () => {
    const { currentUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "notifications"),
            where("recipientEmail", "==", currentUser.email),
            where("read", "==", false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch {
            console.error('Failed to log out');
        }
    };

    const NavLink = ({ to, icon: Icon, children, badge }) => {
        const currentFullPath = location.pathname + location.search;
        const isActive = currentFullPath === to || (to === '/dashboard' && currentFullPath === '/dashboard');

        return (
            <Link
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative ${isActive
                    ? 'bg-violet-600/10 text-[var(--primary-light)] border border-violet-600/20 shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
            >
                <div className="relative">
                    <Icon size={20} />
                    {badge > 0 && (
                        <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center border-2 border-[#0f0729] transform scale-90 box-content">
                            {badge > 9 ? '9+' : badge}
                        </span>
                    )}
                </div>
                <span className="font-medium">{children}</span>
            </Link>
        );
    };

    return (
        <div className="min-h-screen flex text-gray-100 font-sans">
            {/* Sidebar with Glass effect */}
            <aside className="w-64 border-r border-white/5 bg-[var(--bg-card)]/80 backdrop-blur-xl hidden md:flex flex-col relative z-20">
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-900/20">
                            <Scale size={20} className="text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-violet-200">FairResolve</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                    <NavLink to="/dashboard?filter=created_by_me" icon={FileText}>Created by Me</NavLink>
                    <NavLink to="/dashboard?filter=against_me" icon={ShieldAlert}>Filed Against Me</NavLink>
                    <NavLink to="/create-dispute" icon={PlusCircle}>New Dispute</NavLink>
                    <NavLink to="/notifications" icon={Bell} badge={unreadCount}>Notifications</NavLink>
                    <NavLink to="/profile" icon={Settings}>Settings</NavLink>
                </nav>

                <div className="p-4 border-t border-white/5">
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border border-transparent hover:border-white/5">
                        {currentUser?.photoURL ? (
                            <img
                                key={currentUser.photoURL}
                                src={currentUser.photoURL}
                                alt="Avatar"
                                style={{ width: '32px', height: '32px', minWidth: '32px' }}
                                className="w-8 h-8 rounded-full border border-gray-600 object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-violet-900/30 flex items-center justify-center border border-violet-500/30">
                                <User size={16} className="text-violet-300 group-hover:text-white" />
                            </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate text-gray-200 group-hover:text-white">
                                {currentUser?.displayName || currentUser?.email?.split('@')[0]}
                            </p>
                            {currentUser?.displayName && (
                                <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                            )}
                        </div>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="btn-logout"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                {/* Dynamic Background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-fuchsia-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
                </div>

                <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
