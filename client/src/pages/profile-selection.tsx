import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import AdminPinModal from "@/components/admin-pin-modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getUserColor } from "@/lib/utils";

export default function ProfileSelection() {
  const [, setLocation] = useLocation();
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showManageProfiles, setShowManageProfiles] = useState(false);
  const { setCurrentUser } = useCurrentUser();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const handleProfileSelect = (userId: number, isAdmin: boolean) => {
    // No PIN required - everyone has same access
    setCurrentUser(userId);
    setLocation("/feed");
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
                <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold ${getUserColor(user.username).bg} ${getUserColor(user.username).text} ${getUserColor(user.username).border} border-4`}>
                  {user.name.charAt(0)}
                </div>
                <h3 className="text-white font-semibold text-lg">{user.name}</h3>
                <p className={`text-sm font-medium ${user.isAdmin ? 'text-accent' : 'text-gray-400'}`}>
                  {user.isAdmin ? 'Parent' : 'Member'}
                </p>
                {user.isAdmin && (
                  <Crown className="text-accent absolute top-2 right-2 w-5 h-5" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Button 
            variant="ghost" 
            className="text-gray-400 hover:text-white transition-colors duration-200 text-lg"
            onClick={() => setShowManageProfiles(true)}
          >
            <Crown className="mr-2 w-5 h-5" />
            Manage Profiles
          </Button>
        </div>

        {/* Manage Profiles Modal */}
        {showManageProfiles && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Manage Profiles</h2>
              <p className="text-gray-600 mb-4">
                Profile management features will be available in a future update. Currently, all 6 team member profiles are pre-configured.
              </p>
              <div className="flex justify-end">
                <Button 
                  variant="outline"
                  onClick={() => setShowManageProfiles(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin PIN Modal no longer needed since everyone has same access */}
    </div>
  );
}
