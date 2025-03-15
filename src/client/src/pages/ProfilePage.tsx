import { useState, useEffect, FormEvent } from 'react';
import userService from '../services/userService';
import { UserProfile, UpdateProfileRequest, ChangePasswordRequest } from '../types/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faSpinner, 
  faExclamationTriangle, 
  faCheckCircle, 
  faEnvelope, 
  faPhone, 
  faLock,
  faSave
} from '@fortawesome/free-solid-svg-icons';
import Logo from '../assets/logo.png';

type TabType = 'general' | 'password';
type StatusType = 'idle' | 'loading' | 'success' | 'error';

interface StatusMessage {
  type: StatusType;
  message: string;
}

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<StatusMessage>({ type: 'idle', message: '' });

  // General profile form state
  const [formData, setFormData] = useState<UpdateProfileRequest>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });

  // Password form state
  const [passwordData, setPasswordData] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Load user profile on component mount
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const data = await userService.getProfile();
        setProfile(data);
        setFormData({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          email: data.email,
          phoneNumber: data.phoneNumber ?? '',
        });
        setAvatarUrl(data.avatarUrl);
      } catch (error) {
        console.error('Failed to load profile:', error);
        setStatus({
          type: 'error',
          message: 'Không thể tải thông tin hồ sơ. Vui lòng thử lại sau.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Handle profile form submission
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Đang cập nhật thông tin hồ sơ...' });

    try {
      const updatedProfile = await userService.updateProfile(formData);
      setProfile(updatedProfile);
      setStatus({
        type: 'success',
        message: 'Cập nhật thông tin hồ sơ thành công!'
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ. Vui lòng thử lại sau.'
      });
    }
  };

  // Handle password form submission
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setStatus({
        type: 'error',
        message: 'Mật khẩu mới và xác nhận mật khẩu không khớp.'
      });
      return;
    }

    setStatus({ type: 'loading', message: 'Đang cập nhật mật khẩu...' });

    try {
      const response = await userService.changePassword(passwordData);
      setStatus({
        type: 'success',
        message: response.message || 'Đổi mật khẩu thành công!'
      });
      // Reset form after successful password change
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Failed to change password:', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Không thể thay đổi mật khẩu. Vui lòng thử lại sau.'
      });
    }
  };

  // Handle avatar upload (placeholder for future implementation)
  const handleAvatarUpload = () => {
    // This would be replaced with actual file upload functionality
    alert('Avatar upload functionality will be implemented soon.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FontAwesomeIcon icon={faSpinner} spin className="text-blue-500 text-4xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Hồ sơ người dùng</h1>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Profile header */}
        <div className="p-6 bg-blue-50 flex items-center">
          <div className="mr-4 flex-shrink-0">
            <img
              src={avatarUrl || Logo}
              alt="User avatar"
              className="w-24 h-24 rounded-full bg-white border-2 border-blue-500 object-cover"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{profile?.displayName}</h2>
            <p className="text-gray-600">@{profile?.username}</p>
            <p className="text-sm text-gray-500">Thành viên từ: {profile?.createdAt 
              ? new Date(profile.createdAt).toLocaleDateString() 
              : 'N/A'}
            </p>
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              className={`py-4 px-6 font-medium ${activeTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
              onClick={() => setActiveTab('general')}
            >
              Thông tin chung
            </button>
            <button
              className={`py-4 px-6 font-medium ${activeTab === 'password' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
              onClick={() => setActiveTab('password')}
            >
              Đổi mật khẩu
            </button>
          </nav>
        </div>

        {/* Status message */}
        {status.type !== 'idle' && (
          <div className={`m-6 p-4 rounded-md ${
            status.type === 'loading' ? 'bg-blue-50 text-blue-700' :
            status.type === 'success' ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <FontAwesomeIcon icon={
                  status.type === 'loading' ? faSpinner :
                  status.type === 'success' ? faCheckCircle :
                  faExclamationTriangle
                } className={status.type === 'loading' ? 'animate-spin' : ''} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{status.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'general' && (
            <form onSubmit={handleProfileSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    Tên
                  </label>
                  <div className="flex items-center border rounded-md px-3 py-2 border-gray-300">
                    <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2" />
                    <input
                      type="text"
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full outline-none"
                      placeholder="Nhập tên của bạn"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Họ
                  </label>
                  <div className="flex items-center border rounded-md px-3 py-2 border-gray-300">
                    <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2" />
                    <input
                      type="text"
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full outline-none"
                      placeholder="Nhập họ của bạn"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="flex items-center border rounded-md px-3 py-2 border-gray-300">
                    <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 mr-2" />
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full outline-none"
                      placeholder="Nhập địa chỉ email của bạn"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <div className="flex items-center border rounded-md px-3 py-2 border-gray-300">
                    <FontAwesomeIcon icon={faPhone} className="text-gray-400 mr-2" />
                    <input
                      type="tel"
                      id="phoneNumber"
                      value={formData.phoneNumber || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="w-full outline-none"
                      placeholder="Nhập số điện thoại của bạn"
                    />
                  </div>
                </div>
              </div>

              {/* Avatar upload section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Ảnh đại diện</h3>
                <div className="flex items-center">
                  <img
                    src={avatarUrl ?? Logo}
                    alt="Avatar preview"
                    className="w-16 h-16 rounded-full mr-4 object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleAvatarUpload}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Tải ảnh mới
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  Lưu thay đổi
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="max-w-md mx-auto">
              <div className="space-y-6">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <div className="flex items-center border rounded-md px-3 py-2 border-gray-300">
                    <FontAwesomeIcon icon={faLock} className="text-gray-400 mr-2" />
                    <input
                      type="password"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full outline-none"
                      placeholder="Nhập mật khẩu hiện tại của bạn"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Mật khẩu mới
                  </label>
                  <div className="flex items-center border rounded-md px-3 py-2 border-gray-300">
                    <FontAwesomeIcon icon={faLock} className="text-gray-400 mr-2" />
                    <input
                      type="password"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full outline-none"
                      placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="flex items-center border rounded-md px-3 py-2 border-gray-300">
                    <FontAwesomeIcon icon={faLock} className="text-gray-400 mr-2" />
                    <input
                      type="password"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full outline-none"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cập nhật mật khẩu
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
