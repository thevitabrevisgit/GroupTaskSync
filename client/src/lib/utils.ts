import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// User color coding system
export function getUserColor(username: string): { bg: string; border: string; text: string } {
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    tim: { bg: "bg-gray-200", border: "border-gray-400", text: "text-gray-800" },
    beth: { bg: "bg-purple-200", border: "border-purple-400", text: "text-purple-800" },
    evelyn: { bg: "bg-pink-200", border: "border-pink-400", text: "text-pink-800" },
    gabe: { bg: "bg-green-200", border: "border-green-400", text: "text-green-800" },
    sean: { bg: "bg-blue-200", border: "border-blue-400", text: "text-blue-800" },
    sam: { bg: "bg-red-200", border: "border-red-400", text: "text-red-800" },
  };
  
  return colorMap[username.toLowerCase()] || { bg: "bg-gray-200", border: "border-gray-400", text: "text-gray-800" };
}
