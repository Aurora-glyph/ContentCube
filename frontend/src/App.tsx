import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  X, 
  RefreshCw,
  Image,
  Video,
  Music,
  Youtube,
  File,
  Camera,
  Mic,
  Monitor,
  Sparkles,
  ArrowRight,
  Play,
  Pause
} from 'lucide-react';

interface MCQ {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  bloom_level: string;
}

interface Flashcard {
  front: string;
  back: string;
}

interface JobResult {
  title: string;
  content_source: string;
  summary: string;
  takeaways: string[];
  mcqs: MCQ[];
  flashcards: Flashcard[];
  localized: {
    [key: string]: {
      summary: string;
      takeaways: string[];
      mcqs: MCQ[];
      flashcards: Flashcard[];
    };
  };
  exports: {
    google_forms_csv: string;
    full_json: string;
  };
  file_hash?: string;
}

interface JobStatus {
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  result?: JobResult;
  error?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-cyan-50 flex items-center justify-center p-4">
          <div className="max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
            <div className="flex items-center text-red-600 mb-6">
              <AlertCircle className="h-6 w-6 mr-3" />
              <span className="text-xl font-semibold">Something went wrong</span>
            </div>
            <p className="text-gray-700 mb-6 leading-relaxed">
              An unexpected error occurred. Please refresh the page and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center transition-all duration-300 transform hover:scale-105"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ContentCube Logo Component
const ContentCubeLogo = ({ size = "h-8 w-8" }: { size?: string }) => (
  <div className={`${size} bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center relative overflow-hidden`}>
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse"></div>
    <div className="relative flex items-center justify-center">
      <span className="text-white font-bold text-lg">C</span>
      <div className="absolute inset-0 border-2 border-white/30 rounded-lg"></div>
    </div>
  </div>
);

// Supported file types with enhanced styling
const SUPPORTED_TYPES = {
  documents: {
    icon: FileText,
    label: 'Documents',
    extensions: ['.pdf', '.docx', '.txt'],
    description: 'Text extraction and analysis',
    gradient: 'from-blue-400 to-cyan-400'
  },
  images: {
    icon: Image,
    label: 'Images',
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'],
    description: 'OCR and visual content analysis',
    gradient: 'from-green-400 to-emerald-400'
  },
  audio: {
    icon: Mic,
    label: 'Audio',
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
    description: 'Speech-to-text transcription',
    gradient: 'from-purple-400 to-violet-400'
  },
  video: {
    icon: Video,
    label: 'Videos',
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
    description: 'Audio transcription + visual analysis',
    gradient: 'from-pink-400 to-rose-400'
  }
};

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.up.railway.app'  // You'll get this after deploying backend
  : 'http://localhost:8000';

// Enhanced Loading Component
const LoadingSpinner = ({ size = "h-8 w-8" }: { size?: string }) => (
  <div className={`${size} relative`}>
    <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
    <div className="absolute inset-0 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
    <div className="absolute inset-2 border-2 border-transparent border-t-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
  </div>
);

function App() {
  const [contentType, setContentType] = useState<'file' | 'youtube'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Interactive features
  const [userAnswers, setUserAnswers] = useState<{[questionIndex: number]: string}>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const getFileTypeInfo = (filename: string) => {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    
    for (const [category, info] of Object.entries(SUPPORTED_TYPES)) {
      if (info.extensions.includes(ext)) {
        return { category, ...info };
      }
    }
    
    return { category: 'unknown', icon: File, label: 'Unknown', extensions: [], description: 'Unsupported', gradient: 'from-gray-400 to-gray-500' };
  };

  const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(?:www\.)?youtube\.com\/embed\/[\w-]+/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setUploadError(null);
      
      const maxSize = 500 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setUploadError('File size exceeds 500MB limit. Please choose a smaller file.');
        return;
      }

      const fileTypeInfo = getFileTypeInfo(selectedFile.name);
      if (fileTypeInfo.category === 'unknown') {
        const supportedExts = Object.values(SUPPORTED_TYPES).flatMap(type => type.extensions);
        setUploadError(`File type not supported. Supported types: ${supportedExts.join(', ')}`);
        return;
      }

