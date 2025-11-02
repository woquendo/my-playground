from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import urllib.parse
import json
import os
from urllib.error import URLError

class MALProxyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle static files
        if not self.path.startswith('/proxy'):
            return SimpleHTTPRequestHandler.do_GET(self)
        
        # Handle proxy requests
        try:
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
                
                # Save to schedule_updates.json
                updates_file = os.path.join(os.path.dirname(__file__), 'data', 'schedule_updates.json')
                with open(updates_file, 'w', encoding='utf-8') as f:
                    json.dump(updates_data, f, indent=2)
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode())
                
            except Exception as e:
                self.send_error(500, f"Error saving schedule updates: {str(e)}")
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