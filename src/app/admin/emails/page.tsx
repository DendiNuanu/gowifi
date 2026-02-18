'use client'

import { useState, useEffect } from 'react'
import { getEmails, type CollectedEmail, API_URL } from '@/lib/api'
import { Loader2, ArrowLeft, Download, RefreshCw, Mail, Calendar, Hash } from 'lucide-react'
import Link from 'next/link'

export default function EmailsPage() {
    const [emails, setEmails] = useState<CollectedEmail[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setRefreshing(true)
        try {
            const data = await getEmails()
            setEmails(data)
        } catch (err) {
            console.error('Failed to fetch emails:', err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const downloadCSV = () => {
        if (emails.length === 0) return

        const headers = ['ID', 'Email Address', 'Source', 'Date Collected']
        const rows = emails.map(email => [
            email.id,
            email.email,
            email.source,
            new Date(email.created_at).toLocaleString('en-GB')
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `collected_emails_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin"
                            className="p-2 bg-white hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 shadow-sm transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Collected Emails</h1>
                            <p className="text-sm text-gray-500 font-medium">Export and manage user database</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={downloadCSV}
                            disabled={emails.length === 0}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            Download CSV
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Mail className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Emails</p>
                            <p className="text-2xl font-black text-gray-900">{emails.length}</p>
                        </div>
                    </div>
                    {/* Could add more stats here like "Collected Today", etc. if backend supports it */}
                </div>

                {/* Emails Table */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                        <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Date Collected</div>
                                    </th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                        <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email Address</div>
                                    </th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                        <div className="flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> Source</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {emails.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-12 text-center text-gray-400 font-medium">
                                            No emails collected yet.
                                        </td>
                                    </tr>
                                ) : (
                                    emails.map((item) => (
                                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-8 py-4 text-xs font-bold text-gray-500 border-b border-gray-50">
                                                {new Date(item.created_at).toLocaleString('en-GB', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-8 py-4 text-sm font-black text-gray-900 border-b border-gray-50">
                                                {item.email}
                                            </td>
                                            <td className="px-8 py-4 border-b border-gray-50">
                                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border shadow-sm ${item.source === 'google' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        item.source === 'facebook' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                            'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                    {item.source || 'Manual'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
