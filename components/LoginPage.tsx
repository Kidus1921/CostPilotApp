
import React, { useState } from 'react';
import { FolderIcon } from './IconComponents';

interface LoginPageProps {
    onLogin: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState(''); 
    const [password, setPassword] = useState(''); 
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await onLogin(email);
        if (!result.success) {
            setError(result.error || 'Login failed.');
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
                        Welcome Back
                    </h2>
                     <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        Sign in to continue to your dashboard
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
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
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center py-2">{error}</div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-md border border-transparent bg-brand-primary py-3 px-4 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:bg-teal-400 dark:focus:ring-offset-gray-800 transition-colors"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
    