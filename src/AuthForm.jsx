// AuthForm.js
import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from './firebase';
import { User, Lock, Mail, Eye, EyeOff, School, Loader, Check, AlertCircle } from 'lucide-react';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authData, setAuthData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    school: '',
    role: 'teacher'
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [firebaseError, setFirebaseError] = useState('');

  const auth = getAuth(app);

  const validateForm = () => {
    const newErrors = {};
    
    if (!authData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(authData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!authData.password) {
      newErrors.password = 'Password is required';
    } else if (authData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!isLogin) {
      if (!authData.name) {
        newErrors.name = 'Name is required';
      }
      if (!authData.school) {
        newErrors.school = 'School name is required';
      }
      if (!authData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (authData.password !== authData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFirebaseError = (error) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please contact support.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/user-not-found':
        return 'No account found with this email. Please sign up first.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFirebaseError('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isLogin) {
        // Firebase login
        await signInWithEmailAndPassword(auth, authData.email, authData.password);
        // The onAuthStateChanged in StudentManagementSystem will handle the redirect
      } else {
        // Firebase signup
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          authData.email, 
          authData.password
        );
        
        // Store additional user info in localStorage (you can later move this to Firestore)
        const user = {
          uid: userCredential.user.uid,
          name: authData.name,
          email: authData.email,
          school: authData.school,
          role: authData.role,
          createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('userProfile', JSON.stringify(user));
        setSuccessMessage('Account created successfully! You will be redirected shortly...');
        
        // The onAuthStateChanged will handle the redirect automatically
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = handleFirebaseError(error);
      setFirebaseError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAuthData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear firebase error when user starts typing
    if (firebaseError) {
      setFirebaseError('');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setAuthData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      school: '',
      role: 'teacher'
    });
    setErrors({});
    setFirebaseError('');
    setSuccessMessage('');
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setFirebaseError('');
    
    try {
      // Try to sign in with demo account
      await signInWithEmailAndPassword(
        auth, 
        'demo@trackclass.com', 
        'demopass123'
      );
      // The onAuthStateChanged will handle the redirect
    } catch (error) {
      // If demo account doesn't exist, guide user to sign up
      if (error.code === 'auth/user-not-found') {
        setFirebaseError('Demo account not found. Please use the demo credentials below to sign up first.');
        
        // Pre-fill the form with demo data
        setAuthData({
          name: 'Demo Teacher',
          email: 'demo@trackclass.com',
          password: 'demopass123',
          confirmPassword: 'demopass123',
          school: 'Demo High School',
          role: 'teacher'
        });
        
        // Switch to signup mode
        setIsLogin(false);
      } else {
        setFirebaseError(handleFirebaseError(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3E8D3] to-[#92B775]/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#133215] rounded-full mb-4">
            <School className="w-8 h-8 text-[#F3E8D3]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#133215] mb-2">Track Class</h1>
          <p className="text-gray-600">
            {isLogin ? 'Welcome back! Please sign in to continue.' : 'Create your account to get started'}
          </p>
        </div>

        <div className="bg-[#F3E8D3] rounded-2xl shadow-xl p-6 md:p-8 animate-slideInUp">
          {successMessage && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-fadeIn">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-700 text-sm">{successMessage}</p>
            </div>
          )}

          {firebaseError && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 text-sm">{firebaseError}</p>
              </div>
            </div>
          )}

          {isLogin && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-fadeIn">
              <p className="text-blue-700 text-sm text-center">
                <strong>Demo Credentials:</strong> demo@trackclass.com / demopass123
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="animate-fadeIn">
                <label className="block text-gray-700 mb-2 text-sm font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="name"
                    value={authData.name}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${
                      errors.name 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-[#92B775] focus:ring-[#133215]'
                    } bg-white`}
                    placeholder="Enter your full name"
                    disabled={isLoading}
                  />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
            )}

            <div className="animate-fadeIn" style={{ animationDelay: '0.1s' }}>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={authData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${
                    errors.email 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-[#92B775] focus:ring-[#133215]'
                  } bg-white`}
                  placeholder="you@school.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div className="animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={authData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${
                    errors.password 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-[#92B775] focus:ring-[#133215]'
                  } bg-white`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              {!isLogin && (
                <p className="text-gray-500 text-xs mt-1">Password must be at least 6 characters long</p>
              )}
            </div>

            {!isLogin && (
              <>
                <div className="animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={authData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${
                        errors.confirmPassword 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-[#92B775] focus:ring-[#133215]'
                      } bg-white`}
                      placeholder="Confirm your password"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">School Name</label>
                  <div className="relative">
                    <School className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      name="school"
                      value={authData.school}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${
                        errors.school 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-[#92B775] focus:ring-[#133215]'
                      } bg-white`}
                      placeholder="Enter your school name"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.school && <p className="text-red-500 text-xs mt-1">{errors.school}</p>}
                </div>

                <div className="animate-fadeIn" style={{ animationDelay: '0.5s' }}>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">Role</label>
                  <select
                    name="role"
                    value={authData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-[#92B775] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#133215] bg-white transition disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </div>
              </>
            )}

            <div className="pt-4 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#133215] text-[#F3E8D3] py-3 px-4 rounded-lg font-semibold hover:bg-[#133215]/90 transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 animate-fadeIn" style={{ animationDelay: '0.7s' }}>
            <button
              onClick={toggleMode}
              className="w-full text-center text-[#133215] hover:text-[#133215]/80 font-medium transition disabled:opacity-50"
              disabled={isLoading}
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          <div className="mt-6 animate-fadeIn" style={{ animationDelay: '0.8s' }}>
            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full bg-[#92B775] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#92B775]/80 transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                'Try Demo Version'
              )}
            </button>
            <p className="text-gray-500 text-xs text-center mt-2">
              Experience the system with demo data
            </p>
          </div>

          <div className="mt-8 text-center animate-fadeIn" style={{ animationDelay: '0.9s' }}>
            <p className="text-gray-500 text-xs">
              By {isLogin ? 'signing in' : 'signing up'}, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-slideInUp {
          animation: slideInUp 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}