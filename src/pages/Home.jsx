import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import { Scale, ShieldCheck, Zap } from 'lucide-react';

const Home = () => {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Navigation */}
            <nav className="border-b border-white/5 bg-[var(--bg-dark)]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container flex items-center justify-between h-20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                            <Scale className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">FairResolve</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link to="/login" className="text-sm font-medium hover:text-white text-gray-300 transition-colors">Log In</Link>
                        <Link to="/register">
                            <Button className="shadow-lg shadow-violet-600/20">Get Started</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] -z-10 mix-blend-screen pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-fuchsia-600/15 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none" />
                <div className="absolute top-1/3 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none" />

                <section className="relative pt-32 pb-32">
                    <div className="container text-center max-w-5xl mx-auto relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-8 backdrop-blur-sm">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                                </span>
                                AI-Powered Mediation v2.0
                            </div>

                            <h1 className="heading-xl mb-8 text-balance">
                                Resolve Disputes <br />
                                <span className="text-gradient">Fairly & Speedily</span>
                            </h1>
                            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed text-balance">
                                Escape the legal maze. Our AI mediator helps you analyze evidence, find neutral ground, and reach binding resolutions in minutes, not months.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link to="/register">
                                    <Button className="px-8 py-4 text-lg btn-primary min-w-[200px] h-14 rounded-xl">Start Resolving</Button>
                                </Link>
                                <Link to="/login">
                                    <Button variant="secondary" className="px-8 py-4 text-lg min-w-[200px] h-14 rounded-xl bg-white/5 border-white/10 hover:bg-white/10">Track Case</Button>
                                </Link>
                            </div>

                            {/* Trust/Stats Mockup */}
                            <div className="mt-20 pt-10 border-t border-white/5 grid grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
                                <div>
                                    <div className="text-4xl font-bold text-white mb-2">95%</div>
                                    <div className="text-sm text-gray-400 font-medium">Resolution Rate</div>
                                </div>
                                <div>
                                    <div className="text-4xl font-bold text-white mb-2">24h</div>
                                    <div className="text-sm text-gray-400 font-medium">Avg. Turnaround</div>
                                </div>
                                <div>
                                    <div className="text-4xl font-bold text-white mb-2">$0</div>
                                    <div className="text-sm text-gray-400 font-medium">Legal Fees</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 relative">
                    <div className="container">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">How It Works</h2>
                            <p className="text-gray-400 max-w-xl mx-auto text-lg">Three simple steps to move from conflict to consensus.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={Zap}
                                title="1. Instant AI Analysis"
                                description="Upload chat logs and evidence. Our AI instantly analyzes the tone, facts, and sentiment to identify the core conflict."
                                delay={0.1}
                            />
                            <FeatureCard
                                icon={ShieldCheck}
                                title="2. Secure Evidence"
                                description="Your documents are encrypted and analyzed locally where possible. Only relevant parties execute the final agreement."
                                delay={0.2}
                            />
                            <FeatureCard
                                icon={Scale}
                                title="3. Neutral Suggestions"
                                description="Get 5-7 actionable, unbiased resolution options. Accept the one that works best for both parties."
                                delay={0.3}
                            />
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-white/5 bg-[#0a051e] py-12 text-center text-gray-500 text-sm">
                <div className="container">
                    <div className="flex justify-center items-center gap-2 mb-4 opacity-50">
                        <Scale size={16} />
                        <span className="font-semibold">FairResolve</span>
                    </div>
                    <p>&copy; {new Date().getFullYear()} FairResolve. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        className="glass-panel p-8 hover:bg-white/5 transition-all group relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-600/20 transition-colors" />

        <div className="w-14 h-14 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl flex items-center justify-center mb-6 text-violet-300 group-hover:scale-110 transition-transform duration-300 border border-white/5 shadow-inner">
            <Icon size={28} />
        </div>
        <h3 className="text-xl font-bold mb-3 text-white group-hover:text-violet-200 transition-colors">{title}</h3>
        <p className="text-gray-400 leading-relaxed text-sm md:text-base">{description}</p>
    </motion.div>
);

export default Home;
