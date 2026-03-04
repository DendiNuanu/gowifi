'use client'

import { useEffect, useState } from 'react'
import { getSettings, getAds, type PageSettings, type ScheduledAd } from '@/lib/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Nuanu Logo using the provided image asset
const NuanuLogo = () => (
    <img
        src="/img/NuanuLogo.png"
        alt="nuanu"
        style={{ width: '94px', height: '17px', aspectRatio: '94/17', opacity: 0.97 }}
    />
)

export default function LoginPage() {
    const [settings, setSettings] = useState<PageSettings | null>(null)
    const [activeAds, setActiveAds] = useState<ScheduledAd[]>([])
    const [currentAdIndex, setCurrentAdIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [connecting, setConnecting] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [paramsUrl, setParamsUrl] = useState('')
    const [mikrotikParams, setMikrotikParams] = useState<Record<string, string>>({})

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setParamsUrl(window.location.search)
            const params = new URLSearchParams(window.location.search)
            const p: Record<string, string> = {}
            params.forEach((value, key) => {
                p[key] = value
            })
            setMikrotikParams(p)
        }
    }, [])

    useEffect(() => {
        async function fetchData() {
            try {
                const [s, allAds] = await Promise.all([getSettings(), getAds()])
                setSettings(s)

                const now = new Date()
                const year = now.getFullYear()
                const month = String(now.getMonth() + 1).padStart(2, '0')
                const day = String(now.getDate()).padStart(2, '0')
                const todayStr = `${year}-${month}-${day}`
                const hours = String(now.getHours()).padStart(2, '0')
                const minutes = String(now.getMinutes()).padStart(2, '0')
                const nowTimeStr = `${hours}:${minutes}`

                const activeToday = allAds.filter(ad => {
                    if (!ad.is_active) return false
                    try {
                        if (ad.end_date) {
                            const adEndDate = ad.end_date.split('T')[0].trim()
                            if (todayStr > adEndDate) return false
                        }
                        if (ad.start_time) {
                            const adStartTime = ad.start_time.trim().substring(0, 5)
                            if (adStartTime.match(/^\d{2}:\d{2}$/)) {
                                if (nowTimeStr < adStartTime) return false
                            }
                        }
                        if (ad.end_time) {
                            const adEndTime = ad.end_time.trim().substring(0, 5)
                            if (adEndTime.match(/^\d{2}:\d{2}$/)) {
                                if (nowTimeStr > adEndTime) return false
                            }
                        }
                    } catch (e) {
                        return true
                    }
                    return true
                })

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
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9F6F1' }}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
                    <p className="text-xs text-gray-400 tracking-widest uppercase">Loading...</p>
                </div>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setConnecting(true)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string

        const emailRegex = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address.')
            setConnecting(false)
            return
        }

        const [userPart, domainPart] = email.toLowerCase().split('@')
        const hasVowel = /[aeiouy]/.test(userPart)
        if (!hasVowel) {
            alert('Please enter a real email address (e.g. yourname@domain.com)')
            setConnecting(false)
            return
        }

        if (userPart.length < 3 || domainPart.length < 4) {
            alert('Email is too short. Please enter your full email address.')
            setConnecting(false)
            return
        }

        const junkDomains = ['test.com', 'example.com', 'abc.com', 'asd.com']
        if (junkDomains.includes(domainPart)) {
            alert('This email domain is not allowed. Please use a real email.')
            setConnecting(false)
            return
        }

        const gatewayIP = mikrotikParams['ip'] || '192.168.1.1'
        const linkLogin = mikrotikParams['link-login-only'] || mikrotikParams['link-login'] || `http://${gatewayIP}/login`
        const hotspotUser = mikrotikParams['username'] || 'user'
        const hotspotPass = mikrotikParams['password'] || 'user'
        const dstUrl = 'https://www.nuanu.com/'

        const loginUrl = `${linkLogin}?username=${encodeURIComponent(hotspotUser)}&password=${encodeURIComponent(hotspotPass)}&dst=${encodeURIComponent(dstUrl)}`

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
            const resp = await fetch(`${API_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, tracking: true })
            })
            const result = await resp.json()
            if (!result.success) {
                alert(result.message || 'Invalid email address. Please try again.')
                setConnecting(false)
                return
            }
            window.location.href = loginUrl
        } catch (err) {
            console.error('Tracking error:', err)
            window.location.href = loginUrl
        }
    }

    const currentAd = activeAds[currentAdIndex]
    const hasMultipleAds = activeAds.length > 1

    return (
        <div
            className="login-container"
            style={{
                backgroundColor: settings?.background_color || '#1D2B29',
                backgroundImage: settings?.background_image ? (settings.background_image.startsWith('url') ? settings.background_image : `url(${settings.background_image})`) : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                
                .login-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    font-family: 'Inter', sans-serif;
                    width: 100%;
                    padding: 40px 16px;
                    box-sizing: border-box;
                }

                .login-card {
                    display: flex;
                    width: 100%;
                    max-width: 430px;
                    min-height: 700px;
                    flex-direction: column;
                    align-items: flex-start;
                    background: transparent;
                    position: relative;
                    overflow: hidden;
                    border-radius: 24px;
                    box-shadow: 0 24px 60px rgba(0,0,0,0.35);
                }

                /* Banner Ads Section */
                .banner-section {
                    display: flex;
                    height: 260px;
                    padding: 16px 24px 48px 16px;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: flex-start;
                    flex-shrink: 0;
                    align-self: stretch;
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    box-sizing: border-box;
                }

                /* Header with Logo and Ads Label */
                .banner-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    align-self: stretch;
                    width: 100%;
                }

                .ads-label {
                    display: flex;
                    width: 50px;
                    height: 23px;
                    padding: 6px 16px;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                    border-radius: 12px;
                    background: rgba(10, 15, 15, 0.20);
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                }

                /* Nav Slider */
                .nav-slider {
                    display: flex;
                    padding: 0 2px;
                    align-items: flex-start;
                    gap: 4px;
                    margin-top: auto;
                }

                .dot {
                    height: 4px;
                    border-radius: 2px;
                    background: rgba(255, 255, 255, 0.4);
                    transition: all 0.3s ease;
                    cursor: pointer;
                    border: none;
                }

                .dot.active {
                    background: #ffffff;
                    width: 20px;
                }

                .dot:not(.active) {
                    width: 6px;
                }

                /* Body Section */
                .body-section {
                    display: flex;
                    width: 100%;
                    box-sizing: border-box;
                    flex: 1;
                    padding: 32px 24px 40px;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 20px;
                    flex-shrink: 0;
                    border-radius: 24px 24px 0 0;
                    background: #F9F6F1;
                    z-index: 2;
                    margin-top: -31px;
                    position: relative;
                }

                .form-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: flex-start;
                    flex: 1 0 0;
                    align-self: stretch;
                }

                .nuanu-logo-body {
                    width: 94px;
                    height: 17px;
                    aspect-ratio: 94/17;
                    opacity: 0.97;
                    display: flex;
                }

                .welcome-text {
                    margin-top: 12px;
                    margin-bottom: 2px;
                }

                .welcome-subtitle {
                    font-size: 13px;
                    color: #6B7280;
                    font-weight: 400;
                    line-height: 1.4;
                    margin: 0;
                }

                .welcome-title {
                    font-size: 24px;
                    font-weight: 700;
                    color: #111111;
                    line-height: 1.2;
                    margin: 0;
                    letter-spacing: -0.5px;
                }

                /* Form */
                form {
                    display: flex;
                    padding-top: 12px;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 12px;
                    align-self: stretch;
                }

                .form-group {
                    align-self: stretch;
                }

                .form-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 4px;
                }

                .form-input {
                    width: 100%;
                    padding: 10px 14px;
                    border: 1px solid #E5E7EB;
                    border-radius: 8px;
                    font-size: 14px;
                    color: #111;
                    background: #fff;
                    outline: none;
                    transition: border-color 0.2s;
                }

                .form-input::placeholder {
                    color: #9CA3AF;
                }

                .form-input:focus {
                    border-color: #111111;
                }

                .checkbox-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }

                .checkbox-input {
                    width: 20px;
                    height: 20px;
                    appearance: none;
                    background-image: url('/img/Check Box.png');
                    background-size: cover;
                    background-position: center;
                    cursor: pointer;
                    margin: 0;
                    flex-shrink: 0;
                }

                .checkbox-input:checked {
                    background-color: #111111;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
                    background-size: 70%;
                    background-repeat: no-repeat;
                    background-position: center;
                }

                .checkbox-label {
                    font-size: 11px;
                    color: #6B7280;
                    line-height: 1.5;
                    cursor: pointer;
                    padding-top: 2px;
                }

                /* Connect Button */
                .connect-btn {
                    width: 100%;
                    padding: 14px;
                    background: #111111;
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .connect-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                /* Divider */
                .divider {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    margin-top: 12px;
                }

                .divider-line {
                    flex: 1;
                    height: 1px;
                    background: #E5E7EB;
                }

                .divider-text {
                    font-size: 12px;
                    color: #9CA3AF;
                }

                /* Social buttons */
                .social-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    width: 100%;
                    margin-top: 12px;
                    padding-bottom: 20px;
                }

                .social-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 10px;
                    border: 1px solid #E5E7EB;
                    border-radius: 40px;
                    background: #fff;
                    color: #374151;
                    font-size: 13px;
                    font-weight: 500;
                    text-decoration: none;
                }

                .social-btn img {
                    width: 18px;
                    height: 18px;
                    object-fit: contain;
                }

                .spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>

            <main className="login-card">

                {/* Banner Section */}
                <div
                    className="banner-section"
                    style={{
                        backgroundImage: currentAd ? `url(${currentAd.image})` : "url('/img/Banner ads.png')",
                        backgroundColor: 'lightgray',
                        cursor: currentAd?.link ? 'pointer' : 'default'
                    }}
                    onClick={() => {
                        if (currentAd?.link) {
                            window.location.href = `/ad-landing?url=${encodeURIComponent(currentAd.link)}`
                        }
                    }}
                >
                    <div className="banner-header">
                        <div className="ads-label">Ads</div>
                    </div>

                    {/* Nav Slider */}
                    <div className="nav-slider">
                        {(activeAds.length > 0 ? activeAds : [1]).map((_, i) => (
                            <button
                                key={i}
                                className={`dot${i === currentAdIndex ? ' active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setCurrentAdIndex(i)
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Body Section */}
                <div className="body-section">
                    <div className="form-container">
                        {/* Nuanu Logo */}
                        <div className="nuanu-logo-body">
                            <NuanuLogo />
                        </div>

                        {/* Welcome text */}
                        <div className="welcome-text">
                            <p className="welcome-subtitle">Welcome to</p>
                            <h1 className="welcome-title">Nuanu Free WiFi</h1>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="email">Email Address</label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    required
                                    className="form-input"
                                />
                            </div>

                            <div className="checkbox-row">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    required
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="checkbox-input"
                                />
                                <label htmlFor="terms" className="checkbox-label">
                                    I agree to receive updates and exclusive offers from Nuanu.
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={connecting}
                                className="connect-btn"
                            >
                                {connecting ? (
                                    <>
                                        <div className="spinner" />
                                        <span>Connecting...</span>
                                    </>
                                ) : (
                                    'Connect'
                                )}
                            </button>
                        </form>

                        {/* Social Login */}
                        {(settings.google_login_enabled === 'true' || settings.facebook_login_enabled === 'true') && (
                            <>
                                <div className="divider">
                                    <div className="divider-line" />
                                    <span className="divider-text">Or connect with</span>
                                    <div className="divider-line" />
                                </div>

                                <div className="social-grid">
                                    {settings.google_login_enabled === 'true' && (
                                        <a href={`/auth/google/login${paramsUrl}`} className="social-btn">
                                            <img src="/img/google 1.png" alt="google" />
                                            Google
                                        </a>
                                    )}
                                    {settings.facebook_login_enabled === 'true' && (
                                        <a href={`/auth/facebook/login${paramsUrl}`} className="social-btn">
                                            <img src="/img/facebook 1.png" alt="facebook" />
                                            Facebook
                                        </a>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
