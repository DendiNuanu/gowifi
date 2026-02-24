'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AdLandingContent() {
    const searchParams = useSearchParams()
    const url = searchParams.get('url')

    const handleVisit = () => {
        if (url) {
            window.open(url, '_blank')
        }
    }

    return (
        <div className="landing-container">
            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                
                * { box-sizing: border-box; margin: 0; padding: 0; }

                .landing-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Inter', sans-serif;
                    background-color: #F9F6F1;
                    padding: 20px;
                }

                .landing-card {
                    width: 100%;
                    max-width: 400px;
                    background: #ffffff;
                    border-radius: 24px;
                    padding: 40px 28px;
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07);
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                }

                .icon-container {
                    width: 72px;
                    height: 72px;
                    background: #F3F4F6;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .message-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: #111111;
                    line-height: 1.3;
                }

                .message-text {
                    font-size: 14px;
                    color: #6B7280;
                    line-height: 1.6;
                }

                .url-badge {
                    background: #F3F4F6;
                    border-radius: 8px;
                    padding: 8px 14px;
                    font-size: 13px;
                    color: #374151;
                    word-break: break-all;
                    width: 100%;
                    text-align: left;
                }

                .visit-btn {
                    width: 100%;
                    padding: 15px;
                    background: #111111;
                    color: #ffffff;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .visit-btn:hover {
                    opacity: 0.85;
                }

                .back-link {
                    font-size: 14px;
                    color: #9CA3AF;
                    text-decoration: none;
                    cursor: pointer;
                    background: none;
                    border: none;
                    font-family: inherit;
                }

                .back-link:hover {
                    color: #6B7280;
                }
            `}</style>

            <div className="landing-card">
                {/* WiFi/Internet icon */}
                <div className="icon-container">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    <h1 className="message-title">Internet Required</h1>
                    <p className="message-text">
                        Visiting this website requires an internet connection. You need to log in to get free WiFi access first, or tap below to visit the site.
                    </p>
                </div>

                {url && (
                    <div className="url-badge">🔗 {url}</div>
                )}

                <button onClick={handleVisit} className="visit-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Visit Website
                </button>

                <button onClick={() => window.history.back()} className="back-link">
                    ← Back to Login
                </button>
            </div>
        </div>
    )
}

export default function AdLandingPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdLandingContent />
        </Suspense>
    )
}
