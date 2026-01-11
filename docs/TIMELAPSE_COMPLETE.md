# 📸 Timelapse Generator - Complete Documentation

## Overview

The Timelapse Generator system allows users to capture snapshots of their grow over time and automatically generate time-lapse videos. This comprehensive feature includes automated capture scheduling, manual capture, video generation with FFmpeg, and a full gallery management system.

## System Architecture

### Backend Components

#### 1. Models

**TimelapseCapture** (`backend/src/models/TimelapseCapture.js`)
- Stores metadata for each captured snapshot
- Tracks file location, resolution, quality
- Includes environment snapshot (temperature, humidity, VPD, EC, pH)
- Links to plants and grow cycles
- Supports soft delete
- Statistics and querying methods

**TimelapseVideo** (`backend/src/models/TimelapseVideo.js`)
- Stores metadata for generated videos
- Tracks processing status (pending, processing, completed, failed)
- Video properties (duration, FPS, resolution, codec)
- Links to source captures
- View/download statistics
- Processing progress tracking

#### 2. Services

**timelapseService** (`backend/src/services/timelapseService.js`)
- `captureSnapshot()` - Capture image from camera (currently creates placeholder)
- `generateTimelapse()` - Create video from captures using FFmpeg
- `createThumbnail()` - Generate 320x180 thumbnails
- `cleanupOldCaptures()` - Remove old unused captures
- `getStorageStats()` - Calculate storage usage

**timelapseCronService** (`backend/src/services/timelapseCronService.js`)
- Automated snapshot capture on schedule (default: every 10 minutes)
- Configurable via environment variables
- Daily cleanup job (3:00 AM)
- Enable/disable auto-capture
- Manual trigger capability

#### 3. Controller & Routes

**timelapseController** (`backend/src/controllers/timelapseController.js`)
- API handlers for all timelapse operations

**timelapseRoutes** (`backend/src/routes/timelapseRoutes.js`)
- RESTful API endpoints (see API Documentation below)

### Frontend Components

#### 1. TimelapseDashboard
**Location:** `frontend/src/components/Timelapse/TimelapseDashboard.jsx`

Main container component with 3 views:
- Gallery View (captures)
- Video Player (generated videos)
- Settings (configuration)

#### 2. TimelapseGallery
**Location:** `frontend/src/components/Timelapse/TimelapseGallery.jsx`

**Features:**
- Grid and List view modes
- Thumbnail display
- Capture selection (multi-select)
- Filters: phase, date, quality
- Batch delete
- Quick download/delete actions
- Click to view full image

#### 3. TimelapsePlayer
**Location:** `frontend/src/components/Timelapse/TimelapsePlayer.jsx`

**Features:**
- Video playback with HTML5 player
- Status badges (completed, processing, failed)
- Processing progress bars
- Filter by status
- Video metadata display
- Download and delete actions
- View counter tracking

#### 4. TimelapseSettings
**Location:** `frontend/src/components/Timelapse/TimelapseSettings.jsx`

**Features:**
- Manual snapshot capture
- Video generation form
- Storage statistics
- Cleanup configuration
- Resolution and quality settings

## API Documentation

### Base URL
```
http://localhost:3000/api/timelapse
```

### Endpoints

#### Captures

**POST /capture**
Capture manual snapshot
```bash
curl -X POST http://localhost:3000/api/timelapse/capture \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": { "width": 1920, "height": 1080 },
    "quality": 90,
    "phase": "vegetative",
    "tags": ["manual"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "filename": "capture_1234567890.jpg",
    "filePath": "/path/to/capture.jpg",
    "timestamp": "2025-01-02T20:30:00.000Z",
    "resolution": { "width": 1920, "height": 1080 },
    "fileSize": 2458624,
    "quality": { "score": 95 },
    "imageUrl": "/api/timelapse/images/capture_1234567890.jpg",
    "thumbnailUrl": "/api/timelapse/thumbnails/capture_1234567890.jpg"
  },
  "message": "Snapshot erfolgreich erfasst"
}
```

**GET /captures**
Get all captures with filtering
```bash
curl "http://localhost:3000/api/timelapse/captures?phase=vegetative&limit=50&sortOrder=desc"
```

