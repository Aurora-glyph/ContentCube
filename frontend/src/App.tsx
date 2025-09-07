import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  RefreshCw,
  Image,
  Video,
  Music,
  Youtube,
  File,
  Camera,
  Mic,
  Monitor
} from 'lucide-react';
import './App.css';

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center text-red-600 mb-4">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-lg font-semibold">Something went wrong</span>
            </div>
            <p className="text-gray-700 mb-4">
              An unexpected error occurred. Please refresh the page and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
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

const API_BASE = 'http://localhost:8000';

// Supported file types with icons and descriptions
const SUPPORTED_TYPES = {
  documents: {
    icon: FileText,
    label: 'Documents',
    extensions: ['.pdf', '.docx', '.txt'],
    description: 'Text extraction and analysis'
  },
  images: {
    icon: Image,
    label: 'Images',
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'],
    description: 'OCR and visual content analysis'
  },
  audio: {
    icon: Mic,
    label: 'Audio',
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
    description: 'Speech-to-text transcription'
  },
  video: {
    icon: Video,
    label: 'Videos',
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
    description: 'Audio transcription + visual analysis'
  }
};

function App() {
  const [contentType, setContentType] = useState<'file' | 'youtube'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const getFileTypeInfo = (filename: string) => {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    
    for (const [category, info] of Object.entries(SUPPORTED_TYPES)) {
      if (info.extensions.includes(ext)) {
        return { category, ...info };
      }
    }
    
    return { category: 'unknown', icon: File, label: 'Unknown', extensions: [], description: 'Unsupported' };
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
      
      // Validate file size (500MB limit for videos)
      const maxSize = 500 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setUploadError('File size exceeds 500MB limit. Please choose a smaller file.');
        return;
      }

      // Validate file type
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

  const handleYouTubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    setUploadError(null);
    
    if (url && validateYouTubeUrl(url)) {
      // Extract video title from URL or set a default
      setTitle('YouTube Video Content');
    }
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
  };

  const currentContent = getCurrentContent();
  const selectedFileInfo = file ? getFileTypeInfo(file.name) : null;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              CodeEd Universal Content Repurposer
            </h1>
            <p className="text-lg text-gray-600">
              Transform any content into summaries, quizzes, and flashcards
            </p>
            <div className="text-sm text-gray-500 mt-2">
              Supports documents, images, audio, video, and YouTube links
            </div>
          </div>

          {/* Upload Section */}
          {!jobId && (
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-8">
              {/* Content Type Selector */}
              <div className="flex justify-center mb-6">
                <div className="bg-gray-100 rounded-lg p-1 flex">
                  <button
                    onClick={() => setContentType('file')}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center ${
                      contentType === 'file'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </button>
                  <button
                    onClick={() => setContentType('youtube')}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center ${
                      contentType === 'youtube'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Youtube className="h-4 w-4 mr-2" />
                    YouTube URL
                  </button>
                </div>
              </div>

              {/* File Upload Section */}
              {contentType === 'file' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <div className="text-center space-y-4">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.mp3,.wav,.ogg,.m4a,.flac,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      disabled={isProcessing}
                    />
                    
                    {/* Supported File Types Display */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
                      {Object.entries(SUPPORTED_TYPES).map(([key, info]) => {
                        const Icon = info.icon;
                        return (
                          <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                            <Icon className="h-6 w-6 mx-auto mb-2 text-gray-500" />
                            <div className="font-medium text-gray-700">{info.label}</div>
                            <div className="text-xs text-gray-500 mt-1">{info.description}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {info.extensions.slice(0, 3).join(', ')}
                              {info.extensions.length > 3 && '...'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* YouTube URL Section */}
              {contentType === 'youtube' && (
                <div className="border-2 border-dashed border-red-200 rounded-lg p-8">
                  <div className="text-center space-y-4">
                    <Youtube className="mx-auto h-12 w-12 text-red-400" />
                    <input
                      type="url"
                      placeholder="Enter YouTube URL (e.g., https://youtube.com/watch?v=...)"
                      value={youtubeUrl}
                      onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-center"
                      disabled={isProcessing}
                    />
                    <div className="text-sm text-gray-500">
                      Supports youtube.com and youtu.be links • Videos up to 30 minutes
                    </div>
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div className="mt-6">
                <input
                  type="text"
                  placeholder="Content title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isProcessing}
                  maxLength={100}
                />
              </div>

              {/* Process Button */}
              <button
                onClick={startProcessing}
                disabled={
                  isProcessing || 
                  (contentType === 'file' && !file) || 
                  (contentType === 'youtube' && !youtubeUrl)
                }
                className="w-full mt-4 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Monitor className="h-4 w-4 mr-2" />
                    Start Processing
                  </>
                )}
              </button>
              
              {/* File/URL Info Display */}
              {file && selectedFileInfo && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <selectedFileInfo.icon className="h-5 w-5 text-gray-500 mr-3" />
                      <div>
                        <div className="font-medium text-gray-700">{file.name}</div>
                        <div className="text-sm text-gray-500">
                          {selectedFileInfo.label} • {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 text-right">
                      <div>{selectedFileInfo.description}</div>
                    </div>
                  </div>
                </div>
              )}

              {youtubeUrl && contentType === 'youtube' && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <Youtube className="h-5 w-5 text-red-500 mr-3" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-700">YouTube Video</div>
                      <div className="text-sm text-gray-500 truncate">{youtubeUrl}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error Display */}
              {uploadError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">{uploadError}</div>
                </div>
              )}
            </div>
          )}

          {/* Progress Section */}
          {jobStatus && jobStatus.status === 'processing' && (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex items-center mb-4">
                <Loader className="animate-spin h-5 w-5 text-blue-500 mr-2" />
                <span className="text-lg font-semibold">Processing your content...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${jobStatus.progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{jobStatus.progress}% complete</span>
                <span>
                  {jobStatus.progress < 15 && 'Downloading content...'}
                  {jobStatus.progress >= 15 && jobStatus.progress < 35 && 'Extracting information...'}
                  {jobStatus.progress >= 35 && jobStatus.progress < 55 && 'Generating summary...'}
                  {jobStatus.progress >= 55 && jobStatus.progress < 75 && 'Creating questions...'}
                  {jobStatus.progress >= 75 && jobStatus.progress < 90 && 'Making flashcards...'}
                  {jobStatus.progress >= 90 && 'Finalizing...'}
                </span>
              </div>
            </div>
          )}

          {/* Results Section */}
          {jobStatus && jobStatus.status === 'completed' && currentContent && (
            <div className="max-w-6xl mx-auto">
              {/* Content Source & Export Buttons */}
              <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center">
                    <div className="flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium mr-4">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {jobStatus.result?.content_source || 'Processed'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveLanguage('en')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          activeLanguage === 'en'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => setActiveLanguage('hi')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          activeLanguage === 'hi'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        हिंदी
                      </button>
                      <button
                        onClick={() => setActiveLanguage('es')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          activeLanguage === 'es'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Español
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={downloadCSV}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Google Forms CSV
                    </button>
                    <button
                      onClick={downloadJSON}
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Full JSON
                    </button>
                    <button
                      onClick={resetToInitialState}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      New Upload
                    </button>
                  </div>
                </div>
              </div>

              {/* Content Tabs */}
              <div className="bg-white rounded-lg shadow-lg">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6 overflow-x-auto">
                    {[
                      { key: 'summary', label: 'Summary', icon: FileText, count: null },
                      { key: 'mcqs', label: 'MCQs', icon: CheckCircle, count: currentContent.mcqs?.length },
                      { key: 'flashcards', label: 'Flashcards', icon: Camera, count: currentContent.flashcards?.length }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
                            activeTab === tab.key
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {tab.label}
                          {tab.count && (
                            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="p-6">
                  {/* Summary Tab */}
                  {activeTab === 'summary' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Summary</h3>
                        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                            {currentContent.summary}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Key Takeaways</h3>
                        <ul className="space-y-3">
                          {currentContent.takeaways?.map((takeaway, index) => (
                            <li key={index} className="flex items-start p-3 bg-green-50 rounded-lg">
                              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{takeaway}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* MCQs Tab */}
                  {activeTab === 'mcqs' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-gray-800">Multiple Choice Questions</h3>
                        <span className="text-sm text-gray-500">
                          {currentContent.mcqs?.length || 0} questions
                        </span>
                      </div>
                      {currentContent.mcqs?.map((mcq, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <h4 className="font-semibold text-gray-800 mb-4 text-lg">
                            {index + 1}. {mcq.question}
                          </h4>
                          <div className="space-y-2 mb-4">
                            {mcq.options?.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className={`p-3 rounded-lg border transition-colors ${
                                  option.startsWith(mcq.correct_answer)
                                    ? 'bg-green-100 border-green-300 text-green-800'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {option}
                              </div>
                            ))}
                          </div>
                          <div className="border-t pt-4 space-y-2">
                            <div className="text-sm text-gray-700">
                              <strong className="text-gray-800">Explanation:</strong> {mcq.explanation}
                            </div>
                            <div className="text-xs text-gray-500">
                              <strong>Bloom's Level:</strong> {mcq.bloom_level}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Flashcards Tab */}
                  {activeTab === 'flashcards' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-gray-800">Flashcards</h3>
                        <span className="text-sm text-gray-500">
                          {currentContent.flashcards?.length || 0} cards
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {currentContent.flashcards?.map((card, index) => (
                          <div key={index} className="group perspective-1000">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-1 shadow-lg hover:shadow-xl transition-shadow">
                              <div className="bg-white rounded-lg p-6 h-48 flex flex-col">
                                <div className="text-center flex-1 flex flex-col justify-between">
                                  <div>
                                    <div className="text-xs text-blue-600 font-medium mb-2 uppercase tracking-wide">
                                      Card {index + 1} • Front
                                    </div>
                                    <div className="font-semibold text-gray-800 mb-4 text-base leading-tight">
                                      {card.front}
                                    </div>
                                  </div>
                                  <div className="border-t pt-4">
                                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
                                      Answer
                                    </div>
                                    <div className="text-gray-600 text-sm leading-relaxed">
                                      {card.back}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {jobStatus && jobStatus.status === 'failed' && (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center text-red-600 mb-4">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="text-lg font-semibold">Processing Failed</span>
              </div>
              <p className="text-gray-700 mb-4">{jobStatus.error}</p>
              <div className="flex space-x-3">
                <button
                  onClick={resetToInitialState}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;