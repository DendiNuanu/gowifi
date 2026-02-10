'use client'

import { useState, useEffect, useRef } from 'react'
import { getSettings, updateSettings, uploadFile, getAds, createAd, deleteAd, updateAd, getEmails, type PageSettings, type ScheduledAd, type CollectedEmail, API_URL } from '@/lib/api'
import { Upload, Save, Loader2, Image as ImageIcon, CheckCircle, Trash2, Calendar, Clock, Plus, Monitor, Pencil, X, AlertCircle } from 'lucide-react'
import ImageCropper from '@/components/ImageCropper'

export default function AdminPage() {
    const [settings, setSettings] = useState<PageSettings | null>(null)
    const [ads, setAds] = useState<ScheduledAd[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [previewImage, setPreviewImage] = useState<string>('')
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
    const [emails, setEmails] = useState<CollectedEmail[]>([])
    const [showNotification, setShowNotification] = useState(false)
    const [currentTime, setCurrentTime] = useState('')
    const [mounted, setMounted] = useState(false)
    const [showDuplicateModal, setShowDuplicateModal] = useState(false)
    const [duplicateDates, setDuplicateDates] = useState<string[]>([])

    // Cropper State
    const [croppingImage, setCroppingImage] = useState<string | null>(null)
    const [croppingTarget, setCroppingTarget] = useState<'bg' | 'ad' | null>(null) // 'bg' or 'ad'

    const fetchLock = useRef(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Ad form state
    const [adTitle, setAdTitle] = useState('')
    const [adDesc, setAdDesc] = useState('')
    const [adImageUrl, setAdImageUrl] = useState('')
    const [editingAd, setEditingAd] = useState<ScheduledAd | null>(null)
    const [pendingAd, setPendingAd] = useState<ScheduledAd | null>(null)
    const adFileInputRef = useRef<HTMLInputElement>(null)
    const adFormRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        if (!mounted) return
        if (fetchLock.current) return
        fetchLock.current = true

        async function fetchData() {
            console.log('🔄 AdminPage: Initializing data fetch from:', API_URL)
            try {
                const [settingsData, adsData, emailsData] = await Promise.all([getSettings(), getAds(), getEmails()])
                console.log('✅ AdminPage: Data fetched successfully')

                setSettings(settingsData)
                setAds(adsData)
                setEmails(emailsData)

                if (settingsData) {
                    let imgUrl = settingsData.background_image || ''
                    if (imgUrl.startsWith('url(')) {
                        imgUrl = imgUrl.slice(4, -1).replace(/['"]/g, '')
                    }
                    if (imgUrl) {
                        setPreviewImage(imgUrl.startsWith('/') ? `${API_URL}${imgUrl}` : imgUrl)
                    }
                }
            } catch (err) {
                console.error('❌ AdminPage: Failed to initialize data:', err)
                notify(`Cannot reach backend at ${API_URL}. Using default settings. Make sure Go server is running on port 8080.`, 'error')
            } finally {
                setLoading(false)
                console.log('🏁 AdminPage: Loading finished')
            }
        }
        fetchData()
    }, [mounted])

    useEffect(() => {
        setMounted(true)
        const updateTime = () => {
            setCurrentTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
        }
        updateTime()
        const timer = setInterval(updateTime, 30000)
        return () => clearInterval(timer)
    }, [])

    const getFullImageUrl = (url: string) => {
        if (!url) return ''
        if (url.startsWith('http')) return url
        let cleanUrl = url
        if (cleanUrl.startsWith('url(')) {
            cleanUrl = cleanUrl.slice(4, -1).replace(/['"]/g, '')
        }
        return cleanUrl.startsWith('/') ? `${API_URL}${cleanUrl}` : cleanUrl
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Anytime'
        try {
            // Handle ISO date strings like 2026-01-05T00:00:00Z
            const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
            const parts = dateOnly.split('-')
            if (parts.length === 3) {
                // Return as DD/MM/YYYY
                return `${parts[2]}/${parts[1]}/${parts[0]}`
            }
            return dateStr
        } catch {
            return dateStr
        }
    }

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '00:00'
        try {
            if (timeStr.includes('T')) {
                const timePart = timeStr.split('T')[1].split('.')[0]
                return timePart.slice(0, 5)
            }
            return timeStr.slice(0, 5)
        } catch {
            return timeStr
        }
    }

    const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type })
        setShowNotification(true)
        setTimeout(() => setShowNotification(false), 3000)
    }

    const checkDuplicateDates = (startDate: string, endDate: string, currentAdId?: number): string[] => {
        const duplicates: string[] = []
        // We only care about EXACT duplicates (same start AND same end)
        // Overlapping is allowed for carousel support.

        ads.forEach(ad => {
            // Skip if editing the same ad
            if (currentAdId && ad.id === currentAdId) return

            const adStartDate = ad.start_date ? ad.start_date.split('T')[0] : ''
            const adEndDate = ad.end_date ? ad.end_date.split('T')[0] : ''

            // Check if BOTH start and end dates match exactly
            if (startDate === adStartDate && endDate === adEndDate) {
                duplicates.push(`${ad.title} (${adStartDate} - ${adEndDate})`)
            }
        })

        return duplicates
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isAd = false) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Read file as DataURL for the cropper
        const reader = new FileReader()
        reader.addEventListener('load', () => {
            setCroppingImage(reader.result as string)
            setCroppingTarget(isAd ? 'ad' : 'bg')
        })
        reader.readAsDataURL(file)

        // Clear input so same file can be selected again if needed
        e.target.value = ''
    }

    const handleCropSave = async (blob: Blob) => {
        setCroppingImage(null)
        const target = croppingTarget
        setCroppingTarget(null)

        if (!blob) return

        // Create a File object from the Blob
        const file = new File([blob], "cropped_image.jpg", { type: "image/jpeg" })

        try {
            const result = await uploadFile(file, target === 'ad')
            if (result.success) {
                const fullUrl = result.url.startsWith('/') ? `${API_URL}${result.url}` : result.url
                if (target === 'ad') {
                    setAdImageUrl(fullUrl)
                } else {
                    setPreviewImage(fullUrl)
                }
                notify('Image uploaded successfully')
            }
        } catch (err) {
            console.error(err)
            alert('Failed to upload image')
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSaving(true)

        const formData = new FormData(e.currentTarget)
        const data = {
            page_title: formData.get('page_title') as string,
            button_text: formData.get('button_text') as string,
            background_color: formData.get('background_color') as string,
            google_login_enabled: formData.get('google_login_enabled') === 'on' ? 'true' : 'false',
            facebook_login_enabled: formData.get('facebook_login_enabled') === 'on' ? 'true' : 'false',
            google_client_id: formData.get('google_client_id') as string,
            google_client_secret: formData.get('google_client_secret') as string,
            facebook_app_id: formData.get('facebook_app_id') as string,
            facebook_app_secret: formData.get('facebook_app_secret') as string,
        }

        const result = await updateSettings(data)
        setSaving(false)

        if (result.success) {
            notify('Portal settings saved successfully!')
        } else {
            notify('Failed to save settings', 'error')
        }
    }

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        const startDate = formData.get('start_date') as string
        const endDate = formData.get('end_date') as string
        const startHour = (formData.get('start_hour') as string) || '00'
        const startMin = (formData.get('start_min') as string) || '00'
        const endHour = (formData.get('end_hour') as string) || '23'
        const endMin = (formData.get('end_min') as string) || '59'

        const adData: ScheduledAd = {
            title: formData.get('ad_title') as string,
            description: formData.get('ad_desc') as string,
            image: adImageUrl,
            start_date: startDate,
            end_date: endDate,
            start_time: `${startHour}:${startMin}:00`,
            end_time: `${endHour}:${endMin}:59`,
            is_active: editingAd ? editingAd.is_active : true
        }

        // Check for duplicate dates
        const duplicates = checkDuplicateDates(startDate, endDate, editingAd?.id)
        if (duplicates.length > 0 && !editingAd) {
            setDuplicateDates(duplicates)
            setPendingAd(adData) // Store data for potential override
            setShowDuplicateModal(true)
            return
        }

        // No conflict, safe to save directly
        await saveAdToBackend(adData)
    }

    const saveAdToBackend = async (data: ScheduledAd) => {
        let result
        if (editingAd && editingAd.id) {
            result = await updateAd(editingAd.id, data)
        } else {
            result = await createAd(data)
        }

        if (result.success) {
            const adsData = await getAds()
            setAds(adsData)
            resetAdForm()
            notify(editingAd ? 'Campaign updated!' : 'Campaign created!')
        } else {
            notify('Failed to save campaign', 'error')
        }
    }

    const resetAdForm = () => {
        setEditingAd(null)
        setAdTitle('')
        setAdDesc('')
        setAdImageUrl('')
        if (adFormRef.current) {
            adFormRef.current.reset()
        }
    }

    const handleEditAd = (ad: ScheduledAd) => {
        setEditingAd(ad)
        setAdTitle(ad.title)
        setAdDesc(ad.description)
        setAdImageUrl(getFullImageUrl(ad.image))

        if (adFormRef.current) {
            const form = adFormRef.current
            const startDateField = form.elements.namedItem('start_date') as HTMLInputElement
            const endDateField = form.elements.namedItem('end_date') as HTMLInputElement
            const startHourField = form.elements.namedItem('start_hour') as HTMLSelectElement
            const startMinField = form.elements.namedItem('start_min') as HTMLSelectElement
            const endHourField = form.elements.namedItem('end_hour') as HTMLSelectElement
            const endMinField = form.elements.namedItem('end_min') as HTMLSelectElement

            if (ad.start_date) startDateField.value = ad.start_date.split('T')[0]
            if (ad.end_date) endDateField.value = ad.end_date.split('T')[0]

            if (ad.start_time) {
                const parts = ad.start_time.split(':')
                if (parts.length >= 2) {
                    startHourField.value = parts[0].padStart(2, '0')
                    startMinField.value = parts[1].padStart(2, '0')
                }
            }
            if (ad.end_time) {
                const parts = ad.end_time.split(':')
                if (parts.length >= 2) {
                    endHourField.value = parts[0].padStart(2, '0')
                    endMinField.value = parts[1].padStart(2, '0')
                }
            }
        }
        adFormRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)

    const handleDeleteAd = (id: number) => {
        setDeleteId(id)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (deleteId === null) return

        const result = await deleteAd(deleteId)
        if (result.success) {
            setAds(ads.filter(a => a.id !== deleteId))
            notify('Campaign deleted successfully')
        } else {
            notify('Failed to delete campaign', 'error')
        }
        setShowDeleteModal(false)
        setDeleteId(null)
    }

    if (!mounted || loading || !settings) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 pb-20 relative autofill:bg-transparent">
            {/* Image Cropper Modal */}
            {croppingImage && (
                <ImageCropper
                    imageSrc={croppingImage}
                    aspectRatio={croppingTarget === 'ad' ? 16 / 9 : 16 / 9}
                    onCancel={() => {
                        setCroppingImage(null)
                        setCroppingTarget(null)
                    }}
                    onCropComplete={handleCropSave}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-6 animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-4 bg-red-50 rounded-full border border-red-100 shadow-inner">
                                <Trash2 className="w-8 h-8 text-red-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-gray-900">Delete Campaign?</h3>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                    Are you sure you want to remove this ad? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Duplicate Date Modal */}
            {showDuplicateModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 duration-300">
                        {/* Icon */}
                        <div className="flex justify-center">
                            <div className="p-4 bg-red-100 rounded-full">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                        </div>

                        {/* Title */}
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-gray-900">Campaign Date Conflict</h2>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                This date range overlaps with existing campaigns. Please select a different date to ensure proper ad scheduling.
                            </p>
                        </div>

                        {/* Conflicting Ads List */}
                        <div className="bg-red-50 rounded-lg p-4 border border-red-200 space-y-2 max-h-48 overflow-y-auto">
                            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Conflicting Campaigns:</p>
                            {duplicateDates.map((date, index) => (
                                <div key={index} className="flex items-start gap-2 text-sm text-red-700">
                                    <span className="text-red-500 mt-0.5">•</span>
                                    <span className="font-medium">{date}</span>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-center">
                            <button
                                onClick={() => {
                                    setShowDuplicateModal(false)
                                    setPendingAd(null)
                                }}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
                            >
                                Understand
                            </button>
                        </div>

                        {/* Hint */}
                        <p className="text-xs text-gray-500 text-center leading-relaxed">
                            💡 Tip: Multiple campaigns can run simultaneously on different dates. You can also create carousel ads!
                        </p>
                    </div>
                </div>
            )}

            {/* Animated Toast Notification */}
            <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${showNotification ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'}`}>
                <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border backdrop-blur-md ${notification?.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' :
                    notification?.type === 'info' ? 'bg-blue-50/90 border-blue-200 text-blue-800' :
                        'bg-green-50/90 border-green-200 text-green-800'
                    }`}>
                    <div className={`p-2 rounded-xl ${notification?.type === 'error' ? 'bg-red-500' :
                        notification?.type === 'info' ? 'bg-blue-500' :
                            'bg-green-500'
                        }`}>
                        {notification?.type === 'error' ? <X className="w-5 h-5 text-white" /> : <CheckCircle className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                        <p className="font-bold text-sm tracking-tight">{notification?.message}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto space-y-8">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-indigo-600/10 via-blue-600/5 to-purple-600/10 flex justify-between items-center backdrop-blur-sm">
                        <div className="flex items-center gap-6">
                            <div className="p-3 bg-white rounded-2xl shadow-lg border border-gray-100">
                                <Monitor className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight">WiFi Portal Admin</h1>
                                <p className="text-gray-500 font-medium text-sm">Manage your hotspot landing page and advertisements</p>
                            </div>
                        </div>
                        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                            <div className="text-sm font-bold text-blue-700 uppercase tracking-wider whitespace-nowrap">
                                {mounted ? `${currentTime} WITA` : '--:--'}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* Appearance Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 pb-3 border-b-2 border-indigo-50">
                                <div className="p-2 bg-indigo-500 rounded-xl shadow-md shadow-indigo-100">
                                    <ImageIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 leading-none">Look & Feel</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Portal Brand identity</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="block text-sm font-semibold text-gray-700">Background Image</label>
                                    <div
                                        className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 group hover:border-blue-500 transition-all cursor-pointer shadow-inner"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {previewImage ? (
                                            <img src={previewImage} alt="Background" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                                <Upload className="w-8 h-8 mb-2" />
                                                <span className="font-medium">Click to upload</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, false)} accept="image/*" className="hidden" />
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Background Color</label>
                                        <input
                                            type="color"
                                            name="background_color"
                                            defaultValue={settings.background_color}
                                            className="h-12 w-full rounded-xl cursor-pointer border-2 border-gray-100"
                                        />
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                            The color will be used if the image fails to load or as a gradient fallback.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Login Methods Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-purple-600 border-b pb-2">
                                <Monitor className="w-5 h-5" />
                                <h2 className="text-lg font-bold">Login Methods</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white p-2.5 rounded-xl shadow-sm">
                                                    <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">Google Login</p>
                                                    <p className="text-xs text-gray-500 font-medium">Enable OAuth with Google</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" name="google_login_enabled" defaultChecked={settings.google_login_enabled === 'true'} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 pt-2 border-t border-blue-100/50">
                                            <div>
                                                <label className="block text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Google Client ID</label>
                                                <input type="text" name="google_client_id" defaultValue={settings.google_client_id} className="w-full px-4 py-2 text-xs border border-blue-100 rounded-lg bg-white/50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-gray-700" placeholder="000000000000-xxxxxxxx.apps.googleusercontent.com" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Client Secret</label>
                                                <input type="password" name="google_client_secret" defaultValue={settings.google_client_secret} className="w-full px-4 py-2 text-xs border border-blue-100 rounded-lg bg-white/50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-gray-700" placeholder="••••••••••••••••" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white p-2.5 rounded-xl shadow-sm">
                                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">Facebook Login</p>
                                                    <p className="text-xs text-gray-500 font-medium">Enable OAuth with Facebook</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" name="facebook_login_enabled" defaultChecked={settings.facebook_login_enabled === 'true'} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 pt-2 border-t border-indigo-100/50">
                                            <div>
                                                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1">Facebook App ID</label>
                                                <input type="text" name="facebook_app_id" defaultValue={settings.facebook_app_id} className="w-full px-4 py-2 text-xs border border-indigo-100 rounded-lg bg-white/50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-700" placeholder="0000000000000000" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1">App Secret</label>
                                                <input type="password" name="facebook_app_secret" defaultValue={settings.facebook_app_secret} className="w-full px-4 py-2 text-xs border border-indigo-100 rounded-lg bg-white/50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-700" placeholder="••••••••••••••••" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Content Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-gray-900 border-b pb-2">
                                <Plus className="w-5 h-5 text-gray-400" />
                                <h2 className="text-lg font-bold">General Content</h2>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Page Title</label>
                                    <input
                                        type="text"
                                        name="page_title"
                                        defaultValue={settings.page_title}
                                        className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-800 transition-all bg-gray-50/50 hover:bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Button Text</label>
                                    <input
                                        type="text"
                                        name="button_text"
                                        defaultValue={settings.button_text}
                                        className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-800 transition-all bg-gray-50/50 hover:bg-gray-50"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-6 border-t font-medium">
                            <button
                                type="button"
                                className="px-6 py-2.5 text-blue-600 font-bold hover:bg-blue-50 rounded-xl transition-all flex items-center gap-2"
                                onClick={() => window.open('/login', '_blank')}
                            >
                                Preview Portal
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-10 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Save Portal Changes
                            </button>
                        </div>
                    </form>
                </div>

                {/* Ads Scheduler Section */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-amber-100/50">
                    <div className="p-8 border-b border-amber-50 bg-gradient-to-r from-amber-500/5 to-orange-500/5 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Ads Scheduler</h2>
                            <p className="text-gray-500 font-medium">Schedule display banners for your hotspot portal</p>
                        </div>
                        <Calendar className="w-8 h-8 text-amber-500/30" />
                    </div>

                    <div className="p-8 space-y-10">
                        {/* New Ad Form */}
                        <form ref={adFormRef} onSubmit={handleFormSubmit} className="bg-amber-50/30 p-8 rounded-2xl border border-amber-100 shadow-sm space-y-6">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                                {editingAd ? <Pencil className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-amber-600" />}
                                {editingAd ? 'Update Campaign' : 'New Campaign'}
                            </h3>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Campaign Title</label>
                                        <input type="text" name="ad_title" required value={adTitle} onChange={(e) => setAdTitle(e.target.value)} className="w-full px-4 py-2.5 border-2 border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white text-gray-900 placeholder-gray-400" placeholder="e.g. Free Coffee Morning" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                                        <textarea name="ad_desc" required value={adDesc} onChange={(e) => setAdDesc(e.target.value)} rows={3} className="w-full px-4 py-2.5 border-2 border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-none text-gray-900 placeholder-gray-400" placeholder="Details about this promotion..."></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Schedule Dates</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Start Date</p>
                                                <input type="date" name="start_date" className="w-full px-3 py-2 border border-amber-100 rounded-lg text-sm bg-white text-gray-900" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">End Date</p>
                                                <input type="date" name="end_date" className="w-full px-3 py-2 border border-amber-100 rounded-lg text-sm bg-white text-gray-900" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Active Hours</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase font-bold text-gray-400 ml-1">Start Time</p>
                                                <div className="flex gap-1">
                                                    <select name="start_hour" className="w-full px-2 py-2 border border-amber-100 rounded-lg text-sm bg-white text-gray-900 border-2">
                                                        {Array.from({ length: 24 }).map((_, i) => (
                                                            <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                                        ))}
                                                    </select>
                                                    <span className="flex items-center text-gray-400">:</span>
                                                    <select name="start_min" className="w-full px-2 py-2 border border-amber-100 rounded-lg text-sm bg-white text-gray-900 border-2">
                                                        {Array.from({ length: 60 }).map((_, i) => (
                                                            <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase font-bold text-gray-400 ml-1">End Time</p>
                                                <div className="flex gap-1">
                                                    <select name="end_hour" className="w-full px-2 py-2 border border-amber-100 rounded-lg text-sm bg-white text-gray-900 border-2" defaultValue="23">
                                                        {Array.from({ length: 24 }).map((_, i) => (
                                                            <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                                        ))}
                                                    </select>
                                                    <span className="flex items-center text-gray-400">:</span>
                                                    <select name="end_min" className="w-full px-2 py-2 border border-amber-100 rounded-lg text-sm bg-white text-gray-900 border-2" defaultValue="59">
                                                        {Array.from({ length: 60 }).map((_, i) => (
                                                            <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-sm font-semibold text-gray-700">Campaign Image</label>
                                    <div
                                        className="relative aspect-video rounded-xl overflow-hidden bg-white border-2 border-dashed border-amber-200 group hover:border-amber-500 transition-all cursor-pointer shadow-sm"
                                        onClick={() => adFileInputRef.current?.click()}
                                    >
                                        {adImageUrl ? (
                                            <img src={adImageUrl} alt="Ad Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-amber-500/50 group-hover:text-amber-600 transition-colors">
                                                <Upload className="w-8 h-8 mb-2" />
                                                <span className="font-bold text-sm">Upload Banner</span>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" ref={adFileInputRef} onChange={(e) => handleFileChange(e, true)} accept="image/*" className="hidden" />
                                    <div className="flex gap-3 mt-4">
                                        {editingAd && (
                                            <button type="button" onClick={resetAdForm} className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                                                <X className="w-5 h-5" /> Cancel
                                            </button>
                                        )}
                                        <button type="submit" className={`${editingAd ? 'bg-blue-600 flex-1' : 'bg-amber-600 w-full'} text-white py-3.5 font-bold rounded-xl hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2`}>
                                            {editingAd ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                            {editingAd ? 'Save Changes' : 'Create Campaign'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* List of Ads */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                                <Monitor className="w-4 h-4 text-gray-400" /> Active & Scheduled Campaigns
                            </h3>
                            {ads.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                    <p className="text-gray-400 font-medium">No campaign scheduled yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {ads.map(ad => (
                                        <div key={ad.id} className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden group hover:border-blue-500 transition-all shadow-sm">
                                            <div className="relative aspect-video">
                                                <img src={getFullImageUrl(ad.image)} alt={ad.title} className="w-full h-full object-cover" />
                                                <div className="absolute top-3 left-3 flex gap-2">
                                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${ad.is_active ? 'bg-green-500' : 'bg-gray-400'} text-white uppercase shadow-lg`}>
                                                        {ad.is_active ? 'Active' : 'Paused'}
                                                    </span>
                                                </div>
                                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditAd(ad)} className="p-2 bg-white/90 hover:bg-blue-500 hover:text-white text-gray-600 rounded-lg shadow-lg backdrop-blur-sm transition-all hover:scale-110">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteAd(ad.id!)} className="p-2 bg-white/90 hover:bg-red-500 hover:text-white text-gray-600 rounded-lg shadow-lg backdrop-blur-sm transition-all hover:scale-110">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-5 space-y-3">
                                                <h4 className="font-bold text-gray-900 leading-tight line-clamp-1">{ad.title}</h4>
                                                <p className="text-xs text-gray-500 line-clamp-2 font-medium">{ad.description}</p>
                                                <div className="flex flex-wrap gap-y-2 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-t border-gray-50 pt-3">
                                                    <div className="flex items-center gap-1.5 mr-4">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>{formatDate(ad.start_date)} → {formatDate(ad.end_date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>{formatTime(ad.start_time)} - {formatTime(ad.end_time)} WITA</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Collected Emails Section */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100/50">
                    <div className="p-8 border-b border-blue-50 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Collected Emails</h2>
                            <p className="text-gray-500 font-medium">View and manage user emails collected from the landing page</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={async () => {
                                    const data = await getEmails();
                                    setEmails(data);
                                    notify('Email list refreshed');
                                }}
                                className="p-2 bg-white hover:bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm transition-all flex items-center gap-2 text-xs font-bold"
                            >
                                <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <AlertCircle className="w-8 h-8 text-blue-500/30" />
                        </div>
                    </div>

                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Date Collected</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Email Address</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Source</th>
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
                                                        'bg-gray-50 text-gray-600 border-gray-200'
                                                    }`}>
                                                    {item.source}
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
