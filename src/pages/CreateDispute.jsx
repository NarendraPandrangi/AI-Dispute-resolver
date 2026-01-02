import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { createNotification } from '../services/notifications';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Upload, X } from 'lucide-react';

const CreateDispute = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        respondentEmail: ''
    });

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFiles([...files, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Upload Evidence
            let evidenceUrls = [];
            if (files.length > 0) {
                try {
                    evidenceUrls = await Promise.all(
                        files.map(async (file) => {
                            const storageRef = ref(storage, `evidence/${currentUser.uid}/${Date.now()}_${file.name}`);
                            await uploadBytes(storageRef, file);
                            return await getDownloadURL(storageRef);
                        })
                    );
                } catch (storageError) {
                    console.error("Storage Error:", storageError);
                    throw new Error("Storage Permission Denied. Check Firebase Storage Rules. " + storageError.message);
                }
            }

            // 2. Create Dispute Document
            // 2. Create Dispute Document
            let disputeRef;
            try {
                disputeRef = await addDoc(collection(db, "disputes"), {
                    title: formData.title,
                    description: formData.description,
                    creatorId: currentUser.uid,
                    creatorEmail: currentUser.email,
                    respondentEmail: formData.respondentEmail.toLowerCase(),
                    participants: [currentUser.email, formData.respondentEmail.toLowerCase()],
                    evidence: evidenceUrls,
                    status: 'pending_response',
                    createdAt: serverTimestamp(),
                    messages: []
                });

                // Notify Respondent
                await createNotification(
                    formData.respondentEmail.toLowerCase(),
                    "New Dispute Filed",
                    `User ${currentUser.email} has filed a new dispute: "${formData.title}" against you.`,
                    `/dispute/${disputeRef.id}`
                );

            } catch (firestoreError) {
                console.error("Firestore Error:", firestoreError);
                throw new Error("Database Permission Denied. Check Cloud Firestore Rules. " + firestoreError.message);
            }

            navigate('/dashboard');
        } catch (error) {
            console.error("Error creating dispute:", error);
            alert("Failed to create dispute: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">New Dispute</h1>
                <p className="text-gray-400">File a new case for AI mediation</p>
            </header>

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        id="title"
                        label="Dispute Title"
                        placeholder="e.g. Freelance Payment Issue"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className="mb-4"
                    />

                    <div className="flex flex-col gap-2">
                        <label htmlFor="description" className="text-sm font-medium text-gray-300">Description of Event</label>
                        <textarea
                            id="description"
                            rows={5}
                            className="input-field min-h-[120px] resize-y"
                            placeholder="Describe the situation clearly..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    <Input
                        id="respondent"
                        label="Other Party's Email"
                        type="email"
                        placeholder="their-email@example.com"
                        value={formData.respondentEmail}
                        onChange={(e) => setFormData({ ...formData, respondentEmail: e.target.value })}
                        required
                        className="mb-4"
                    />

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-300">Evidence (Optional)</label>
                        <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:bg-gray-800/50 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="mx-auto text-gray-500 mb-2" />
                            <p className="text-sm text-gray-400">Click or drag files to upload images/docs</p>
                        </div>

                        {files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {files.map((file, i) => (
                                    <div key={i} className="bg-gray-800 px-3 py-1 rounded-full text-xs flex items-center gap-2 text-gray-300">
                                        <span className="truncate max-w-[150px]">{file.name}</span>
                                        <button type="button" onClick={() => removeFile(i)} className="hover:text-red-400"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-700 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Dispute'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateDispute;
