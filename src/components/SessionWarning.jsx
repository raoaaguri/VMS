import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function SessionWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const { logout } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const checkSessionWarning = () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        const timeLeft = payload.exp - currentTime;

        // Show warning when less than 30 minutes remaining
        if (timeLeft > 0 && timeLeft < 1800) { // 30 minutes in seconds
          const minutes = Math.floor(timeLeft / 60);
          setTimeRemaining(`${minutes} minutes`);
          setShowWarning(true);
        } else if (timeLeft <= 0) {
          setShowWarning(false);
          logout();
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    // Check every minute
    const interval = setInterval(checkSessionWarning, 60000);
    checkSessionWarning(); // Check immediately

    return () => clearInterval(interval);
  }, [logout]);

  if (!showWarning) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-amber-800">
              Session Expiring Soon
            </h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>Your session will expire in {timeRemaining}. Please save your work and login again to continue.</p>
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="bg-amber-100 text-amber-800 px-3 py-1 rounded text-sm font-medium hover:bg-amber-200 transition-colors"
              >
                Extend Session
              </button>
              <button
                onClick={() => setShowWarning(false)}
                className="text-amber-600 px-3 py-1 rounded text-sm font-medium hover:bg-amber-100 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => setShowWarning(false)}
              className="text-amber-400 hover:text-amber-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
