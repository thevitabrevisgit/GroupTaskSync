import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image, X } from "lucide-react";

interface MobileCameraProps {
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  imagePreview?: string | null;
  className?: string;
}

export function MobileCamera({ 
  onImageSelect, 
  onImageRemove, 
  imagePreview, 
  className = "" 
}: MobileCameraProps) {
  const [showOptions, setShowOptions] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (file: File) => {
    onImageSelect(file);
    setShowOptions(false);
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  if (imagePreview) {
    return (
      <div className={`relative ${className}`}>
        <img 
          src={imagePreview} 
          alt="Selected" 
          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
        />
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="absolute top-2 right-2"
          onClick={onImageRemove}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (showOptions) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-sm font-medium text-gray-700 mb-2">Add Photo</div>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            type="button" 
            variant="outline" 
            className="w-full h-20 flex-col space-y-1"
            onClick={handleCameraClick}
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs">Camera</span>
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            className="w-full h-20 flex-col space-y-1"
            onClick={handleGalleryClick}
          >
            <Image className="w-6 h-6" />
            <span className="text-xs">Gallery</span>
          </Button>
        </div>
        
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <Button 
          type="button" 
          variant="ghost" 
          size="sm"
          onClick={() => setShowOptions(false)}
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setShowOptions(true)}
      className={`w-full h-32 border-2 border-dashed border-gray-300 hover:border-gray-400 flex-col space-y-2 ${className}`}
    >
      <Camera className="w-8 h-8 text-gray-400" />
      <span className="text-sm text-gray-600">Add Photo</span>
      <span className="text-xs text-gray-500">Tap to choose camera or gallery</span>
    </Button>
  );
}