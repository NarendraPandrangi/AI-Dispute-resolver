import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard');
        } catch (err) {
            setError('Failed to log in. Please check your credentials.');
            console.error(err);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--bg-dark)]">
            {/* Subtle Background Accent */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md z-10 p-4">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2 text-white">Welcome Back</h2>
                    <p className="text-gray-400">Sign in to manage your disputes</p>
                </div>

                <Card className="w-full glass-panel">
                    {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            id="email"
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="john@example.com"
                        />
                        <Input
                            id="password"
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />

                        <Button type="submit" className="w-full mt-6 btn-primary h-12" disabled={loading}>
                            {loading ? 'Signing In...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="flex items-center gap-4 my-6">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-gray-500 text-sm">OR</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <button
                        type="button"
                        className="btn-google"
                        onClick={async () => {
                            try {
                                setLoading(true);
                                await signInWithPopup(auth, googleProvider);
                                navigate('/dashboard');
                            } catch (err) {
                                console.error(err);
                                let errorMessage = 'Failed to sign in with Google.';
                                if (err.code === 'auth/popup-closed-by-user') {
                                    errorMessage = 'Sign-in popup was closed before completion.';
                                } else if (err.code === 'auth/operation-not-allowed') {
                                    errorMessage = 'Google Sign-In is not enabled in Firebase Console.';
                                } else {
                                    errorMessage = err.message;
                                }
                                setError(errorMessage);
                                setLoading(false);
                            }
                        }}
                        disabled={loading}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        <span>Sign in with Google</span>
                    </button>

                    <div className="mt-6 text-center text-sm text-gray-400">
                        Don't have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">Create one</Link>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Login;
