from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import urllib.parse
import json
import os
from urllib.error import URLError

class MALProxyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle proxy requests first
        if self.path.startswith('/proxy'):
            return self._handle_proxy()
        
        # Handle YouTube playlist scraping
        if self.path.startswith('/scrape-playlist'):
            return self._handle_playlist_scrape()
        
        # Handle static files and SPA routing
        return self._handle_spa_routing()
    
    def _handle_spa_routing(self):
        """Handle SPA routing - serve app.html for client-side routes"""
        # Parse the path
        parsed_path = urllib.parse.urlparse(self.path).path
        
        # List of SPA routes that should serve app.html
        spa_routes = ['/schedule', '/shows', '/music', '/import']
        
        # Check if this is a client-side route
        if parsed_path in spa_routes:
            # Serve app.html for SPA routes
            self.path = '/app.html'
            return SimpleHTTPRequestHandler.do_GET(self)
        
        # Check if file exists (for static assets like CSS, JS, JSON, images)
        file_path = self.translate_path(self.path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            # Serve the static file
            return SimpleHTTPRequestHandler.do_GET(self)
        
        # If no file exists and not a known route, try serving app.html for any other path
        # This allows for future routes without server restart
        if not parsed_path.startswith('/data/') and not os.path.splitext(parsed_path)[1]:
            self.path = '/app.html'
            return SimpleHTTPRequestHandler.do_GET(self)
        
        # Otherwise, let the default handler return 404
        return SimpleHTTPRequestHandler.do_GET(self)
    
    def _handle_proxy(self):
        """Handle proxy requests to MyAnimeList"""
        try:
            if self.path.startswith('/proxy-anime'):
                # Parse the anime id from the query
                params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
                anime_id = params.get('id', [''])[0]
                
                if not anime_id:
                    self.send_error(400, "Missing anime id parameter")
                    return
                
                # Fetch the MAL anime page
                url = f"https://myanimelist.net/anime/{anime_id}"
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                req = urllib.request.Request(url, headers=headers)
                
                with urllib.request.urlopen(req) as response:
                    html = response.read().decode('utf-8')
                    
                    # Send response headers
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    # Return the HTML content
                    self.wfile.write(json.dumps({'html': html}).encode())
                    
            elif self.path.startswith('/proxy'):
                # Parse the username and status from the query
                params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
                username = params.get('username', [''])[0]
                status = params.get('status', ['1'])[0]
                
                if not username:
                    self.send_error(400, "Missing username parameter")
                    return
                
                # Fetch the MAL page
                url = f"https://myanimelist.net/animelist/{urllib.parse.quote(username)}?status={status}"
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                req = urllib.request.Request(url, headers=headers)
                
                with urllib.request.urlopen(req) as response:
                    html = response.read().decode('utf-8')
                    
                    # Send response headers
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    # Return the HTML content
                    self.wfile.write(json.dumps({'html': html}).encode())
                    
        except URLError as e:
            self.send_error(500, f"Error fetching MAL page: {str(e)}")
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")

    def _handle_playlist_scrape(self):
        """Scrape YouTube playlist to extract video IDs"""
        import re
        
        try:
            # Parse the playlist id from the query
            params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            playlist_id = params.get('id', [''])[0]
            
            if not playlist_id:
                self.send_error(400, "Missing playlist id parameter")
                return
            
            # Fetch the YouTube playlist page
            url = f"https://www.youtube.com/playlist?list={playlist_id}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
            req = urllib.request.Request(url, headers=headers)
            
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode('utf-8')
                
                # Extract playlist name from meta tags or title
                playlist_name = playlist_id
                title_match = re.search(r'<title>(.+?)</title>', html)
                if title_match:
                    playlist_name = title_match.group(1).replace(' - YouTube', '').strip()
                
                # Extract video IDs from the HTML
                # YouTube embeds video data in the initial data
                video_ids = []
                
                # Method 1: Look for videoId in the ytInitialData
                video_id_pattern = r'"videoId":"([a-zA-Z0-9_-]{11})"'
                matches = re.findall(video_id_pattern, html)
                
                # Remove duplicates while preserving order
                seen = set()
                for video_id in matches:
                    if video_id not in seen:
                        seen.add(video_id)
                        video_ids.append(video_id)
                
                # Limit to reasonable number to avoid issues
                video_ids = video_ids[:100]
                
                # Send response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                result = {
                    'success': True,
                    'playlistId': playlist_id,
                    'playlistName': playlist_name,
                    'videoIds': video_ids,
                    'videoCount': len(video_ids)
                }
                
                self.wfile.write(json.dumps(result).encode())
                
        except URLError as e:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': f"Failed to fetch playlist: {str(e)}"
            }).encode())
        except Exception as e:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': f"Server error: {str(e)}"
            }).encode())

    def do_POST(self):
        # Handle saving shows
        if self.path == '/save-shows':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                shows_data = json.loads(post_data.decode('utf-8'))
                
                # Save to shows.json
                shows_file = os.path.join(os.path.dirname(__file__), 'data', 'shows.json')
                with open(shows_file, 'w', encoding='utf-8') as f:
                    json.dump({'shows': shows_data}, f, indent=2)
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode())
                
            except Exception as e:
                self.send_error(500, f"Error saving shows: {str(e)}")
        elif self.path == '/save-schedule-updates':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                updates_data = json.loads(post_data.decode('utf-8'))
                
                print(f"Saving schedule updates: {updates_data}")
                
                # Save to schedule_updates.json
                updates_file = os.path.join(os.path.dirname(__file__), 'data', 'schedule_updates.json')
                with open(updates_file, 'w', encoding='utf-8') as f:
                    json.dump(updates_data, f, indent=2)
                
                print(f"Saved to {updates_file}")
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode())
                
            except Exception as e:
                print(f"Error saving schedule updates: {str(e)}")
                self.send_error(500, f"Error saving schedule updates: {str(e)}")
        elif self.path == '/save-titles':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                titles_data = json.loads(post_data.decode('utf-8'))
                
                # Save to titles.json
                titles_file = os.path.join(os.path.dirname(__file__), 'data', 'titles.json')
                with open(titles_file, 'w', encoding='utf-8') as f:
                    json.dump(titles_data, f, indent=2)
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode())
                
            except Exception as e:
                self.send_error(500, f"Error saving titles: {str(e)}")
        elif self.path == '/save-songs':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                songs_data = json.loads(post_data.decode('utf-8'))
                
                # Save to songs.json
                songs_file = os.path.join(os.path.dirname(__file__), 'data', 'songs.json')
                with open(songs_file, 'w', encoding='utf-8') as f:
                    json.dump({'songs': songs_data}, f, indent=2)
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode())
                
            except Exception as e:
                self.send_error(500, f"Error saving songs: {str(e)}")
        elif self.path == '/save-playlists':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                playlists_data = json.loads(post_data.decode('utf-8'))
                
                # Save to playlists.json
                playlists_file = os.path.join(os.path.dirname(__file__), 'data', 'playlists.json')
                with open(playlists_file, 'w', encoding='utf-8') as f:
                    json.dump({'playlists': playlists_data}, f, indent=2)
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode())
                
            except Exception as e:
                self.send_error(500, f"Error saving playlists: {str(e)}")
        else:
            self.send_error(404, "Not found")

    def do_OPTIONS(self):
        # Handle CORS preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, MALProxyHandler)
    print("Starting server on port 8000...")
    httpd.serve_forever()