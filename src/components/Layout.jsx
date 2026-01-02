import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Scale, LogOut, LayoutDashboard, PlusCircle, User, Bell, FileText, ShieldAlert, Settings } from 'lucide-react';

const Layout = () => {
    const { currentUser } = useAuth();
    console.log("Layout: currentUser photoURL:", currentUser?.photoURL?.substring(0, 50) + "..."); // Debug log

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
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
            >
                <div className="relative">
                    <Icon size={20} />
                    {badge > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center border-2 border-[#0f172a] transform scale-90">
                            {badge > 9 ? '9+' : badge}
                        </span>
                    )}
                </div>
                <span className="font-medium">{children}</span>
            </Link>
        );
    };

    return (
        <div className="min-h-screen flex text-gray-100">
            {/* Sidebar */}
            <aside className="w-64 border-r border-gray-800 bg-[#0f172a] hidden md:flex flex-col">
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Scale size={20} className="text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">FairResolve</span>
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

                <div className="p-4 border-t border-gray-800">
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer group">
                        {currentUser?.photoURL ? (
                            <img
                                key={currentUser.photoURL}
                                src={currentUser.photoURL}
                                alt="Avatar"
                                style={{ width: '24px', height: '24px', minWidth: '24px' }}
                                className="w-6 h-6 rounded-full border border-gray-600 object-cover"
                            />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600">
                                <User size={14} className="text-gray-400 group-hover:text-white" />
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
            <main className="flex-1 overflow-auto bg-[#0f172a] relative">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/0 to-slate-900/0" />
                <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
