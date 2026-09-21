"""Reproduce reload timing on a separate loopback listener; never changes live Nginx."""
import pathlib
import subprocess
import time
import urllib.request
import urllib.error

stage = pathlib.Path(__file__).resolve().parent
config = stage / 'reload-check.conf'
pid = stage / 'reload-check.pid'
prefix = f'pid {pid}; error_log stderr; events {{}} http {{ access_log off; server {{ listen 127.0.0.1:18444; '
nginx = ['/usr/sbin/nginx', '-e', 'stderr', '-c', str(config)]

def response():
    try:
        with urllib.request.urlopen('http://127.0.0.1:18444/', timeout=3) as result:
            return result.status
    except urllib.error.HTTPError as error:
        return error.code

config.write_text(prefix + 'location / { return 404; } } }')
subprocess.run(nginx, check=True)
try:
    time.sleep(0.2)
    print('Before reload:', response(), flush=True)
    config.write_text(prefix + 'location / { return 200 "ready"; } } }')
    subprocess.run(nginx + ['-s', 'reload'], check=True)
    print('Immediately after reload:', response(), flush=True)
    ready = False
    for attempt in range(20):
        if response() == 200:
            ready = True
            break
        time.sleep(0.5)
    assert ready, 'New workers did not become ready'
    print('Readiness check: PASS', flush=True)
finally:
    subprocess.run(nginx + ['-s', 'quit'], check=True)
