"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, Upload, X, Play } from "lucide-react"

interface MediaPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelectMedia: (mediaUrl: string, mediaType: "image" | "video") => void
  selectedMedia?: { url: string; type: "image" | "video" } | null
}

export function MediaPicker({ isOpen, onClose, onSelectMedia, selectedMedia }: MediaPickerProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })
      setStream(mediaStream)
      setIsCapturing(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("Unable to access camera. Please check permissions.")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsCapturing(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
        onSelectMedia(dataUrl, "image")
        stopCamera()
        onClose()
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        const mediaType = file.type.startsWith("video/") ? "video" : "image"
        onSelectMedia(result, mediaType)
        onClose()
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveMedia = () => {
    onSelectMedia("", "image") // Clear media
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Photo or Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current media preview */}
          {selectedMedia && selectedMedia.url && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Selected media:</div>
                <Button variant="ghost" size="sm" onClick={handleRemoveMedia} className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="relative">
                {selectedMedia.type === "image" ? (
                  <img
                    src={selectedMedia.url || "/placeholder.svg"}
                    alt="Selected media"
                    className="w-full max-h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="relative">
                    <video src={selectedMedia.url} className="w-full max-h-48 object-cover rounded-lg" controls />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Play className="w-12 h-12 text-white bg-black bg-opacity-50 rounded-full p-2" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Camera capture interface */}
          {isCapturing ? (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
                style={{ transform: "scaleX(-1)" }} // Mirror effect
              />
              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex-1">
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Photo
                </Button>
                <Button variant="outline" onClick={stopCamera} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={startCamera} className="flex flex-col items-center gap-2 h-20">
                  <Camera className="w-6 h-6" />
                  <span className="text-sm">Take Photo</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 h-20"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Upload Media</span>
                </Button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Info text */}
              <div className="text-xs text-gray-500 text-center">
                You can upload photos and videos from your camera roll or take a new photo
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
