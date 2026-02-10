'use client'

import { useEffect, useState } from 'react'
import { getSettings, getAds, type PageSettings, type ScheduledAd } from '@/lib/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function LoginPage() {
    const [settings, setSettings] = useState<PageSettings | null>(null)
    const [activeAds, setActiveAds] = useState<ScheduledAd[]>([])
    const [currentAdIndex, setCurrentAdIndex] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const [s, allAds] = await Promise.all([getSettings(), getAds()])
                setSettings(s)

                console.log('📊 All ads from backend:', allAds)

                // Filter ads that are currently active
                const now = new Date()

                // Get local date string YYYY-MM-DD
                const year = now.getFullYear()
                const month = String(now.getMonth() + 1).padStart(2, '0')
                const day = String(now.getDate()).padStart(2, '0')
                const todayStr = `${year}-${month}-${day}`

                // Get local time string HH:mm
                const hours = String(now.getHours()).padStart(2, '0')
                const minutes = String(now.getMinutes()).padStart(2, '0')
                const nowTimeStr = `${hours}:${minutes}` // Format HH:mm

                console.log(`🕒 System Time: ${todayStr} ${nowTimeStr}`)

                const activeToday = allAds.filter(ad => {
                    // 1. Check Active Status
                    if (!ad.is_active) return false

                    try {
                        // 2. Check Date Range
                        // Start Date: ALLOW FUTURE ADS (User preference: 'Active' status overrides start date)
                        /* 
                        if (ad.start_date) {
                            const adStartDate = ad.start_date.split('T')[0].trim()
                            if (todayStr < adStartDate) return false
                        }
                        */

                        // End Date: If exists, today must be <= end_date
                        if (ad.end_date) {
                            const adEndDate = ad.end_date.split('T')[0].trim()
                            if (todayStr > adEndDate) return false
                        }

                        // 3. Check Time Range - Fail Open if parsing error
                        // Start Time
                        if (ad.start_time) {
                            const adStartTime = ad.start_time.trim().substring(0, 5) // "HH:mm"
                            if (adStartTime.match(/^\d{2}:\d{2}$/)) {
                                if (nowTimeStr < adStartTime) return false
                            }
                        }

                        // End Time
                        if (ad.end_time) {
                            const adEndTime = ad.end_time.trim().substring(0, 5) // "HH:mm"
                            if (adEndTime.match(/^\d{2}:\d{2}$/)) {
                                if (nowTimeStr > adEndTime) return false
                            }
                        }
                    } catch (e) {
                        console.warn('Ad filter error (allowing ad):', e)
                        // If any check fails due to bad data, show the ad anyway
                        return true
                    }

                    return true
                })

                console.log(`✅ Active ads (${activeToday.length}):`, activeToday)
                setActiveAds(activeToday)
            } catch (err) {
                console.error('Failed to fetch ads:', err)
                setActiveAds([])
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Auto-rotate carousel every 5 seconds
    useEffect(() => {
        if (activeAds.length <= 1) return
        const timer = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % activeAds.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [activeAds.length])

    if (loading || !settings) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <div className="text-white flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-white rounded-full animate-spin" />
                    <p className="font-bold tracking-widest text-xs uppercase opacity-50">Loading Portal...</p>
                </div>
            </div>
        )
    }

    let bgImage = settings.background_image
    if (bgImage.startsWith('url(')) {
        bgImage = bgImage.slice(4, -1).replace(/['"]/g, '')
    }

    const backgroundStyle = {
        backgroundImage: `url('${bgImage}')`,
        backgroundColor: settings.background_color,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        // MikroTik Hotspot Parameters from query string (passed by login.html)
        const params = new URLSearchParams(window.location.search)
        const gatewayIP = params.get('ip') || '192.168.1.1'
        const linkLogin = params.get('link-login-only') || `http://${gatewayIP}/login`
        const hotspotUser = params.get('username') || 'user'
        const hotspotPass = params.get('password') || 'password' // Typically empty for trial
        const dstUrl = 'https://www.nuanu.com/'

        // Construct final MikroTik login URL
        const loginUrl = `${linkLogin}?username=${encodeURIComponent(hotspotUser)}&password=${encodeURIComponent(hotspotPass)}&dst=${encodeURIComponent(dstUrl)}`

        // Save email tracking (background)
        const formData = new FormData(e.currentTarget)
        const email = formData.get('email')

        // Tracking to Go backend
        const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
        fetch(`${API_URL}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, tracking: true })
        }).catch(() => { })

        // Redirect to MikroTik for authentication
        window.location.href = loginUrl
    }

    const currentAd = activeAds[currentAdIndex]
    const hasMultipleAds = activeAds.length > 1

    const paramsUrl = typeof window !== 'undefined' ? window.location.search : ''

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative font-sans" style={backgroundStyle}>
            {/* Dark sophisticated overlay */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />

            <main className="relative w-full max-w-[480px] bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_32px_64px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-700">

                {/* Ads Carousel if active */}
                {currentAd && (
                    <div className="relative group overflow-hidden border-b border-gray-100">
                        {/* Carousel Container */}
                        <div className="relative h-48 sm:h-56 overflow-hidden bg-gray-900">
                            {/* Ad Image with fade transition */}
                            <img
                                key={currentAdIndex}
                                src={currentAd.image}
                                alt={currentAd.title}
                                className="w-full h-full object-cover transition-opacity duration-700 animate-in fade-in"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent" />

                            {/* Featured Badge */}
                            <div className="absolute top-4 left-4">
                                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">Featured Offer</span>
                            </div>

                            {/* Left Arrow - Always visible if multiple ads */}
                            {hasMultipleAds && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setCurrentAdIndex((prev) => (prev - 1 + activeAds.length) % activeAds.length)
                                    }}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm p-2 rounded-full transition-all hover:scale-110 border border-white/20 shadow-lg"
                                    aria-label="Previous ad"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            )}

                            {/* Right Arrow - Always visible if multiple ads */}
                            {hasMultipleAds && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setCurrentAdIndex((prev) => (prev + 1) % activeAds.length)
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm p-2 rounded-full transition-all hover:scale-110 border border-white/20 shadow-lg"
                                    aria-label="Next ad"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            )}

                            {/* Ad Title and Description */}
                            <div className="absolute bottom-4 left-6 right-6">
                                <div className="flex items-center gap-2 mb-1.5 opacity-80">
                                    <div className="h-1 w-1 rounded-full bg-blue-400 animate-pulse" />
                                    <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Limited Campaign</p>
                                </div>
                                <h2 className="text-xl font-black text-white leading-tight mb-1 drop-shadow-sm">{currentAd.title}</h2>
                                <p className="text-xs text-gray-200 line-clamp-2 drop-shadow-sm font-medium opacity-90 leading-relaxed">{currentAd.description}</p>
                            </div>

                            {/* Carousel Indicators - Only show if multiple ads */}
                            {hasMultipleAds && (
                                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                                    {activeAds.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentAdIndex(index)}
                                            className={`h-2 rounded-full transition-all ${index === currentAdIndex
                                                ? 'w-6 bg-white'
                                                : 'w-2 bg-white/50 hover:bg-white/70'
                                                }`}
                                            aria-label={`Go to ad ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Header Context if no Ad */}
                {!currentAd && (
                    <div className="h-24 sm:h-28 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center p-6 text-center border-b border-white/10 shadow-lg">
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-2xl">{settings.page_title}</h1>
                    </div>
                )}

                {/* Conditional Title if Ad is present */}
                {currentAd && (
                    <div className="px-8 pt-8 text-center">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{settings.page_title}</h1>
                    </div>
                )}

                {/* Login Form */}
                <div className="p-8 sm:p-10 space-y-8">
                    <p className="text-center text-sm font-semibold text-gray-500/80">
                        Sign in to connect to the network.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Connection</label>
                            <input
                                type="email"
                                name="email"
                                placeholder="name@example.com"
                                required
                                className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none transition-all text-gray-900 font-bold placeholder:text-gray-300 bg-gray-50/50"
                            />
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 group transition-colors hover:bg-blue-50">
                            <input type="checkbox" id="terms" required className="mt-0.5 w-5 h-5 rounded-lg border-2 border-blue-200 text-blue-600 focus:ring-offset-0 focus:ring-0 transition-all cursor-pointer" />
                            <label htmlFor="terms" className="text-[11px] leading-relaxed text-gray-600 font-medium cursor-pointer select-none">
                                I agree to receive promotional emails, newsletters, and updates from NUANU.
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-base font-black rounded-2xl shadow-[0_12px_24px_-8px_rgba(37,99,235,0.4)] hover:shadow-[0_16px_32px_-8px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0"
                        >
                            {settings.button_text}
                        </button>
                    </form>

                    {/* Social Login Section */}
                    {(settings.google_login_enabled === 'true' || settings.facebook_login_enabled === 'true') && (
                        <div className="space-y-6 pt-6 border-t border-gray-50">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                                <span className="relative bg-white px-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Or connect with</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 uppercase font-black text-[10px] tracking-widest">
                                {settings.google_login_enabled === 'true' && (
                                    <a href={`/auth/google/login${paramsUrl}`} className="flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group active:scale-95 shadow-sm">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        <span className="text-gray-600">Google</span>
                                    </a>
                                )}
                                {settings.facebook_login_enabled === 'true' && (
                                    <a href={`/auth/facebook/login${paramsUrl}`} className="flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group active:scale-95 shadow-sm">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                        <span className="text-gray-600">Facebook</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mt-8 text-center pt-4">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Nuanu WiFi❤️</p>
                    </div>
                </div>
            </main>
        </div>
    )
}
