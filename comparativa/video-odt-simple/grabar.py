# Graba odt-simple.html fotograma a fotograma con Edge (Playwright) y lo codifica a MP4 con ffmpeg.
# Uso: python grabar.py            -> odt-simple.mp4
#      python grabar.py 3 18.5 26  -> solo capturas sueltas (PNG) en ./revision para revisar
import sys, subprocess, pathlib
from playwright.sync_api import sync_playwright
aqui = pathlib.Path(__file__).parent.resolve()
url = (aqui/'odt-simple.html').as_uri() + '?capture=1'
FPS = 30
with sync_playwright() as p:
    nav = p.chromium.launch(channel='msedge')
    pag = nav.new_page(viewport={'width':1080,'height':1920}, device_scale_factor=1)
    pag.goto(url); pag.wait_for_function('window.READY === true')
    errores = []
    pag.on('pageerror', lambda e: errores.append(str(e)))
    if len(sys.argv) > 1:
        out = aqui/'revision'; out.mkdir(exist_ok=True)
        for a in sys.argv[1:]:
            pag.evaluate(f'render({float(a)})')
            pag.screenshot(path=str(out/f't{float(a):05.1f}.png'))
    else:
        total = pag.evaluate('window.TOTAL'); n = int(round(total*FPS))
        ff = subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(FPS),'-c:v','mjpeg','-i','-',
            '-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-r',str(FPS),'-movflags','+faststart',str(aqui/'odt-simple.mp4')], stdin=subprocess.PIPE)
        for i in range(n):
            pag.evaluate(f'render({i/FPS})')
            ff.stdin.write(pag.screenshot(type='jpeg', quality=95))
            if i % 300 == 0: print(i, '/', n, flush=True)
        ff.stdin.close(); ff.wait()
    print('errores:', errores)
    nav.close()
