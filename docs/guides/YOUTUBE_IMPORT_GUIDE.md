# YouTube Music Import Feature

## Overview
The import page now supports importing music from YouTube videos and playlists directly into your `songs.json` database.

## Features

### 1. Single Video Import
- Paste a YouTube video URL
- Automatically extracts:
  - **Title**: Parsed from the video title
  - **Artist**: Extracted from the channel name or parsed from title
  - **URL**: Full YouTube video URL
  - **Type**: Defaults to "OST"
- Saves directly to `data/songs.json`
- Prevents duplicates (updates existing entries)

### 2. Playlist Import
- Paste a YouTube playlist URL
- Detects playlist and tracks metadata in `data/playlists.json`
- Provides instructions for manual video extraction
- **Note**: Automatic playlist import requires YouTube Data API key (not yet implemented)

## Usage

### Import a Video
1. Navigate to the **Import** page
2. Scroll to the **YouTube Music Import** section
3. Paste a YouTube video URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
4. The type indicator will show "✓ Video (ID: VIDEO_ID)"
5. Click **Import**
6. The video metadata will be extracted and saved to `songs.json`

### Import a Playlist
1. Navigate to the **Import** page
2. Scroll to the **YouTube Music Import** section
3. Paste a YouTube playlist URL (e.g., `https://www.youtube.com/playlist?list=PLAYLIST_ID`)
4. The type indicator will show "✓ Playlist (ID: PLAYLIST_ID)"
5. Click **Import**
6. Follow the instructions to manually extract video URLs
7. Playlist metadata is saved to `playlists.json`

### Supported URL Formats
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID` (playlist)
- `https://www.youtube.com/playlist?list=PLAYLIST_ID`

## Technical Details

### Files Created/Modified
- **`js/youtubeImportService.js`**: Service for YouTube data extraction
- **`index.html`**: Added YouTube import UI section
- **`js/app.js`**: Wired up event handlers for YouTube import
- **`server.py`**: Added `/save-songs` and `/save-playlists` endpoints
- **`data/playlists.json`**: Tracks playlist metadata

### Data Structures

#### Song Entry (songs.json)
```json
{
  "title": "Song Title",
  "artist": "Artist Name",
  "youtube": "https://www.youtube.com/watch?v=VIDEO_ID",
  "autoplay": true,
  "type": "OST"
}
```

#### Playlist Entry (playlists.json)
```json
{
  "playlistId": "PLAYLIST_ID",
  "playlistName": "Playlist Name",
  "playlistUrl": "https://www.youtube.com/playlist?list=PLAYLIST_ID",
  "videoCount": 0,
  "videoIds": [],
  "dateAdded": "2025-11-07T12:00:00.000Z",
  "lastUpdated": "2025-11-07T12:00:00.000Z"
}
```

### API Used
- **YouTube oEmbed API**: Used for extracting video metadata without requiring API key
  - Endpoint: `https://www.youtube.com/oembed`
  - Returns: Video title and channel name
  - Limitations: Single video only, no playlist support

### Title Parsing Logic
The service attempts to intelligently parse the artist and title from the YouTube video title using common patterns:
1. **"Artist - Title"**: Splits on dash/hyphen
2. **"Title by Artist"**: Splits on "by"
3. **"Title (Artist)"**: Extracts artist from parentheses
4. **Fallback**: Uses channel name as artist, full title as title

## Future Enhancements

### YouTube Data API Integration
To support automatic playlist import, implement YouTube Data API v3:

1. **Get API Key**: https://console.cloud.google.com/apis/credentials
2. **Enable YouTube Data API v3**
3. **Add API key to configuration**
4. **Update `youtubeImportService.js`** to use:
   - `GET https://www.googleapis.com/youtube/v3/playlists?part=snippet&id={PLAYLIST_ID}&key={API_KEY}`
   - `GET https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId={PLAYLIST_ID}&key={API_KEY}`

### Batch Import
- Import multiple videos at once from a list of URLs
- Bulk process playlist videos

### Metadata Enhancement
- Fetch video duration
- Extract video thumbnail
- Add tags/categories
- Custom type selection (OP, ED, Insert, Character Song, etc.)

### Playlist Management UI
- View all imported playlists
- Re-sync playlists to get new videos
- Edit playlist metadata
- Associate playlists with anime shows

## Download Functions
- **Download Songs JSON**: Export current songs database
- **Download Playlists JSON**: Export playlist metadata

## Testing
1. Start the server: `python server.py`
2. Navigate to http://localhost:8000
3. Go to the Import page
4. Try importing a YouTube video
5. Check `data/songs.json` for the new entry

## Error Handling
- Invalid URLs show "✗ Invalid URL" indicator
- Network errors display in the import log
- Duplicate videos update existing entries
- Server errors are caught and displayed to the user
