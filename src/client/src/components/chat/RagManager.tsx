import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faInfoCircle, faDatabase, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { buildRagIndex, getRagStatus } from '../../services/ragService';
import { RAGBuildIndexResponse } from '../../types/chat';

// Định nghĩa interface cho trạng thái vector database
interface VectorDBStatus {
  vectorstore_loaded: boolean;
  document_count: number;
  embedding_model: string;
  index_saved: boolean;
  status: string;
  llm_model: string;
}

const RagManager: React.FC = () => {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<RAGBuildIndexResponse | null>(null);
  const [dbStatus, setDbStatus] = useState<VectorDBStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showStatus, setShowStatus] = useState(false);

  // Lấy trạng thái của vector database khi component mount
  useEffect(() => {
    fetchDbStatus();
  }, []);

  // Lấy trạng thái sau khi build index
  useEffect(() => {
    if (buildResult?.success) {
      fetchDbStatus();
    }
  }, [buildResult]);

  const fetchDbStatus = async () => {
    try {
      const status = await getRagStatus();
      setDbStatus(status);
      setStatusError(null);
    } catch (error) {
      console.error('Lỗi khi lấy trạng thái vector DB:', error);
      setStatusError('Không thể kết nối đến dịch vụ RAG');
    }
  };

  const handleBuildIndex = async () => {
    try {
      setIsBuilding(true);
      setBuildResult(null);
      
      const result = await buildRagIndex();
      setBuildResult(result);
      
      // Hiển thị trạng thái sau khi build
      setShowStatus(true);
    } catch (error) {
      console.error('Lỗi khi xây dựng vector index:', error);
      setBuildResult({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi không xác định',
        build_time_ms: 0,
        document_count: 0
      });
    } finally {
      setIsBuilding(false);
    }
  };

  // Format thời gian xây dựng để hiển thị dễ đọc
  const formatBuildTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)} ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)} giây`;
    return `${(ms / 60000).toFixed(1)} phút`;
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-700 flex items-center">
          <FontAwesomeIcon icon={faDatabase} className="mr-2 text-indigo-600" />
          Quản lý cơ sở dữ liệu luật giao thông
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowStatus(!showStatus)}
            className="p-2 text-sm text-blue-600 hover:text-blue-800"
            title="Hiển thị/ẩn trạng thái"
          >
            <FontAwesomeIcon icon={faInfoCircle} />
          </button>
          
          <button
            type="button"
            onClick={handleBuildIndex}
            disabled={isBuilding}
            className={`px-3 py-2 rounded-md text-sm flex items-center ${
              isBuilding 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <FontAwesomeIcon icon={faSync} className={`mr-2 ${isBuilding ? 'animate-spin' : ''}`} />
            {isBuilding ? 'Đang xây dựng...' : 'Xây dựng Vector DB'}
          </button>
        </div>
      </div>
      
      {/* Hiển thị kết quả xây dựng vector index */}
      {buildResult && (
        <div className={`mt-3 p-3 rounded-md ${
          buildResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start">
            <FontAwesomeIcon 
              icon={buildResult.success ? faCheck : faExclamationTriangle} 
              className={`mt-1 mr-2 ${buildResult.success ? 'text-green-600' : 'text-red-600'}`} 
            />
            <div>
              <p className={buildResult.success ? 'text-green-800' : 'text-red-800'}>
                {buildResult.message}
              </p>
              {buildResult.success && (
                <div className="text-sm text-gray-600 mt-1">
                  <p>Số lượng tài liệu đã chỉ mục: {buildResult.document_count}</p>
                  <p>Thời gian xây dựng: {formatBuildTime(buildResult.build_time_ms)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Hiển thị trạng thái vector database */}
      {showStatus && (
        <div className="mt-3 border border-gray-200 rounded-md p-3 bg-white">
          {statusError ? (
            <div className="text-red-600">{statusError}</div>
          ) : dbStatus ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <span className="font-medium mr-2">Trạng thái:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  dbStatus.vectorstore_loaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {dbStatus.vectorstore_loaded ? 'Đã tải' : 'Chưa tải'}
                </span>
              </div>
              <div>
                <span className="font-medium">Số lượng tài liệu:</span> {dbStatus.document_count}
              </div>
              <div>
                <span className="font-medium">Model embedding:</span> {dbStatus.embedding_model}
              </div>
              <div>
                <span className="font-medium">Model LLM:</span> {dbStatus.llm_model}
              </div>
              <div>
                <span className="font-medium">Đã lưu index:</span> {dbStatus.index_saved ? 'Có' : 'Không'}
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-2">
              <FontAwesomeIcon icon={faSync} spin className="mr-2" />
              <span>Đang tải trạng thái...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RagManager;