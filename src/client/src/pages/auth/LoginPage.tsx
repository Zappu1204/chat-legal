import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const LoginSchema = Yup.object().shape({
  username: Yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (values: { username: string; password: string }, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
    try {
      setApiError(null);
      await login(values.username, values.password);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        setApiError(error.message || 'Invalid username or password');
      } else {
        setApiError('An error occurred during login');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
        <p className="text-gray-600 mt-2">Please sign in to your account</p>
      </div>

      <Formik
        initialValues={{ username: '', password: '' }}
        validationSchema={LoginSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, errors, touched }) => (
          <Form className="space-y-6">
            {apiError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2" />
                  <p className="text-sm text-red-600">{apiError}</p>
                </div>
              </div>
            )}

            <div>
              <div className={`flex items-center border rounded-md px-3 py-2 ${
                errors.username && touched.username ? 'border-red-500' : 'border-gray-300'
              }`}>
                <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2" />
                <Field
                  type="text"
                  name="username"
                  placeholder="Username"
                  className="w-full outline-none"
                />
              </div>
              <ErrorMessage name="username" component="p" className="mt-1 text-red-500 text-sm" />
            </div>

            <div>
              <div className={`flex items-center border rounded-md px-3 py-2 ${
                errors.password && touched.password ? 'border-red-500' : 'border-gray-300'
              }`}>
                <FontAwesomeIcon icon={faLock} className="text-gray-400 mr-2" />
                <Field
                  type="password"
                  name="password"
                  placeholder="Password"
                  className="w-full outline-none"
                />
              </div>
              <ErrorMessage name="password" component="p" className="mt-1 text-red-500 text-sm" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {isSubmitting ? <LoadingSpinner size="small" /> : 'Sign In'}
            </button>
            
            <div className="text-center mt-6">
              <span className="text-gray-600">Don't have an account? </span>
              <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign up
              </Link>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default LoginPage;
