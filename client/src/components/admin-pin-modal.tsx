import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AdminPinModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export default function AdminPinModal({ open, onClose, onVerified }: AdminPinModalProps) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const verifyPinMutation = useMutation({
    mutationFn: async (pinValue: string) => {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid PIN");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setPin(["", "", "", ""]);
      setError("");
      onVerified();
    },
    onError: (error) => {
      setError("Incorrect PIN. Please try again.");
      setPin(["", "", "", ""]);
      // Focus first input
      setTimeout(() => {
        const firstInput = document.querySelector('.pin-input-0') as HTMLInputElement;
        firstInput?.focus();
      }, 100);
    },
  });

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError("");

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.querySelector(`.pin-input-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }

    // Auto-submit when all digits are entered
    if (newPin.every(digit => digit !== "") && index === 3) {
      handleSubmit(newPin.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      const prevInput = document.querySelector(`.pin-input-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  const handleSubmit = (pinValue?: string) => {
    const currentPin = pinValue || pin.join("");
    if (currentPin.length === 4) {
      verifyPinMutation.mutate(currentPin);
    }
  };

  const handleClose = () => {
    setPin(["", "", "", ""]);
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Admin Access Required
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-gray-600 text-center">
            Enter the admin PIN to continue
          </p>
          
          <div className="space-y-4">
            <div className="flex justify-center space-x-2">
              {pin.map((digit, index) => (
                <Input
                  key={index}
                  type="password"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-12 text-center text-2xl font-bold pin-input-${index}`}
                />
              ))}
            </div>
            
            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit()}
              disabled={pin.some(digit => !digit) || verifyPinMutation.isPending}
              className="flex-1"
            >
              {verifyPinMutation.isPending ? "Verifying..." : "Enter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
