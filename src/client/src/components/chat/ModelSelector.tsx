import { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faChevronDown, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import modelApiService from '../../services/modelApiService';

// Define strongly-typed interfaces
export interface AIModel {
    name: string;
    displayName: string;
    size?: string;
    modified?: string;
}

interface ModelSelectorProps {
    selectedModel: string;
    onSelectModel: (model: string) => void;
    className?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
    selectedModel,
    onSelectModel,
    className = ''
}) => {
    const [models, setModels] = useState<AIModel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Handle outside clicks to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isOpen &&
                dropdownRef.current &&
                buttonRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Fetch available models with improved error handling
    const fetchModels = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const models = await modelApiService.listModels();
            setModels(models);

            // If current selected model is not available, select first available model
            if (models.length > 0 && !models.some(m => m.name === selectedModel)) {
                onSelectModel(models[0].name);
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            setError('Failed to load AI models');
        } finally {
            setIsLoading(false);
        }
    }, [selectedModel, onSelectModel]);

    // Fetch models on component mount
    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    // Get display name for the currently selected model with fallback
    const getSelectedModelDisplay = useCallback(() => {
        const found = models.find(m => m.name === selectedModel);
        return found?.displayName ?? selectedModel.replace(':', ' ');
    }, [models, selectedModel]);

    // Format model size for display
    const formatModelSize = (size?: string) => {
        if (!size) return null;
        return size.toLowerCase().includes('b') ? size : `${size}B`;
    };

    return (
        <div className={`relative ${className}`}>
            <button type='button'
                ref={buttonRef}
                className="flex items-center space-x-2 bg-white rounded-md px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                aria-label={`Select AI model: ${getSelectedModelDisplay()}`}
            >
                <FontAwesomeIcon
                    icon={error ? faExclamationTriangle : faRobot}
                    className={error ? "text-amber-500" : "text-blue-500"}
                />
                <span className="text-sm font-medium truncate max-w-[120px]">
                    {isLoading ? 'Loading models...' : getSelectedModelDisplay()}
                </span>
                {isLoading ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                    <FontAwesomeIcon icon={faChevronDown} className="text-gray-500" />
                )}
            </button>

            {/* Dropdown menu with improved accessibility */}
            {isOpen && (
                <div ref={dropdownRef} aria-label="Available AI models"
                    className="absolute left-0 z-10 mt-1 w-56 origin-top-left rounded-md bg-white shadow-lg">
                    <div className="py-1 max-h-60 overflow-y-auto">
                        {error ? (
                            <div className="px-4 py-2 text-sm text-red-600">
                                {error}
                                <button type='button' onClick={fetchModels} className="block mt-1 text-blue-600 hover:text-blue-800">
                                    Retry
                                </button>
                            </div>
                        ) : models.length === 0 && !isLoading ? (
                            <div className="px-4 py-2 text-sm text-gray-500">No models available</div>
                        ) : (
                            models.map(model => (
                                <div key={model.name}
                                    className={`px-4 py-2 text-sm cursor-pointer ${selectedModel === model.name
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'hover:bg-gray-100'
                                        }`}
                                    onClick={() => {
                                        onSelectModel(model.name);
                                        setIsOpen(false);
                                    }}
                                    aria-selected={selectedModel === model.name}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onSelectModel(model.name);
                                            setIsOpen(false);
                                        }
                                    }}
                                >
                                    <div className="font-medium">{model.displayName}</div>
                                    {model.size && (
                                        <div className="text-xs text-gray-500">
                                            {formatModelSize(model.size)}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelSelector;
