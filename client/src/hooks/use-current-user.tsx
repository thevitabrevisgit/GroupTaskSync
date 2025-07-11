import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  name: string;
  avatar?: string;
  isAdmin: boolean;
}

interface CurrentUserContextType {
  currentUser: User | null;
  currentUserId: number | null;
  setCurrentUser: (userId: number) => void;
  logout: () => void;
}

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem("currentUserId");
    return stored ? parseInt(stored) : null;
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/users", currentUserId],
    enabled: !!currentUserId,
  });

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem("currentUserId", currentUserId.toString());
    } else {
      localStorage.removeItem("currentUserId");
    }
  }, [currentUserId]);

  const setCurrentUser = (userId: number) => {
    setCurrentUserId(userId);
  };

  const logout = () => {
    setCurrentUserId(null);
  };

  return (
    <CurrentUserContext.Provider value={{ 
      currentUser: currentUser || null, 
      currentUserId, 
      setCurrentUser, 
      logout 
    }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (context === undefined) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return context;
}

// Wrap the App with CurrentUserProvider
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function AppWithProviders({ children }: { children: ReactNode }) {
  return (
    <CurrentUserProvider>
      {children}
    </CurrentUserProvider>
  );
}