**Query Parameters:**
- `startDate` - ISO date string (filter by start date)
- `endDate` - ISO date string (filter by end date)
- `plant` - Plant ID
- `phase` - Growth phase (seedling, vegetative, flowering, harvest)
- `tags` - Comma-separated tags
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)
- `sortBy` - Field to sort by (default: timestamp)
- `sortOrder` - asc/desc (default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "captures": [...],
    "pagination": {
      "total": 250,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**GET /captures/:id**
Get single capture

**DELETE /captures/:id**
Soft delete capture

#### Videos

**POST /generate**
Generate timelapse video
```bash
curl -X POST http://localhost:3000/api/timelapse/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Week 1-4 Vegetative Growth",
    "description": "First month of vegetative stage",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-01-28T23:59:59.000Z",
    "fps": 30,
    "resolution": { "width": 1920, "height": 1080 },
    "format": "mp4",
    "codec": "h264"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "title": "Week 1-4 Vegetative Growth",
    "filename": "timelapse_1234567890.mp4",
    "status": "processing",
    "processingProgress": 0,
    "frameCount": 400,
    "duration": 13.33,
    "videoUrl": "/api/timelapse/videos/timelapse_1234567890.mp4/stream"
  },
  "message": "Video-Generierung gestartet"
}
```

**GET /videos**
Get all videos
```bash
curl "http://localhost:3000/api/timelapse/videos?status=completed&limit=20"
```

**Query Parameters:**
- `status` - pending/processing/completed/failed
- `plant` - Plant ID
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset
- `sortBy` - Field to sort by (default: createdAt)
- `sortOrder` - asc/desc (default: desc)

**GET /videos/:id**
Get single video metadata

**DELETE /videos/:id**
Soft delete video

#### Media Serving

**GET /images/:filename**
Serve full-size capture image

**GET /thumbnails/:filename**
Serve thumbnail (320x180)

**GET /videos/:filename/stream**
Stream video (increments view counter)

**GET /videos/:filename/download**
Download video (increments download counter, forces download)

#### Utilities

**GET /statistics**
Get storage and usage statistics
```bash
curl http://localhost:3000/api/timelapse/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "captures": {
      "totalCaptures": 450,
      "totalSizeGB": 2.34,
      "usedInTimelapse": 380,
      "unusedCaptures": 70,
      "averageQuality": 94.5
    },
    "videos": {
      "total": 5,
      "pending": 0,
      "processing": 1,
      "completed": 4,
      "failed": 0,
      "totalSizeGB": 1.89,
      "totalDurationHours": 0.45,
      "totalViews": 23
    },
    "totalStorageGB": 4.23
  }
}
```

**POST /cleanup**
Cleanup old captures
```bash
curl -X POST http://localhost:3000/api/timelapse/cleanup \
  -H "Content-Type: application/json" \
  -d '{ "daysToKeep": 30 }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 45,
    "freedSpaceMB": "234.56"
  },
  "message": "45 alte Captures gelöscht, 234.56 MB freigegeben"
}
```

## Configuration

### Environment Variables

Add to `backend/.env`:

```bash
# Timelapse Capture Settings
TIMELAPSE_ENABLED=true
TIMELAPSE_INTERVAL="*/10 * * * *"  # Every 10 minutes (cron format)
TIMELAPSE_RESOLUTION="1920x1080"
TIMELAPSE_AUTO_CLEANUP=true
TIMELAPSE_CLEANUP_DAYS=30
```

### Cron Patterns

Common intervals:
```
*/10 * * * *    # Every 10 minutes
*/30 * * * *    # Every 30 minutes
0 * * * *       # Every hour
0 */2 * * *     # Every 2 hours
0 0 * * *       # Daily at midnight
```

## Storage Structure

```
backend/timelapse/
├── captures/           # Full-size captures
│   ├── capture_1234567890.jpg
│   ├── capture_1234567891.jpg
│   └── ...
├── thumbnails/         # 320x180 thumbnails
│   ├── thumb_capture_1234567890.jpg
│   ├── thumb_capture_1234567891.jpg
│   └── ...
├── videos/             # Generated videos
│   ├── timelapse_1234567890.mp4
│   ├── timelapse_1234567891.mp4
│   └── ...
└── temp/               # Temporary processing files
    └── frames_*.txt
```

## Video Generation Process

### 1. Capture Selection
```javascript
const captures = await TimelapseCapture.getByDateRange(startDate, endDate);
// Retrieves all captures within specified date range
```

### 2. Frame List Creation
FFmpeg concat demuxer requires frame list:
```
file '/path/to/capture_001.jpg'
duration 0.033
file '/path/to/capture_002.jpg'
duration 0.033
...
```

### 3. FFmpeg Processing
```bash
ffmpeg -f concat -safe 0 -i frames.txt \
  -c:v libx264 \
  -pix_fmt yuv420p \
  -r 30 \
  -s 1920x1080 \
  -preset medium \
  -crf 23 \
  output.mp4
```

**Parameters:**
- `-f concat` - Use concat demuxer
- `-safe 0` - Allow absolute paths
- `-c:v libx264` - H.264 codec
- `-pix_fmt yuv420p` - Pixel format (compatibility)
- `-r 30` - Output framerate (30 FPS)
- `-s 1920x1080` - Output resolution
- `-preset medium` - Encoding speed/quality trade-off
- `-crf 23` - Quality (0-51, lower = better quality)

### 4. Progress Tracking
Processing progress updates saved to TimelapseVideo:
```javascript
await video.updateProgress(50, 'Encoding... 50%');
```

### 5. Completion
```javascript
await video.complete(fileSize, duration);
// Marks captures as used
// Status → 'completed'
```

## Camera Integration

### Current Implementation (Development)
Currently creates placeholder images with timestamp overlay using Sharp SVG rendering.

### Future: Real Camera Integration

#### Option 1: USB Webcam (node-webcam)
```bash
npm install node-webcam
```

```javascript
const NodeWebcam = require('node-webcam');

const webcam = NodeWebcam.create({
  width: 1920,
  height: 1080,
  quality: 100,
  delay: 0,
  saveShots: true,
  output: 'jpeg',
  device: false, // false = default camera
  callbackReturn: 'location',
  verbose: false
});

webcam.capture(filePath, (err, data) => {
  if (err) throw err;
  console.log('Captured:', data);
});
```

#### Option 2: IP Camera (HTTP Stream)
```bash
npm install axios
```

```javascript
const axios = require('axios');
const fs = require('fs');

async function captureFromIPCam(url, filePath) {
  const response = await axios({
    method: 'get',
    url: url,
    responseType: 'stream'
  });

  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Usage
await captureFromIPCam('http://192.168.1.100/snapshot.jpg', filePath);
```

#### Option 3: ESP32-CAM (MQTT)
ESP32-CAM can send images via MQTT:

**Arduino Code:**
```cpp
camera_fb_t * fb = esp_camera_fb_get();
if (fb) {
  mqtt.publish("grow/camera/snapshot", fb->buf, fb->len, false, 0);
  esp_camera_fb_return(fb);
}
```

**Backend Handler:**
```javascript
mqttClient.on('message', async (topic, message) => {
  if (topic === 'grow/camera/snapshot') {
    const timestamp = Date.now();
    const filename = `capture_${timestamp}.jpg`;
    const filePath = path.join(capturesDir, filename);

    await fs.writeFile(filePath, message);

    const capture = new TimelapseCapture({
      filename,
      filePath,
      timestamp: new Date(),
      captureSource: 'esp32_cam',
      // ... metadata
    });

    await capture.save();
  }
});
```

## Hardware Requirements

### For Camera Capture

**Option 1: USB Webcam**
- Any USB webcam compatible with your OS
- Recommended: Logitech C920 or similar (1080p)
- Cost: ~€50-100

**Option 2: IP Camera**
- Any IP camera with HTTP snapshot endpoint
- Recommended: Reolink E1 Pro or similar
- Cost: ~€50-80

**Option 3: ESP32-CAM**
- ESP32-CAM development board
- Supports up to 2MP (1600x1200)
- WiFi built-in
- Cost: ~€10-15

### For Video Generation

**FFmpeg** (already included)
- Installed via npm package `fluent-ffmpeg`
- Requires ffmpeg binary (auto-installed on most systems)

**Manual Installation (if needed):**
- **Windows:** Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- **macOS:** `brew install ffmpeg`
- **Linux:** `sudo apt-get install ffmpeg`

## Performance Considerations

### Capture Storage
- **JPEG Quality 90:** ~1-3 MB per capture
- **1 capture every 10 minutes:** ~144 captures/day = ~288 MB/day
- **30-day grow:** ~8.6 GB for captures

### Video Generation
- **400 captures @ 30 FPS:** ~13 second video
- **Encoding time:** ~1-5 minutes (depends on CPU)
- **Final video size:** ~50-200 MB (1080p, H.264)

### Recommendations
- **Capture Interval:** 10-30 minutes (balance between smoothness and storage)
- **Auto-Cleanup:** Enable with 30-60 day retention
- **Video Resolution:** 1080p for quality, 720p for smaller files
- **FPS:** 30 FPS for smooth playback, 24 FPS for cinematic feel

## Troubleshooting

### Issue: FFmpeg not found
```
Error: Cannot find ffmpeg
```

**Solution:**
1. Install ffmpeg: `npm install @ffmpeg-installer/ffmpeg`
2. Or install system-wide (see Hardware Requirements)

### Issue: Video generation fails
```
Status: failed
Error: Frame list empty
```

**Solution:**
- Ensure captures exist in date range
- Check file permissions on timelapse directory
- Verify captures aren't soft-deleted (`isDeleted: false`)

### Issue: Placeholder images instead of real captures
This is expected in development without camera hardware.

**Solution:**
- Connect USB webcam or IP camera
- Implement camera integration (see Camera Integration section)
- Update `timelapseService.captureSnapshot()` method

### Issue: Large storage usage
```
Total Storage: 25.6 GB
```

**Solution:**
1. Run manual cleanup: POST `/timelapse/cleanup`
2. Reduce capture interval
3. Enable auto-cleanup in config
4. Lower capture quality/resolution

## Usage Examples

### Example 1: Daily Automated Timelapse

**Setup:**
```bash
# .env
TIMELAPSE_ENABLED=true
TIMELAPSE_INTERVAL="0 * * * *"  # Every hour
TIMELAPSE_AUTO_CLEANUP=true
TIMELAPSE_CLEANUP_DAYS=7
```

**Result:**
- 24 captures per day
- Auto-cleanup after 7 days
- ~168 captures total at any time

### Example 2: Full Grow Cycle Video

**Scenario:** 90-day grow, 30-minute intervals

**Captures:**
- 48 captures/day × 90 days = 4,320 captures
- Storage: ~8.6 GB

**Video Generation:**
```bash
curl -X POST http://localhost:3000/api/timelapse/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Full Grow Cycle - Strain XYZ",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-04-01T00:00:00.000Z",
    "fps": 30,
    "resolution": { "width": 1920, "height": 1080 },
    "format": "mp4",
    "codec": "h264"
  }'
```

**Result:**
- 4,320 frames @ 30 FPS = 144 second video (2m 24s)
- 1 day of growth = 1.6 seconds in video
- Final file size: ~250 MB

### Example 3: High-Quality Showcase Video

**Settings:**
- Resolution: 3840x2160 (4K)
- FPS: 60
- Codec: h265 (HEVC)
- Quality: CRF 18 (high quality)

**Trade-offs:**
- Larger file size (~2-3× H.264)
- Longer encoding time (~3-5× H.264)
- Better quality and compression
- Smaller final size than H.264 at same quality

## Best Practices

### Capture Strategy
1. **Consistent Lighting:** Use timer-controlled grow lights for consistent appearance
2. **Fixed Camera Position:** Mount camera securely to avoid frame shifts
3. **Optimal Interval:** 10-30 minutes balances smoothness and storage
4. **Phase Tagging:** Tag captures with growth phase for easy filtering

### Video Production
1. **Date Range:** Select complete growth phases for coherent videos
2. **FPS Selection:**
   - 24 FPS: Cinematic, smooth
   - 30 FPS: Standard, natural
   - 60 FPS: Ultra-smooth (for slow-motion effects)
3. **Resolution:** Match your camera's native resolution
4. **Codec:** H.264 for compatibility, H.265 for better compression

### Storage Management
1. **Enable Auto-Cleanup:** Prevents unbounded growth
2. **Regular Monitoring:** Check statistics dashboard
3. **Video Archival:** Download and archive completed videos
4. **Capture Deletion:** Delete unused captures after video generation

## Future Enhancements

### Planned Features
1. **Stabilization:** Digital image stabilization for shaky footage
2. **Transitions:** Fade/crossfade between captures
3. **Watermarks:** Add custom watermark to videos
4. **Color Correction:** Auto color-correction for consistent appearance
5. **Music Integration:** Add background music to videos
6. **Cloud Storage:** Upload to S3/Cloudinary
7. **Sharing:** Direct sharing to social media
8. **Live Preview:** Real-time camera preview in UI
9. **Multiple Cameras:** Support for multiple grow spaces
10. **AI Analysis:** Detect plant growth milestones

### Community Contributions Welcome!
- Camera integration implementations
- Video effect plugins
- UI improvements
- Performance optimizations

## Testing Results

✅ **Backend:**
- All API endpoints functional
- FFmpeg video generation working
- Cron scheduling implemented
- Database models tested
- File serving operational

✅ **Frontend:**
- All components rendering correctly
- Gallery view with thumbnails
- Video player with progress tracking
- Settings panel functional
- Navigation integrated

⚠️ **Known Limitations:**
- Placeholder images (no real camera integration yet)
- FFmpeg must be installed system-wide for video generation
- Processing is CPU-intensive (no GPU acceleration yet)

## Resources

### Documentation
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [fluent-ffmpeg NPM](https://www.npmjs.com/package/fluent-ffmpeg)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [node-cron](https://www.npmjs.com/package/node-cron)

### Hardware
- [ESP32-CAM Guide](https://randomnerdtutorials.com/esp32-cam-take-photo-save-microsd-card/)
- [USB Webcam with Node.js](https://www.npmjs.com/package/node-webcam)
- [IP Camera Integration](https://github.com/agershun/webcamjs)

---

**Last Updated:** 2025-01-02
**Version:** 1.0.0
**Status:** ✅ Complete (Software Ready, Hardware Integration Pending)
