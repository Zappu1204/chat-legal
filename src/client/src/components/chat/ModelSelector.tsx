import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faChevronDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';

interface AIModel {
  name: string;
  displayName: string;
  size?: string;
  modified?: string;
}

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onSelectModel }) => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch available models from the backend
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/api/ollama/models/available');
        if (response.data && Array.isArray(response.data.models)) {
          setModels(response.data.models);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Get display name for the currently selected model
  const getSelectedModelDisplay = () => {
    const found = models.find(m => m.name === selectedModel);
    return found?.displayName || selectedModel;
  };

  return (
    <div className="relative">
      <button
        className="flex items-center space-x-2 bg-white rounded-md px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <FontAwesomeIcon icon={faRobot} className="text-blue-500" />
        <span className="text-sm font-medium">
          {isLoading ? 'Loading models...' : getSelectedModelDisplay()}
        </span>
        {isLoading ? (
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
        ) : (
          <FontAwesomeIcon icon={faChevronDown} className="text-gray-500" />
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute left-0 z-10 mt-1 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1 max-h-60 overflow-y-auto">
            {models.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">No models available</div>
            ) : (
              models.map(model => (
                <div
                  key={model.name}
                  className={`px-4 py-2 text-sm cursor-pointer ${selectedModel === model.name ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}`}
                  onClick={() => {
                    onSelectModel(model.name);
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium">{model.displayName}</div>
                  {model.size && (
                    <div className="text-xs text-gray-500">{model.size}</div>
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
