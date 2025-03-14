import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faEnvelope, faPhone, faExclamationTriangle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { RegisterRequest } from '../../types/auth';

const RegisterSchema = Yup.object().shape({
  username: Yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters'),
  email: Yup.string()
    .required('Email is required')
    .email('Invalid email format'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords must match'),
  phoneNumber: Yup.string()
    .matches(/^$|^\+?[0-9]{10,15}$/, 'Phone number is invalid')
});

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleSubmit = async (values: Omit<RegisterRequest, 'roles'> & { confirmPassword: string }, 
                             { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
    try {
      setApiError(null);
      setRegistrationSuccess(false);
      
      // Extract confirmPassword from values to create valid RegisterRequest
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...registerData } = values;
      
      const response = await register(registerData);
      
      if (response.success) {
        setRegistrationSuccess(true);
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setApiError(response.message ?? 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error) {
        setApiError(error.message ?? 'Registration failed');
      } else {
        setApiError('An unexpected error occurred during registration');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-5xl mb-4" />
          <h2 className="text-3xl font-bold text-gray-800">Đăng ký thành công!</h2>
          <p className="text-gray-600 mt-2">Tài khoản của bạn đã được tạo thành công.</p>
          <p className="text-gray-600">Bạn sẽ được chuyển hướng đến trang đăng nhập sau vài giây.</p>
        </div>
        <Link
          to="/login"
          className="block text-center w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Tạo tài khoản mới</h2>
        <p className="text-gray-600 mt-2">Tham gia cùng chúng tớ nào!</p>
      </div>

      <Formik
        initialValues={{ 
          username: '', 
          email: '', 
          password: '', 
          confirmPassword: '',
          phoneNumber: '' 
        }}
        validationSchema={RegisterSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, errors, touched }) => (
          <Form className="space-y-4">
            {apiError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2" />
                  <p className="text-sm text-red-600">{apiError}</p>
                </div>
              </div>
            )}

            {/* Username field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className={`flex items-center border rounded-md px-3 py-2 ${
                errors.username && touched.username ? 'border-red-500' : 'border-gray-300'
              }`}>
                <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2" />
                <Field
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Nhập username của bạn"
                  className="w-full outline-none"
                />
              </div>
              <ErrorMessage name="username" component="p" className="mt-1 text-red-500 text-sm" />
            </div>

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className={`flex items-center border rounded-md px-3 py-2 ${
                errors.email && touched.email ? 'border-red-500' : 'border-gray-300'
              }`}>
                <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 mr-2" />
                <Field
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Nhập email của bạn"
                  className="w-full outline-none"
                />
              </div>
              <ErrorMessage name="email" component="p" className="mt-1 text-red-500 text-sm" />
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <div className={`flex items-center border rounded-md px-3 py-2 ${
                errors.password && touched.password ? 'border-red-500' : 'border-gray-300'
              }`}>
                <FontAwesomeIcon icon={faLock} className="text-gray-400 mr-2" />
                <Field
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Nhập mật khẩu"
                  className="w-full outline-none"
                />
              </div>
              <ErrorMessage name="password" component="p" className="mt-1 text-red-500 text-sm" />
            </div>

            {/* Confirm Password field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
              <div className={`flex items-center border rounded-md px-3 py-2 ${
                errors.confirmPassword && touched.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}>
                <FontAwesomeIcon icon={faLock} className="text-gray-400 mr-2" />
                <Field
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="Xác nhận mật khẩu"
                  className="w-full outline-none"
                />
              </div>
              <ErrorMessage name="confirmPassword" component="p" className="mt-1 text-red-500 text-sm" />
            </div>

            {/* Phone Number field */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại (Tuỳ chọn)</label>
              <div className={`flex items-center border rounded-md px-3 py-2 ${
                errors.phoneNumber && touched.phoneNumber ? 'border-red-500' : 'border-gray-300'
              }`}>
                <FontAwesomeIcon icon={faPhone} className="text-gray-400 mr-2" />
                <Field
                  id="phoneNumber"
                  type="tel"
                  name="phoneNumber"
                  placeholder="Nhập số điện thoại của bạn"
                  className="w-full outline-none"
                />
              </div>
              <ErrorMessage name="phoneNumber" component="p" className="mt-1 text-red-500 text-sm" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors mt-6"
            >
              {isSubmitting ? <LoadingSpinner size="small" /> : 'Đăng ký'}
            </button>

            <div className="text-center mt-6">
              <span className="text-gray-600">Đã có tài khoản rồi? </span>
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Đăng nhập ngay
              </Link>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default RegisterPage;
