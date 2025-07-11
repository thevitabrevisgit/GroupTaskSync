import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import AdminPinModal from "@/components/admin-pin-modal";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function ProfileSelection() {
  const [, setLocation] = useLocation();
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { setCurrentUser } = useCurrentUser();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const handleProfileSelect = (userId: number, isAdmin: boolean) => {
    if (isAdmin) {
      setSelectedUserId(userId);
      setShowPinModal(true);
    } else {
      setCurrentUser(userId);
      setLocation("/feed");
    }
  };

  const handleAdminVerified = () => {
    if (selectedUserId) {
      setCurrentUser(selectedUserId);
      setShowPinModal(false);
      setLocation("/feed");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen profile-selection-bg flex items-center justify-center">
        <div className="text-white text-lg">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen profile-selection-bg flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <h1 className="text-4xl md:text-6xl font-bold text-white text-center mb-4">
          Who's using TaskShare?
        </h1>
        <p className="text-gray-300 text-center mb-12 text-lg">
          Select your profile to continue
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          {users.map((user: any) => (
            <div
              key={user.id}
              className="cursor-pointer group"
              onClick={() => handleProfileSelect(user.id, user.isAdmin)}
            >
              <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition-all duration-300 group-hover:scale-105 relative">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                  alt={`${user.name}'s avatar`}
                  className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-transparent group-hover:border-primary"
                />
                <h3 className="text-white font-semibold text-lg">{user.name}</h3>
                <p className={`text-sm font-medium ${user.isAdmin ? 'text-accent' : 'text-gray-400'}`}>
                  {user.isAdmin ? 'Admin' : 'Member'}
                </p>
                {user.isAdmin && (
                  <Crown className="text-accent absolute top-2 right-2 w-5 h-5" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Button variant="ghost" className="text-gray-400 hover:text-white transition-colors duration-200 text-lg">
            <Crown className="mr-2 w-5 h-5" />
            Manage Profiles
          </Button>
        </div>
      </div>

      <AdminPinModal
        open={showPinModal}
        onClose={() => setShowPinModal(false)}
        onVerified={handleAdminVerified}
      />
    </div>
  );
}
