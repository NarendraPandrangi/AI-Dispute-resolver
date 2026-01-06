import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, db, googleProvider } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        try {
            setError('');
            setLoading(true);

            // Create user auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user document
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                createdAt: new Date(),
                role: 'user' // Default role
            });

            navigate('/dashboard');
        } catch (err) {
            setError('Failed to create an account. ' + err.message);
            console.error(err);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#030014]">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/4 right-0 w-[800px] h-[800px] bg-violet-600/15 rounded-full blur-[120px] mix-blend-screen" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[120px] mix-blend-screen" />

            <div className="w-full max-w-md z-10 p-4">
                <div className="text-center mb-8">
                    <h2 className="heading-xl text-4xl mb-2">Create Account</h2>
                    <p className="text-gray-400">Join the fair resolution platform</p>
                </div>

                <Card className="w-full glass-panel border-white/10 bg-white/5 backdrop-blur-xl">
                    {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm">{error}</div>}

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
                        <Input
                            id="confirm-password"
                            label="Confirm Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />

                        <Button type="submit" className="w-full mt-4 h-12" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </Button>
                    </form>

                    <div className="flex items-center gap-4 my-6">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-gray-500 text-sm">OR</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <button
                        type="button"
                        className="btn-google h-12 hover:bg-white hover:text-gray-900"
                        onClick={async () => {
                            try {
                                setLoading(true);
                                const userCredential = await signInWithPopup(auth, googleProvider);
                                const user = userCredential.user;

                                // Check if user exists
                                const userDoc = await getDoc(doc(db, "users", user.uid));

                                if (!userDoc.exists()) {
                                    // Create user document if it doesn't exist
                                    await setDoc(doc(db, "users", user.uid), {
                                        email: user.email,
                                        createdAt: new Date(),
                                        role: 'user'
                                    });
                                }

                                navigate('/dashboard');
                            } catch (err) {
                                console.error(err);
                                let errorMessage = 'Failed to sign up with Google.';
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
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                        <span>Sign up with Google</span>
                    </button>

                    <div className="mt-6 text-center text-sm text-gray-400">
                        Already have an account? <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">Log In</Link>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Register;
