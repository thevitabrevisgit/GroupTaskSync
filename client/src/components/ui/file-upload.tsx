import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  capture?: boolean | "user" | "environment";
  children?: React.ReactNode;
  multiple?: boolean;
}

export function FileUpload({ 
  onFileSelect, 
  accept = "image/*", 
  capture = false,
  children,
  multiple = false
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Convert capture prop to the correct attribute value
  const getCaptureValue = () => {
    if (capture === true || capture === "environment") return "environment";
    if (capture === "user") return "user";
    return undefined;
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture={getCaptureValue()}
        onChange={handleFileSelect}
        multiple={multiple}
        className="hidden"
      />
      <div onClick={triggerFileSelect}>
        {children || (
          <Button type="button" variant="outline">
            {capture ? (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </>
            )}
          </Button>
        )}
      </div>
    </>
  );
}
