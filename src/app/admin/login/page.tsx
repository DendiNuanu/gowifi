'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, User, ArrowRight, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/api'

export default function AdminLoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })

            const data = await res.json()

            if (data.success) {
                // Set a simple cookie or localStorage for the session
                localStorage.setItem('admin_session', data.token)
                document.cookie = `admin_logged_in=true; path=/; max-age=86400`
                router.push('/admin')
            } else {
                setError(data.message || 'Invalid credentials')
            }
        } catch (err) {
            setError('Connection refused. Is the backend running?')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans text-gray-900">
            {/* Background blobs for premium feel */}
            <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"></div>
            </div>

            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden border border-white/20">
                    <div className="p-8 md:p-10">
                        {/* Logo & Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center p-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl mb-6 shadow-xl shadow-indigo-100">
                                <div className="bg-white p-4 rounded-[22px]">
                                    <Image
                                        src="/logo.png"
                                        alt="Nuanu Logo"
                                        width={60}
                                        height={60}
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900">Admin Portal</h1>
                            <p className="text-gray-400 mt-3 text-sm font-medium">Secure access to Nuanu WiFi Management</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl flex items-start gap-3 animate-shake">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="block w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="Enter your username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="block w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group transition-all disabled:opacity-70 disabled:hover:bg-indigo-600"
                            >
                                {loading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-50 flex justify-center">
                        <p className="text-xs text-gray-400">© 2026 Nuanu WiFi Management System</p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
        </div>
    )
}
