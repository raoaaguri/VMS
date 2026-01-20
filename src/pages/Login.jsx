import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import { logger } from '../utils/logger';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const sessionId = Math.random().toString(36).substring(7);

    logger.info(`[${sessionId}] 📝 Login Form Submitted`, {
      email,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });

    try {
      logger.debug(`[${sessionId}] Validating form inputs`, {
        emailProvided: !!email,
        passwordProvided: !!password,
        emailFormat: email ? (email.includes('@') ? 'valid' : 'invalid') : 'empty'
      });

      const user = await login(email, password);

      logger.info(`[${sessionId}] ✅ Login Successful - Redirecting User`, {
        role: user.role,
        userId: user.id,
        email: user.email
      });

      if (user.role === 'ADMIN') {
        logger.debug(`[${sessionId}] Redirecting to Admin Dashboard`);
        navigate('/admin/dashboard');
      } else if (user.role === 'VENDOR') {
        logger.debug(`[${sessionId}] Redirecting to Vendor Dashboard`);
        navigate('/vendor/dashboard');
      } else {
        logger.warn(`[${sessionId}] ⚠️  Unknown User Role - Cannot Redirect`, {
          role: user.role,
          availableRoles: ['ADMIN', 'VENDOR']
        });
        setError('Unknown user role. Please contact support.');
      }
    } catch (err) {
      const errorMessage = err.message || 'Login failed. Please check your credentials.';

      logger.error(
        `[${sessionId}] ❌ Login Failed - Error Occurred`,
        err,
        {
          email,
          errorMessage,
          errorType: err.name,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      );

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className=" p-3 rounded-xl mb-4">
              <img src="https://ditos.technoboost.in/images/bag.svg" alt="Logo" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Welcome Back
            </h2>
            <p className="text-gray-500 text-center mt-2">
              Sign in to access your account
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600">
              New vendor?{' '}
              <button
                onClick={() => navigate('/vendor-signup')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Register here
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Vendor Management System v1.0
        </p>
      </div>
    </div>
  );
}
