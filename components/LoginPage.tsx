import React, { useState } from 'react';
import { FolderIcon } from './IconComponents';

interface LoginPageProps {
    onLogin: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
    onSignup?: (email: string, password?: string, name?: string) => Promise<{ success: boolean; error?: string }>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSignup }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState(''); 
    const [password, setPassword] = useState(''); 
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        if (isSignup) {
            if (password !== confirmPassword) {
                setError("Passwords do not match.");
                setLoading(false);
                return;
            }
            if (onSignup) {
                const result = await onSignup(email, password, name);
                if (result.success) {
                    setSuccessMsg("Account created! Please sign in.");
                    setIsSignup(false);
                    setPassword('');
                    setConfirmPassword('');
                } else {
                    setError(result.error || 'Signup failed.');
                }
            }
        } else {
            const result = await onLogin(email, password);
            if (!result.success) {
                setError(result.error || 'Login failed.');
            }
        }
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-base-200 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
            <div className="w-full max-w-md space-y-8 p-10 bg-base-100 dark:bg-gray-800 shadow-xl rounded-2xl">
                <div>
                    <div className="flex items-center justify-center">
                        <FolderIcon className="w-12 h-12 text-brand-primary" />
                        <h1 className="text-4xl font-bold ml-2 text-base-content dark:text-gray-100">CostPilot</h1>
                    </div>
                    <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        {isSignup ? 'Create an Account' : 'Welcome Back'}
                    </h2>
                     <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        {isSignup ? 'Join CostPilot to manage your projects' : 'Sign in to continue to your dashboard'}
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {isSignup && (
                             <div>
                                <label htmlFor="name" className="sr-only">Full Name</label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="relative block w-full appearance-none rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:z-10 focus:border-brand-primary focus:outline-none focus:ring-brand-primary sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors"
                                    placeholder="Full Name"
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="relative block w-full appearance-none rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:z-10 focus:border-brand-primary focus:outline-none focus:ring-brand-primary sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors"
                                placeholder="alice@example.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="relative block w-full appearance-none rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:z-10 focus:border-brand-primary focus:outline-none focus:ring-brand-primary sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors"
                                placeholder="password123"
                            />
                        </div>
                        {isSignup && (
                             <div>
                                <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="relative block w-full appearance-none rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:z-10 focus:border-brand-primary focus:outline-none focus:ring-brand-primary sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors"
                                    placeholder="Confirm Password"
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center py-2">{error}</div>
                    )}
                    {successMsg && (
                        <div className="text-green-500 text-sm text-center py-2">{successMsg}</div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-md border border-transparent bg-brand-primary py-3 px-4 text-sm font-medium text-brand-primary-content hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:bg-teal-400 dark:focus:ring-offset-gray-800 transition-colors"
                        >
                            {loading ? (isSignup ? 'Creating Account...' : 'Signing in...') : (isSignup ? 'Sign Up' : 'Sign in')}
                        </button>
                    </div>
                </form>
                
                <div className="text-center mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button 
                            onClick={() => { setIsSignup(!isSignup); setError(''); setSuccessMsg(''); }}
                            className="font-medium text-brand-primary hover:text-teal-700 dark:text-brand-primary dark:hover:text-teal-500"
                        >
                            {isSignup ? "Sign In" : "Sign Up"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;