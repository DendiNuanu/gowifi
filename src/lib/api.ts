// Use relative path for production (Nginx handles /api -> :8080)
// Fallback to localhost:8080 only if specifically needed during dev without proxy
export const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface PageSettings {
    background_image: string
    background_image_type: string
    background_image_data: string
    background_color: string
    page_title: string
    button_text: string
    google_login_enabled: string
    facebook_login_enabled: string
    google_client_id: string
    google_client_secret: string
    facebook_app_id: string
    facebook_app_secret: string
}

export interface ScheduledAd {
    id?: number
    title: string
    description: string
    image: string
    start_date: string
    end_date: string
    start_time: string
    end_time: string
    is_active: boolean
}

export async function getSettings(): Promise<PageSettings> {
    try {
        console.log(`📡 Fetching settings from: ${API_URL}/api/settings`)
        const res = await fetch(`${API_URL}/api/settings`, {
            cache: 'no-store',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json()
    } catch (error) {
        console.error('❌ Error fetching settings:', error)
        console.warn(`⚠️ Backend not available at ${API_URL}. Using default settings.`)
        return {
            background_image: 'url(/img/nuanu.png)',
            background_image_type: 'url',
            background_image_data: '',
            background_color: '#667eea',
            page_title: 'Welcome To NUANU Free WiFi',
            button_text: 'Connect to WiFi',
            google_login_enabled: 'false',
            facebook_login_enabled: 'false',
            google_client_id: '',
            google_client_secret: '',
            facebook_app_id: '',
            facebook_app_secret: '',
        }
    }
}

export async function updateSettings(settings: Partial<PageSettings>) {
    const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
    })
    return res.json()
}

export async function uploadFile(file: File, isAd = false) {
    const formData = new FormData()
    formData.append('file', file)
    if (isAd) formData.append('is_ad', 'true')

    const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
    })
    return res.json()
}

export async function getAds(): Promise<ScheduledAd[]> {
    try {
        console.log(`📡 Fetching ads from: ${API_URL}/api/ads`)
        const res = await fetch(`${API_URL}/api/ads`, {
            cache: 'no-store',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json()
    } catch (error) {
        console.error('❌ Error fetching ads:', error)
        console.warn(`⚠️ Could not load ads from backend. Showing empty list.`)
        return []
    }
}

export async function createAd(ad: ScheduledAd) {
    const res = await fetch(`${API_URL}/api/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ad),
    })
    return res.json()
}

export async function updateAd(id: number, ad: ScheduledAd) {
    const res = await fetch(`${API_URL}/api/ads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ad),
    })
    return res.json()
}

export async function deleteAd(id: number) {
    const res = await fetch(`${API_URL}/api/ads/${id}`, {
        method: 'DELETE',
    })
    return res.json()
}

export async function getActiveAd(): Promise<{ ad: ScheduledAd | null }> {
    try {
        const res = await fetch(`${API_URL}/api/active-ad`, { cache: 'no-store' })
        return res.json()
    } catch (err) {
        return { ad: null }
    }
}
