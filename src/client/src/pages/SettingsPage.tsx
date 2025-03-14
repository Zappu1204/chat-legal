import { useState, FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faSpinner, faExclamationTriangle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import modelApiService from '../services/modelApiService';

type StatusType = 'idle' | 'loading' | 'success' | 'error';

const SettingsPage = () => {
  const [modelName, setModelName] = useState('');
  const [status, setStatus] = useState<StatusType>('idle');
  const [message, setMessage] = useState('');
  const [insecure, setInsecure] = useState(false);

  const handlePullModel = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!modelName.trim()) {
      setStatus('error');
      setMessage('Vui lòng nhập tên model');
      return;
    }
    
    setStatus('loading');
    setMessage('Tải model về. Đợi chút nhé, nhanh hay chậm tùy thuộc vào kích thước model...');
    
    try {
      const response = await modelApiService.pullModel(modelName, insecure);
      
      if (response.status && !response.status.toLowerCase().includes('error')) {
        setStatus('success');
        setMessage(`Thành công! Model ${modelName} đã được tải về.`);
      } else {
        setStatus('error');
        setMessage(response.status || 'Có lỗi xảy ra khi tải model');
      }
    } catch (error) {
      console.error('Lỗi khi tải model:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải model');
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Cài đặt</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-8">
    <h2 className="text-2xl font-semibold mb-4">Quản lý Model</h2>
        
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-3">Tải Model</h3>
          <p className="text-gray-600 mb-4">
            Điền tên model bạn muốn tải về, ví dụ <code>llama3:8b</code> hoặc <code>gemma:1b</code>.
          </p>
          
          <form onSubmit={handlePullModel} className="space-y-4">
            <div>
              <label htmlFor="modelName" className="block text-sm font-medium text-gray-700">
                Tên model
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="modelName"
                  name="modelName"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  placeholder="e.g., llama3:8b"
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center">
                <input
                  id="insecure"
                  name="insecure"
                  type="checkbox"
                  checked={insecure}
                  onChange={(e) => setInsecure(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="insecure" className="ml-2 block text-sm text-gray-900">
                  Cho phép tải model không an toàn (không kiểm tra chữ ký) - chỉ dùng cho mục đích thử nghiệm
                </label>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={status === 'loading' || !modelName.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {status === 'loading' ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Đang tải...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faDownload} className="-ml-1 mr-2 h-5 w-5" />
                    Tải Model
                  </>
                )}
              </button>
            </div>
          </form>
          
          {status !== 'idle' && (
            <div className={`mt-4 p-4 rounded-md ${
              status === 'loading' ? 'bg-blue-50 text-blue-700' :
              status === 'success' ? 'bg-green-50 text-green-700' :
              'bg-red-50 text-red-700'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <FontAwesomeIcon icon={
                    status === 'loading' ? faSpinner :
                    status === 'success' ? faCheckCircle :
                    faExclamationTriangle
                  } className={status === 'loading' ? 'animate-spin' : ''} />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{message}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
