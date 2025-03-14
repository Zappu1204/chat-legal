import { useState, FormEvent, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDownload,
    faSpinner,
    faExclamationTriangle,
    faCheckCircle,
    faTrash,
    faSync
} from '@fortawesome/free-solid-svg-icons';
import modelApiService from '../services/modelApiService';
import { AIModel } from '../components/chat/ModelSelector';

type StatusType = 'idle' | 'loading' | 'success' | 'error';
type OperationType = 'pull' | 'delete' | 'list';

interface StatusMessage {
    type: StatusType;
    message: string;
    operation: OperationType;
}

const SettingsPage = () => {
    // Model pull form state
    const [modelName, setModelName] = useState('');
    const [insecure, setInsecure] = useState(false);

    // Models list state
    const [models, setModels] = useState<AIModel[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Status messages for operations
    const [status, setStatus] = useState<StatusMessage>({
        type: 'idle',
        message: '',
        operation: 'list'
    });

    // Confirmation modal state
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [modelToDelete, setModelToDelete] = useState<string | null>(null);

    // Load models on component mount
    useEffect(() => {
        fetchModels();
    }, []);

    // Fetch all available models
    const fetchModels = async () => {
        setIsLoadingModels(true);
        setStatus({
            type: 'loading',
            message: 'Đang tải danh sách model...',
            operation: 'list'
        });

        try {
            const modelsList = await modelApiService.listModels();
            setModels(modelsList);
            setStatus({
                type: 'success',
                message: 'Tải danh sách model thành công',
                operation: 'list'
            });
        } catch (error) {
            console.error('Lỗi khi tải danh sách model:', error);
            setStatus({
                type: 'error',
                message: 'Không thể tải danh sách model. Vui lòng thử lại sau.',
                operation: 'list'
            });
        } finally {
            setIsLoadingModels(false);
        }
    };

    // Handle model pull form submission
    const handlePullModel = async (e: FormEvent) => {
        e.preventDefault();

        if (!modelName.trim()) {
            setStatus({
                type: 'error',
                message: 'Vui lòng nhập tên model',
                operation: 'pull'
            });
            return;
        }

        setStatus({
            type: 'loading',
            message: 'Đang tải model về. Đợi chút nhé, nhanh hay chậm tùy thuộc vào kích thước model...',
            operation: 'pull'
        });

        try {
            const response = await modelApiService.pullModel(modelName, insecure);

            if (response.status && !response.status.toLowerCase().includes('error')) {
                setStatus({
                    type: 'success',
                    message: `Thành công! Model ${modelName} đã được tải về.`,
                    operation: 'pull'
                });
                // Clear form after successful pull
                setModelName('');
                // Refresh models list
                fetchModels();
            } else {
                setStatus({
                    type: 'error',
                    message: response.status || 'Có lỗi xảy ra khi tải model',
                    operation: 'pull'
                });
            }
        } catch (error) {
            console.error('Lỗi khi tải model:', error);
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải model',
                operation: 'pull'
            });
        }
    };

    // Open confirmation dialog before deleting model
    const confirmDelete = (modelName: string) => {
        setModelToDelete(modelName);
        setShowConfirmation(true);
    };

    // Handle model deletion
    const handleDeleteModel = async () => {
        if (!modelToDelete) return;

        setStatus({
            type: 'loading',
            message: `Đang xóa model ${modelToDelete}...`,
            operation: 'delete'
        });

        try {
            await modelApiService.deleteModel(modelToDelete);
            setStatus({
                type: 'success',
                message: `Model ${modelToDelete} đã được xóa thành công!`,
                operation: 'delete'
            });
            // Refresh models list
            fetchModels();
        } catch (error) {
            console.error('Lỗi khi xóa model:', error);
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi xóa model',
                operation: 'delete'
            });
        } finally {
            // Close the confirmation modal
            setShowConfirmation(false);
            setModelToDelete(null);
        }
    };

    // Format date for display
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8">Cài đặt</h1>

            {/* Model Management Section */}
            <div className="bg-white shadow rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold mb-4">Quản lý Model AI</h2>

                {/* Pull New Model Form */}
                <div className="mb-8">
                    <h3 className="text-lg font-medium mb-3">Tải Model Mới</h3>
                    <p className="text-gray-600 mb-4">
                        Điền tên model bạn muốn tải về. Ví dụ: <code>llama3:8b</code> hoặc <code>gemma:1b</code>
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
                                    placeholder="ví dụ: llama3:8b"
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
                                    Cho phép kết nối không an toàn (dùng khi tải từ mirror không chính thức)
                                </label>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={status.operation === 'pull' && status.type === 'loading' || !modelName.trim()}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                            >
                                {status.operation === 'pull' && status.type === 'loading' ? (
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

                    {/* Pull model status message */}
                    {status.operation === 'pull' && status.type !== 'idle' && (
                        <div className={`mt-4 p-4 rounded-md ${status.type === 'loading' ? 'bg-blue-50 text-blue-700' :
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
                </div>

                {/* Models List */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">Model Đã Tải</h3>
                        <button
                            onClick={fetchModels}
                            disabled={isLoadingModels}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <FontAwesomeIcon icon={faSync} className={`mr-2 ${isLoadingModels ? 'animate-spin' : ''}`} />
                            Làm mới
                        </button>
                    </div>

                    {isLoadingModels ? (
                        <div className="flex justify-center items-center p-8">
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500 text-xl" />
                            <span className="ml-2">Đang tải danh sách model...</span>
                        </div>
                    ) : models.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <p className="text-gray-600">Chưa có model nào được tải về</p>
                            <p className="text-sm text-gray-500 mt-2">Sử dụng form bên trên để tải model mới</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto mt-2">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tên Model
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Kích Thước
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Cập Nhật Lần Cuối
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Thao Tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {models.map((model) => (
                                        <tr key={model.name} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{model.displayName}</div>
                                                <div className="text-xs text-gray-500">{model.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{model.size || 'Không xác định'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{formatDate(model.modified)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => confirmDelete(model.name)}
                                                    className="text-red-600 hover:text-red-900 focus:outline-none focus:underline"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} className="mr-1" />
                                                    Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Delete operation status message */}
                    {status.operation === 'delete' && status.type !== 'idle' && status.type !== 'loading' && (
                        <div className={`mt-4 p-4 rounded-md ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon={
                                        status.type === 'success' ? faCheckCircle : faExclamationTriangle
                                    } />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium">{status.message}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Xác nhận xóa model</h3>
                        <p className="text-gray-700 mb-6">
                            Bạn có chắc chắn muốn xóa model <span className="font-semibold">{modelToDelete}</span>? Thao tác này không thể phục hồi.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDeleteModel}
                                className="px-4 py-2 border border-transparent rounded-md bg-red-600 text-white hover:bg-red-700"
                            >
                                {status.operation === 'delete' && status.type === 'loading' ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                                        Đang xóa...
                                    </>
                                ) : "Xóa model"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
