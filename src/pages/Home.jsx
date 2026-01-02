import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import { Scale, ShieldCheck, Zap } from 'lucide-react';

const Home = () => {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Navigation */}
            <nav className="border-b border-gray-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <Scale className="text-blue-500" />
                        <span className="font-bold text-xl">FairResolve</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-sm font-medium hover:text-white text-gray-300">Log In</Link>
                        <Link to="/register">
                            <Button>Get Started</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1">
                <section className="relative pt-32 pb-20 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] -z-10" />

                    <div className="container text-center max-w-4xl">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="heading-xl mb-6">
                                Resolve Conflicts <br />
                                <span className="text-gradient">Fairly & Efficiently</span>
                            </h1>
                            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                                An AI-powered platform designed to help you mediate disputes, analyze evidence, and find neutral ground without the headache.
                            </p>

                            <div className="flex items-center justify-center gap-4">
                                <Link to="/register">
                                    <Button className="px-8 py-4">Start a Resolution</Button>
                                </Link>
                                <Link to="/login">
                                    <Button variant="secondary" className="px-8 py-4">Existing Dispute</Button>
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 bg-slate-900/50">
                    <div className="container">
                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={Zap}
                                title="AI Analysis"
                                description="Instant analysis of both parties' statements using advanced language models to identify core issues."
                            />
                            <FeatureCard
                                icon={ShieldCheck}
                                title="Secure Evidence"
                                description="Upload documents and images securely. Only authorized parties can access sensitive information."
                            />
                            <FeatureCard
                                icon={Scale}
                                title="Neutral Mediation"
                                description="Receive unbiased, actionable suggestions for resolution based on facts and fairness."
                            />
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-gray-800 py-8 text-center text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} FairResolve. All rights reserved.</p>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon: Icon, title, description }) => (
    <div className="glass-panel p-8 hover:bg-white/5 transition-colors">
        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6 text-blue-400">
            <Icon size={24} />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
);

export default Home;
