# CodeEd Universal Content Repurposer - Setup Guide

Transform any multimedia content (documents, images, audio, video, YouTube) into educational materials using AI.

## 🎯 Features

- **Document Processing**: PDF, DOCX, TXT files
- **Image Analysis**: JPEG, PNG, WebP, GIF, BMP, TIFF with OCR + AI vision
- **Audio Transcription**: MP3, WAV, OGG, M4A, FLAC with speech-to-text
- **Video Processing**: MP4, AVI, MOV, WMV, FLV, WebM, MKV with audio + visual analysis
- **YouTube Integration**: Direct URL processing with content extraction
- **Multi-language Support**: English, Hindi, Spanish translations
- **Export Options**: Google Forms CSV, Full JSON export

## 🔧 System Requirements

- **Python**: 3.8 or higher
- **Node.js**: 14 or higher
- **Storage**: 2GB free space for models and temporary files
- **RAM**: 4GB minimum (8GB recommended for video processing)

## 📋 Prerequisites Installation

### Windows

```bash
# Install Python (download from python.org)
# Install Node.js (download from nodejs.org)

# Install system dependencies using chocolatey
choco install ffmpeg tesseract

# Or manually:
# 1. Download FFmpeg from https://ffmpeg.org/download.html
# 2. Download Tesseract from https://github.com/UB-Mannheim/tesseract/wiki
```

### macOS

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install system dependencies
brew install python node ffmpeg tesseract
```

### Ubuntu/Debian

```bash
# Update package list
sudo apt update

# Install system dependencies
sudo apt install python3 python3-pip nodejs npm ffmpeg tesseract-ocr libtesseract-dev

# Install additional codec libraries for video processing
sudo apt install libavcodec-extra libavdevice-dev libavfilter-dev libavformat-dev libavresample-dev libavutil-dev
```

### CentOS/RHEL/Fedora

```bash
# Enable EPEL repository (for CentOS/RHEL)
sudo yum install epel-release

# Install system dependencies
sudo yum install python3 python3-pip nodejs npm ffmpeg tesseract

# For Fedora, use dnf instead of yum
sudo dnf install python3 python3-pip nodejs npm ffmpeg tesseract
```

## 🚀 Installation Steps

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd coded-hackathon
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install additional models
python -c "import whisper; whisper.load_model('base')"
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install Node.js dependencies
npm install

# Or using yarn
yarn install
```

### 4. Environment Configuration

Create a `.env` file in the backend directory:

```bash
# backend/.env
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Rate limiting settings
GEMINI_REQUESTS_PER_MINUTE=10

# Optional: File size limits (in MB)
MAX_FILE_SIZE_MB=500

# Optional: YouTube processing settings
YOUTUBE_MAX_DURATION_SECONDS=1800
```

**Getting a Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

### 5. Test Installation

```bash
# Test backend dependencies
cd backend
python -c "import google.generativeai as genai; import whisper; import cv2; print('All imports successful!')"

# Test system dependencies
ffmpeg -version
tesseract --version
```

## ▶️ Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py

# Or using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start

# Or using yarn
yarn start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Production Mode

```bash
# Backend
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Frontend (build and serve)
cd frontend
npm run build
npm install -g serve
serve -s build -l 3000
```

## 🔧 Configuration Options

### Backend Configuration

Edit `main.py` to adjust:

```python
# File size limits
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

# Rate limiting
rate_limiter = GeminiRateLimiter(requests_per_minute=10)

# Supported file types (add/remove as needed)
ALLOWED_MIME_TYPES = {
    # Add new mime types here
}
```

### Frontend Configuration

Edit `App.tsx` to modify:

```typescript
// API endpoint
const API_BASE = 'http://localhost:8000';

// Polling interval for job status
setTimeout(() => pollJobStatus(jobId), 2000);
```

## 📁 Project Structure

```
coded-hackathon/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── .env                # Environment variables
│   └── temp/               # Temporary files (auto-created)
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Main React component
│   │   └── App.css         # Styles
│   ├── package.json        # Node.js dependencies
│   └── public/             # Static files
├── setup.md                # This file
└── README.md               # Project overview
```

## 🐛 Troubleshooting

### Common Issues

**1. "ModuleNotFoundError: No module named 'whisper'"**
```bash
pip install openai-whisper
```

**2. "ffmpeg not found" error**
```bash
# Verify installation
which ffmpeg  # macOS/Linux
where ffmpeg  # Windows

# If not found, reinstall ffmpeg
```

**3. "Tesseract is not installed" error**
```bash
# Verify installation
tesseract --version

# On Windows, you may need to add tesseract to PATH
# Or set TESSDATA_PREFIX environment variable
```

**4. "CUDA out of memory" (for video processing)**
```bash
# Reduce video resolution in processing
# Or process shorter video segments
```

**5. YouTube download fails**
```bash
# Update yt-dlp
pip install --upgrade yt-dlp
```

### Performance Optimization

**For Large Files:**
- Process videos in chunks
- Use lower resolution for video analysis
- Enable GPU acceleration if available

**For Better Speed:**
- Use SSD storage for temporary files
- Increase available RAM
- Use faster internet for YouTube processing

### Memory Management

```bash
# Monitor memory usage
htop  # Linux/macOS
taskmgr  # Windows

# Clean temporary files
rm -rf /tmp/yt-dlp-*  # Linux/macOS
del %TEMP%\yt-dlp-*   # Windows
```

## 🔒 Security Considerations

1. **API Keys**: Never commit `.env` files to version control
2. **File Uploads**: The system validates file types and sizes
3. **Rate Limiting**: Built-in rate limiting for API calls
4. **Temporary Files**: Auto-cleanup of processed files
5. **CORS**: Configured for development (adjust for production)

## 📚 API Usage

### Upload File

```bash
curl -X POST "http://localhost:8000/repurpose" \
  -F "file=@example.pdf" \
  -F "title=My Document" \
  -F "content_type=file"
```

### Process YouTube URL

```bash
curl -X POST "http://localhost:8000/repurpose" \
  -F "youtube_url=https://youtube.com/watch?v=..." \
  -F "title=YouTube Video" \
  -F "content_type=youtube"
```

### Check Job Status

```bash
curl "http://localhost:8000/jobs/{job_id}"
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all dependencies are installed correctly
3. Check the console logs for error messages
4. Ensure your `.env` file has the correct API key
5. Test with smaller files first

## 🚀 Next Steps

Once setup is complete:

1. Test with a simple PDF file
2. Try different file types (image, audio, video)
3. Test YouTube URL processing
4. Explore multi-language features
5. Export content to Google Forms

Enjoy transforming your content into educational materials!