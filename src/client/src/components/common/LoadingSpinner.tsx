import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

const LoadingSpinner = ({ size = 'medium', color = 'text-blue-500', className = '' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <FontAwesomeIcon
        icon={faSpinner}
        spin
        className={`${sizeClasses[size]} ${color}`}
      />
    </div>
  );
};

export default LoadingSpinner;
