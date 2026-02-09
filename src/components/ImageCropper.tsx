'use client'

import { useState, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { Check, X, ZoomIn } from 'lucide-react'

interface ImageCropperProps {
    imageSrc: string
    aspectRatio?: number
    onCancel: () => void
    onCropComplete: (croppedBlob: Blob) => void
}

export default function ImageCropper({ imageSrc, aspectRatio = 16 / 9, onCancel, onCropComplete }: ImageCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop)
    }

    const onZoomChange = (zoom: number) => {
        setZoom(zoom)
    }

    const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const createCroppedImage = useCallback(async () => {
        try {
            if (!croppedAreaPixels) return

            const image = new Image()
            image.src = imageSrc
            await new Promise((resolve) => {
                image.onload = resolve
            })

            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            if (!ctx) return

            canvas.width = croppedAreaPixels.width
            canvas.height = croppedAreaPixels.height

            ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            )

            canvas.toBlob((blob) => {
                if (!blob) {
                    console.error('Canvas is empty')
                    return
                }
                onCropComplete(blob)
            }, 'image/jpeg')
        } catch (e) {
            console.error(e)
        }
    }, [croppedAreaPixels, imageSrc, onCropComplete])

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[80vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg">Crop Image</h3>
                    <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="relative flex-1 bg-gray-900">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={onZoomChange}
                        objectFit="contain"
                    />
                </div>

                <div className="p-6 bg-white border-t space-y-4">
                    <div className="flex items-center gap-4">
                        <ZoomIn className="w-5 h-5 text-gray-400" />
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            onClick={onCancel}
                            className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={createCroppedImage}
                            className="px-8 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Use Image
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
