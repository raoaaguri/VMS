import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, LogOut, User } from 'lucide-react';

export function SessionStatus() {
  const { user, logout } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!user) return;

    const updateSessionTime = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setTimeRemaining('No session');
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        const timeLeft = payload.exp - currentTime;

        if (timeLeft <= 0) {
          setTimeRemaining('Expired');
          return;
        }

        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);

        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining(`${minutes}m`);
        }
      } catch (error) {
        setTimeRemaining('Invalid token');
      }
    };

    updateSessionTime();
    const interval = setInterval(updateSessionTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const sessionTimeout = user.role === 'ADMIN' ? '12 hours' : '24 hours';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <User className="w-4 h-4" />
        <span>{user.name}</span>
      </button>

      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Session Information</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">User:</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Role:</span>
                <span className="font-medium">{user.role}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Session Timeout:</span>
                <span className="font-medium">{sessionTimeout}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Time Remaining:</span>
                <span className="font-medium">{timeRemaining}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <button
                onClick={() => {
                  logout();
                  setShowDetails(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