      setFile(selectedFile);
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(fileName.replace(/[_-]/g, ' '));
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      const fileTypeInfo = getFileTypeInfo(droppedFile.name);
      if (fileTypeInfo.category !== 'unknown') {
        setFile(droppedFile);
        const fileName = droppedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(fileName.replace(/[_-]/g, ' '));
        setUploadError(null);
      } else {
        setUploadError('File type not supported');
      }
    }
  }, []);

  const handleYouTubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    setUploadError(null);
    
    if (url && validateYouTubeUrl(url)) {
      setTitle('YouTube Video Content');
    }
  };

  const handleAnswerSelect = (questionIndex: number, selectedAnswer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedAnswer
    }));
  
    setAnsweredQuestions(prev => {
      const newSet = new Set(prev);
      newSet.add(questionIndex);
      return newSet;
    });
  };

  const toggleFlip = (cardIndex: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardIndex)) {
        newSet.delete(cardIndex);
      } else {
        newSet.add(cardIndex);
      }
      return newSet;
    });
  };

  const handleLanguageChange = (language: string) => {
    setActiveLanguage(language);
    setUserAnswers({});
    setAnsweredQuestions(new Set());
    setFlippedCards(new Set());
  };

  const startProcessing = async () => {
    if (contentType === 'file' && !file) {
      setUploadError('Please select a file to upload');
      return;
    }
    
    if (contentType === 'youtube') {
      if (!youtubeUrl) {
        setUploadError('Please enter a YouTube URL');
        return;
      }
      if (!validateYouTubeUrl(youtubeUrl)) {
        setUploadError('Please enter a valid YouTube URL');
        return;
      }
    }

    setIsProcessing(true);
    setUploadError(null);

    const formData = new FormData();
    
    if (contentType === 'file' && file) {
      formData.append('file', file);
    }
    
    formData.append('title', title || 'Educational Content');
    formData.append('content_type', contentType);
    
    if (contentType === 'youtube') {
      formData.append('youtube_url', youtubeUrl);
    }

    try {
      const response = await fetch(`${API_BASE}/repurpose`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setJobId(data.job_id);
      pollJobStatus(data.job_id);
    } catch (error) {
      console.error('Error starting job:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to start processing');
      setIsProcessing(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`${API_BASE}/jobs/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.statusText}`);
      }
      
      const status: JobStatus = await response.json();
      setJobStatus(status);

      if (status.status === 'processing') {
        setTimeout(() => pollJobStatus(jobId), 2000);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error polling job status:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to check job status');
      setIsProcessing(false);
    }
  };

  const downloadCSV = () => {
    if (!jobStatus?.result?.exports?.google_forms_csv) return;

    try {
      const blob = new Blob([jobStatus.result.exports.google_forms_csv], {
        type: 'text/csv;charset=utf-8;'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'quiz'}-google-forms.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  const downloadJSON = () => {
    if (!jobStatus?.result?.exports?.full_json) return;

    try {
      const blob = new Blob([jobStatus.result.exports.full_json], {
        type: 'application/json;charset=utf-8;'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'content'}-full-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading JSON:', error);
    }
  };

  const getCurrentContent = () => {
    if (!jobStatus?.result) return null;
    
    if (activeLanguage === 'en') {
      return jobStatus.result;
    } else {
      return jobStatus.result.localized[activeLanguage] || jobStatus.result;
    }
  };

  const resetToInitialState = () => {
    setJobId(null);
    setJobStatus(null);
    setFile(null);
    setYoutubeUrl('');
    setTitle('');
    setIsProcessing(false);
    setUploadError(null);
    setActiveTab('summary');
    setActiveLanguage('en');
    setContentType('file');
    setUserAnswers({});
    setAnsweredQuestions(new Set());
    setFlippedCards(new Set());
  };

  const currentContent = getCurrentContent();
  const selectedFileInfo = file ? getFileTypeInfo(file.name) : null;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-cyan-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Enhanced Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <ContentCubeLogo size="h-16 w-16" />
              <div className="ml-4">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  ContentCube
                </h1>
                <div className="flex items-center justify-center mt-1">
                  <Sparkles className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-sm text-gray-600 font-medium">AI-Powered Content Transformation</span>
                </div>
              </div>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Transform any content into interactive summaries, quizzes, and flashcards with the power of AI
            </p>
            <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
              <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                <Monitor className="h-4 w-4 mr-2 text-indigo-500" />
                Supports documents, images, audio, video & YouTube
              </div>
            </div>
          </div>

          {/* Upload Section */}
          {!jobId && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                {/* Content Type Selector */}
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6 border-b border-white/20">
                  <div className="flex justify-center">
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-2 flex border border-white/30">
                      <button
                        onClick={() => setContentType('file')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center ${
                          contentType === 'file'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                        }`}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </button>
                      <button
                        onClick={() => setContentType('youtube')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center ${
                          contentType === 'youtube'
                            ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg transform scale-105'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                        }`}
                      >
                        <Youtube className="h-4 w-4 mr-2" />
                        YouTube URL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  {/* File Upload Section */}
                  {contentType === 'file' && (
                    <div 
                      className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                        isDragOver 
                          ? 'border-indigo-400 bg-indigo-50/50 scale-105' 
                          : 'border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/30'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className={`transition-all duration-300 ${isDragOver ? 'scale-110' : ''}`}>
                        <Upload className={`mx-auto h-16 w-16 mb-6 ${isDragOver ? 'text-indigo-500' : 'text-gray-400'}`} />
                        
                        {isDragOver ? (
                          <div className="space-y-3">
                            <p className="text-2xl font-semibold text-indigo-600">Drop your file here</p>
                            <p className="text-indigo-500">Release to upload your content</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div>
                              <p className="text-xl font-semibold text-gray-700 mb-2">Choose a file to transform</p>
                              <p className="text-gray-500">Drag and drop or click to browse</p>
                            </div>
                            
                            <input
                              type="file"
                              onChange={handleFileUpload}
                              accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.mp3,.wav,.ogg,.m4a,.flac,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv"
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-indigo-50 file:to-purple-50 file:text-indigo-700 hover:file:from-indigo-100 hover:file:to-purple-100 transition-all duration-300"
                              disabled={isProcessing}
                            />
                            
                            {/* Enhanced Supported File Types Display */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                              {Object.entries(SUPPORTED_TYPES).map(([key, info]) => {
                                const Icon = info.icon;
                                return (
                                  <div key={key} className="group hover:scale-105 transition-all duration-300">
                                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 hover:border-white/50 hover:shadow-lg">
                                      <div className={`h-12 w-12 mx-auto mb-4 bg-gradient-to-br ${info.gradient} rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-all duration-300`}>
                                        <Icon className="h-6 w-6 text-white" />
                                      </div>
                                      <div className="font-semibold text-gray-700 mb-2">{info.label}</div>
                                      <div className="text-xs text-gray-500 mb-3 leading-relaxed">{info.description}</div>
                                      <div className="text-xs text-gray-400">
                                        {info.extensions.slice(0, 3).join(', ')}
                                        {info.extensions.length > 3 && '...'}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* YouTube URL Section */}
                  {contentType === 'youtube' && (
                    <div className="border-2 border-dashed border-red-200 rounded-2xl p-12 bg-gradient-to-br from-red-50/50 to-pink-50/50">
                      <div className="text-center space-y-6">
                        <div className="relative">
                          <Youtube className="mx-auto h-16 w-16 text-red-500" />
                          <div className="absolute -top-2 -right-2 h-6 w-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                            <Play className="h-3 w-3 text-white ml-0.5" />
                          </div>
                        </div>
                        <div>
                          <p className="text-xl font-semibold text-gray-700 mb-2">YouTube Video URL</p>
                          <p className="text-gray-500">Transform any YouTube video into learning materials</p>
                        </div>
                        <input
                          type="url"
                          placeholder="https://youtube.com/watch?v=..."
                          value={youtubeUrl}
                          onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                          className="w-full px-6 py-4 border-2 border-red-200 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-400 transition-all duration-300 text-center bg-white/70 backdrop-blur-sm"
                          disabled={isProcessing}
                        />
                        <div className="text-sm text-gray-500 flex items-center justify-center">
                          <Monitor className="h-4 w-4 mr-2" />
                          Supports youtube.com and youtu.be links • Videos up to 30 minutes
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Title Input */}
                  <div className="mt-8">
                    <input
                      type="text"
                      placeholder="Content title (optional)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-300 bg-white/70 backdrop-blur-sm"
                      disabled={isProcessing}
                      maxLength={100}
                    />
                  </div>

                  {/* Enhanced Processing States */}
                  {isProcessing ? (
                    <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-200">
                      <div className="flex items-center justify-center mb-6">
                        <LoadingSpinner size="h-12 w-12" />
                        <div className="ml-4">
                          <h3 className="text-xl font-semibold text-gray-800">Processing Your Content</h3>
                          <p className="text-gray-600">This may take a few moments...</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {[
                          { stage: 'Analyzing content...', min: 0, max: 20 },
                          { stage: 'Extracting information...', min: 20, max: 40 },
                          { stage: 'Generating summary...', min: 40, max: 60 },
                          { stage: 'Creating questions...', min: 60, max: 80 },
                          { stage: 'Finalizing materials...', min: 80, max: 100 }
                        ].map((item, index) => {
                          const progress = jobStatus?.progress || 0;
                          const isActive = progress >= item.min && progress < item.max;
                          const isCompleted = progress >= item.max;
                          
                          return (
                            <div key={index} className={`flex items-center p-4 rounded-xl transition-all duration-500 ${
                              isActive ? 'bg-white/70 border border-indigo-200 shadow-sm' : 
                              isCompleted ? 'bg-green-50 border border-green-200' : 'bg-white/40'
                            }`}>
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-4 transition-all duration-300 ${
                                isCompleted ? 'bg-green-500' : isActive ? 'bg-indigo-500' : 'bg-gray-300'
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-white" />
                                ) : isActive ? (
                                  <LoadingSpinner size="h-4 w-4" />
                                ) : (
                                  <div className="h-2 w-2 bg-white rounded-full"></div>
                                )}
                              </div>
                              <span className={`font-medium transition-all duration-300 ${
                                isCompleted ? 'text-green-700' : isActive ? 'text-indigo-700' : 'text-gray-500'
                              }`}>
                                {item.stage}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={startProcessing}
                      disabled={
                        (contentType === 'file' && !file) || 
                        (contentType === 'youtube' && !youtubeUrl)
                      }
                      className="w-full mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-8 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      Transform Content
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </button>
                  )}
                  
                  {/* Enhanced File/URL Info Display */}
                  {file && selectedFileInfo && (
                    <div className="mt-6 bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`h-12 w-12 bg-gradient-to-br ${selectedFileInfo.gradient} rounded-xl flex items-center justify-center mr-4`}>
                            <selectedFileInfo.icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{file.name}</div>
                            <div className="text-sm text-gray-600 flex items-center">
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs mr-2">
                                {selectedFileInfo.label}
                              </span>
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                          <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                            {selectedFileInfo.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {youtubeUrl && contentType === 'youtube' && (
                    <div className="mt-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6 border border-red-200">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                          <Youtube className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 flex items-center">
                            YouTube Video
                            <span className="ml-2 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
                              Ready to process
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 truncate mt-1">{youtubeUrl}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced Error Display */}
                  {uploadError && (
                    <div className="mt-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6">
                      <div className="flex items-start">
                        <div className="h-10 w-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
                          <AlertCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-red-800 mb-2">Upload Error</h4>
                          <p className="text-sm text-red-700 leading-relaxed">{uploadError}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Results Section */}
          {jobStatus && jobStatus.status === 'completed' && currentContent && (
            <div className="max-w-7xl mx-auto">
              {/* Enhanced Header with Language Selector & Export Buttons */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="flex items-center flex-wrap gap-4">
                    <div className="flex items-center bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full font-medium border border-green-200">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {jobStatus.result?.content_source || 'Processed'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleLanguageChange('en')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                          activeLanguage === 'en'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                            : 'bg-white/70 text-gray-700 hover:bg-white border border-gray-200'
                        }`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => handleLanguageChange('hi')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                          activeLanguage === 'hi'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                            : 'bg-white/70 text-gray-700 hover:bg-white border border-gray-200'
                        }`}
                      >
                        हिंदी
                      </button>
                      <button
                        onClick={() => handleLanguageChange('es')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                          activeLanguage === 'es'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                            : 'bg-white/70 text-gray-700 hover:bg-white border border-gray-200'
                        }`}
                      >
                        Español
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={downloadCSV}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Google Forms CSV
                    </button>
                    <button
                      onClick={downloadJSON}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Full JSON
                    </button>
                    <button
                      onClick={resetToInitialState}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-xl hover:from-gray-700 hover:to-slate-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      New Upload
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Content Tabs */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-b border-white/20">
                  <nav className="flex space-x-1 p-2 overflow-x-auto">
                    {[
                      { key: 'summary', label: 'Summary', icon: FileText, count: null, gradient: 'from-blue-500 to-cyan-500' },
                      { key: 'mcqs', label: 'MCQs', icon: CheckCircle, count: currentContent.mcqs?.length, gradient: 'from-green-500 to-emerald-500' },
                      { key: 'flashcards', label: 'Flashcards', icon: Camera, count: currentContent.flashcards?.length, gradient: 'from-purple-500 to-violet-500' }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`flex-1 min-w-max py-4 px-6 font-medium text-sm flex items-center justify-center rounded-xl transition-all duration-300 transform hover:scale-105 ${
                            isActive
                              ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                              : 'text-gray-600 hover:text-gray-800 hover:bg-white/60'
                          }`}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {tab.label}
                          {tab.count && (
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                              isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
                
                <div className="p-8">
                  {/* Enhanced Summary Tab */}
                  {activeTab === 'summary' && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-2xl font-bold mb-6 flex items-center">
                          <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          Summary
                        </h3>
                        <div className="bg-gradient-to-br from-blue-50/50 to-cyan-50/50 rounded-2xl p-8 border border-blue-200/50">
                          <p className="text-gray-700 leading-relaxed text-lg">
                            {currentContent.summary}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-6 flex items-center">
                          <div className="h-8 w-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mr-3">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          Key Takeaways
                        </h3>
                        <div className="grid gap-4">
                          {currentContent.takeaways?.map((takeaway, index) => (
                            <div key={index} className="group hover:scale-105 transition-all duration-300">
                              <div className="flex items-start bg-gradient-to-r from-emerald-50/50 to-green-50/50 p-6 rounded-2xl border border-emerald-200/50 hover:border-emerald-300/50 hover:shadow-lg">
                                <div className="h-6 w-6 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                  <span className="text-white text-sm font-bold">{index + 1}</span>
                                </div>
                                <span className="text-gray-700 font-medium leading-relaxed">{takeaway}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enhanced MCQs Tab */}
                  {activeTab === 'mcqs' && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold flex items-center">
                          <div className="h-8 w-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          Quiz Questions
                        </h3>
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-200">
                          <span className="text-sm font-medium text-gray-600">
                            Progress: {answeredQuestions.size}/{currentContent.mcqs?.length || 0}
                          </span>
                        </div>
                      </div>
                      
                      {currentContent.mcqs?.map((mcq, questionIndex) => {
                        const userAnswer = userAnswers[questionIndex];
                        const isAnswered = answeredQuestions.has(questionIndex);
                        const isCorrect = userAnswer === mcq.correct_answer;

                        return (
                          <div key={questionIndex} className="bg-gradient-to-br from-gray-50/50 to-white/50 rounded-2xl p-8 border border-gray-200/50 hover:border-gray-300/50 transition-all duration-300">
                            <div className="flex items-start justify-between mb-6">
                              <h4 className="font-semibold text-xl flex-1 leading-relaxed">
                                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold mr-2">
                                  Q{questionIndex + 1}.
                                </span>
                                {mcq.question}
                              </h4>
                              {isAnswered && (
                                <div className={`flex items-center ml-6 px-4 py-2 rounded-full font-medium shadow-sm ${
                                  isCorrect 
                                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                                    : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200'
                                }`}>
                                  {isCorrect ? (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Correct
                                    </>
                                  ) : (
                                    <>
                                      <X className="h-4 w-4 mr-2" />
                                      Incorrect
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="grid gap-3 mb-6">
                              {mcq.options?.map((option, optionIndex) => {
                                const optionLetter = option.charAt(0);
                                const isSelected = userAnswer === optionLetter;
                                const isCorrectOption = optionLetter === mcq.correct_answer;
                                
                                let buttonStyle = 'bg-white/80 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300';
                                
                                if (isAnswered) {
                                  if (isSelected && isCorrect) {
                                    buttonStyle = 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 text-green-800 shadow-sm';
                                  } else if (isSelected && !isCorrect) {
                                    buttonStyle = 'bg-gradient-to-r from-red-100 to-pink-100 border-2 border-red-300 text-red-800 shadow-sm';
                                  } else if (isCorrectOption && !isCorrect) {
                                    buttonStyle = 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700';
                                  }
                                } else if (isSelected) {
                                  buttonStyle = 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 shadow-sm';
                                }

                                return (
                                  <button
                                    key={optionIndex}
                                    onClick={() => !isAnswered && handleAnswerSelect(questionIndex, optionLetter)}
                                    disabled={isAnswered}
                                    className={`w-full text-left p-5 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 ${buttonStyle} ${
                                      !isAnswered ? 'cursor-pointer' : 'cursor-default'
                                    }`}
                                  >
                                    <div className="flex items-center">
                                      <span className="font-bold mr-4 text-lg">{optionLetter})</span>
                                      <span className="flex-1 leading-relaxed">{option.substring(3)}</span>
                                      {isAnswered && isSelected && (
                                        <span className="ml-3">
                                          {isCorrect ? (
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                          ) : (
                                            <X className="h-5 w-5 text-red-600" />
                                          )}
                                        </span>
                                      )}
                                      {isAnswered && !isSelected && isCorrectOption && !isCorrect && (
                                        <CheckCircle className="h-5 w-5 text-green-600 ml-3" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {isAnswered && (
                              <div className={`p-6 rounded-2xl border-2 ${
                                isCorrect 
                                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                              }`}>
                                <div className="text-sm">
                                  <div className="font-bold text-gray-800 mb-3 text-base">Explanation:</div>
                                  <p className="text-gray-700 mb-4 leading-relaxed">{mcq.explanation}</p>
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span className="bg-white/60 px-3 py-1 rounded-full">
                                      <strong>Level:</strong> {mcq.bloom_level}
                                    </span>
                                    <span className="bg-white/60 px-3 py-1 rounded-full">
                                      <strong>Answer:</strong> {mcq.correct_answer}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {!isAnswered && (
                              <div className="text-center py-4">
                                <p className="text-gray-500 italic">Click on an option to see if it's correct</p>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Enhanced Quiz Progress */}
                      {answeredQuestions.size > 0 && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
                          <h4 className="font-bold text-indigo-800 mb-4 text-lg flex items-center">
                            <div className="h-6 w-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mr-2">
                              <CheckCircle className="h-3 w-3 text-white" />
                            </div>
                            Quiz Progress
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
                              <div className="font-bold text-indigo-700 text-2xl">
                                {answeredQuestions.size}/{currentContent.mcqs?.length || 0}
                              </div>
                              <div className="text-gray-600">Questions Answered</div>
                            </div>
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
                              <div className="font-bold text-green-700 text-2xl">
                                {Object.entries(userAnswers).filter(([questionIndex, answer]) => 
                                  answer === currentContent.mcqs?.[parseInt(questionIndex)]?.correct_answer
                                ).length}
                              </div>
                              <div className="text-gray-600">Correct Answers</div>
                            </div>
                            {answeredQuestions.size === currentContent.mcqs?.length && (
                              <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-xl p-4 text-center">
                                <div className="font-bold text-green-800 text-2xl">
                                  {Math.round(
                                    (Object.entries(userAnswers).filter(([questionIndex, answer]) => 
                                      answer === currentContent.mcqs?.[parseInt(questionIndex)]?.correct_answer
                                    ).length / answeredQuestions.size) * 100
                                  )}%
                                </div>
                                <div className="text-green-700 font-medium">Final Score</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enhanced Flashcards Tab */}
                  {activeTab === 'flashcards' && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold flex items-center">
                          <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg flex items-center justify-center mr-3">
                            <Camera className="h-4 w-4 text-white" />
                          </div>
                          Study Cards
                        </h3>
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-200">
                          <span className="text-sm font-medium text-gray-600">
                            Click cards to flip and reveal answers
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {currentContent.flashcards?.map((card, index) => {
                          const isFlipped = flippedCards.has(index);
                          return (
                            <div
                              key={index}
                              onClick={() => toggleFlip(index)}
                              className="group cursor-pointer transform transition-all duration-500 hover:scale-105 perspective-1000"
                              style={{ perspective: '1000px' }}
                            >
                              <div className={`relative w-full h-64 transition-transform duration-700 transform-style-preserve-3d ${
                                isFlipped ? 'rotate-y-180' : ''
                              }`}>
                                {/* Front of card */}
                                <div className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden">
                                  <div className="h-full bg-gradient-to-br from-purple-500 via-violet-500 to-purple-600 p-1 rounded-2xl">
                                    <div className="h-full bg-white rounded-xl p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
                                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100 to-violet-100 rounded-full -translate-y-10 translate-x-10 opacity-60"></div>
                                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full translate-y-8 -translate-x-8 opacity-60"></div>
                                      
                                      <div className="relative z-10">
                                        <div className="text-xs text-purple-600 font-semibold mb-3 bg-purple-50 px-3 py-1 rounded-full">
                                          Card {index + 1}
                                        </div>
                                        <div className="font-semibold text-gray-800 text-lg leading-relaxed mb-4">
                                          {card.front}
                                        </div>
                                        <div className="text-xs text-purple-600 flex items-center justify-center">
                                          <ArrowRight className="h-3 w-3 mr-1" />
                                          Click to reveal answer
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                  
                                {/* Back of card */}
                                <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl overflow-hidden">
                                  <div className="h-full bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 p-1 rounded-2xl">
                                    <div className="h-full bg-white rounded-xl p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
                                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full -translate-y-10 translate-x-10 opacity-60"></div>
                                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full translate-y-8 -translate-x-8 opacity-60"></div>
                                      
                                      <div className="relative z-10">
                                        <div className="text-xs text-emerald-700 font-semibold mb-3 bg-emerald-50 px-3 py-1 rounded-full">
                                          Answer
                                        </div>
                                        <div className="text-gray-700 text-base leading-relaxed mb-4">
                                          {card.back}
                                        </div>
                                        <div className="text-xs text-emerald-600 flex items-center justify-center">
                                          <RefreshCw className="h-3 w-3 mr-1" />
                                          Click to flip back
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
        
                      {/* Enhanced Progress indicator */}
                      {currentContent.flashcards && currentContent.flashcards.length > 0 && (
                        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 border-2 border-purple-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-purple-800 text-lg">Study Progress</h4>
                              <p className="text-purple-600">
                                Cards flipped: <span className="font-semibold">{flippedCards.size}</span> of <span className="font-semibold">{currentContent.flashcards.length}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-purple-700">
                                {Math.round((flippedCards.size / currentContent.flashcards.length) * 100)}%
                              </div>
                              <div className="text-sm text-purple-600">Complete</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div> 
              </div>
            </div>
          )}

          {/* Enhanced Error State */}
          {jobStatus && jobStatus.status === 'failed' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-red-200 overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-pink-50 p-8">
                  <div className="flex items-start">
                    <div className="h-12 w-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 mr-6">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-red-800 mb-3">Processing Failed</h3>
                      <p className="text-red-700 leading-relaxed mb-6 text-lg">{jobStatus.error}</p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={resetToInitialState}
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center shadow-lg"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Try Again
                        </button>
                        <button
                          onClick={() => window.location.reload()}
                          className="bg-gradient-to-r from-gray-600 to-slate-600 text-white py-3 px-6 rounded-xl hover:from-gray-700 hover:to-slate-700 transition-all duration-300 transform hover:scale-105 flex items-center shadow-lg"
                        >
                          <Monitor className="h-4 w-4 mr-2" />
                          Refresh Page
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <div className="flex items-center justify-center mb-4">
            <ContentCubeLogo size="h-6 w-6" />
            <span className="ml-2 font-medium">ContentCube</span>
          </div>
          <p>Transform your content into engaging learning materials with AI</p>
        </footer>
      </div>

      {/* Custom Styles for 3D flip effect */}
      <style>
        {`
          .perspective-1000 {
            perspective: 1000px;
          }
          .transform-style-preserve-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
        `}
      </style>
    </ErrorBoundary>
  );
}

export default App;