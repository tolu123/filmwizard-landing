#!/usr/bin/env python3
"""Local preview server for dist/ with a save endpoint for the on-page text editor.

Run:  python3 serve.py        then open http://localhost:8080
Edits made with the page's "Edit text" button are written back into dist/index.html.
Only listens on 127.0.0.1, so nothing outside this machine can write to the files.
"""
import html
import http.server
import json
import os
import shutil
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, 'dist')
PAGE = os.path.join(DIST, 'index.html')
PORT = int(os.environ.get('PORT', 8080))


def variants(s):
    # The browser re-serialises markup, so try the forms the source file is likely to use.
    out = [s, s.replace('&amp;', '&'), s.replace('&nbsp;', ' '), html.unescape(s)]
    seen = []
    for v in out:
        if v not in seen:
            seen.append(v)
    return seen


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIST, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path != '/__edit/save':
            self.send_error(404)
            return
        try:
            changes = json.loads(self.rfile.read(int(self.headers['Content-Length'])))['changes']
        except Exception:
            self.send_error(400, 'bad payload')
            return
        src = open(PAGE, encoding='utf-8').read()
        saved, failed = 0, []
        for c in changes:
            old, new = c.get('from', ''), c.get('to', '')
            for v in variants(old):
                if v and src.count(v) == 1:
                    src = src.replace(v, new, 1)
                    saved += 1
                    break
            else:
                failed.append(html.unescape(old)[:60])
        if saved:
            os.makedirs(os.path.join(ROOT, '.edit-backups'), exist_ok=True)
            shutil.copy(PAGE, os.path.join(ROOT, '.edit-backups', time.strftime('index-%Y%m%d-%H%M%S.html')))
            open(PAGE, 'w', encoding='utf-8').write(src)
        body = json.dumps({'saved': saved, 'failed': failed}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    print(f'Serving {DIST} on http://localhost:{PORT}  (on-page editing enabled)')
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
