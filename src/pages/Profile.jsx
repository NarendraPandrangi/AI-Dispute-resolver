import React, { useState, useEffect } from 'react';
import { resizeImage } from '../utils/imageHelpers';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { User, Camera, Loader, Check } from 'lucide-react';

const Profile = () => {
    const { currentUser, updateUserProfile } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', content: '' });

    useEffect(() => {
        if (currentUser) {
            setDisplayName(currentUser.displayName || '');
            setPhotoURL(currentUser.photoURL || '');
        }
    }, [currentUser]); // Logic looks correct, but let's ensure image has a key

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            // Create local preview
            setPhotoURL(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', content: 'Starting process...' });

        try {
            // 1. Handle Photo Upload (if file selected)
            if (file) {
                setMessage({ type: '', content: 'Compressing image...' });
                const resizedFile = await resizeImage(file, 250); // 250px width

                setMessage({ type: '', content: 'Processing...' });
                const base64String = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(resizedFile);
                });

                // Bypass Storage completely. Save Base64 directly to Firestore User Doc.
                // This avoids storage permission/network issues and Auth profile size limits.
                setMessage({ type: '', content: 'Saving photo...' });
                await setDoc(doc(db, "users", currentUser.uid), {
                    photoBase64: base64String,
                    updatedAt: new Date()
                }, { merge: true });
            }

            // 2. Update Display Name (Standard Auth Profile)
            setMessage({ type: '', content: 'Updating name...' });
            if (displayName !== currentUser.displayName) {
                await updateUserProfile({
                    displayName
                });
            }

            setMessage({ type: 'success', content: 'Profile saved successfully!' });
            setFile(null);
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ type: 'error', content: `Error: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
                <p className="text-gray-400">Manage your account settings</p>
            </header>

            <Card>
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 border-2 border-gray-800 ring-2 ring-gray-700 shadow-xl">
                                {photoURL ? (
                                    <img
                                        key={photoURL}
                                        src={photoURL}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <User size={18} />
                                    </div>
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                                <Camera className="text-white" size={12} />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </label>
                        </div>
                        <p className="text-[10px] text-gray-500">Upload</p>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <Input
                            id="email"
                            label="Email Address"
                            value={currentUser?.email}
                            disabled
                            className="opacity-60 cursor-not-allowed"
                        />

                        <Input
                            id="displayName"
                            label="Display Name"
                            placeholder="e.g. John Doe"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </div>

                    {message.content && (
                        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {message.type === 'success' && <Check size={16} />}
                            {message.content}
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-gray-800">
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? (
                                <>
                                    <Loader size={18} className="animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default Profile;
