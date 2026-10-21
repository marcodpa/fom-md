# Arma odt-simple.html (autónomo) a partir de odt-simple.src.html, incrustando Spline Sans.
import base64, pathlib, sys
aqui = pathlib.Path(__file__).parent
fuentes = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(r'C:\Users\home\Downloads\fom-driver-juan\node_modules\@expo-google-fonts\spline-sans')
css = ''
for peso, nombre in [(400,'400Regular'),(500,'500Medium'),(600,'600SemiBold'),(700,'700Bold')]:
    b = base64.b64encode((fuentes/nombre/f'SplineSans_{nombre}.ttf').read_bytes()).decode()
    css += f"@font-face{{font-family:'Spline Sans';font-weight:{peso};font-style:normal;src:url(data:font/ttf;base64,{b}) format('truetype')}}\n"
src = (aqui/'odt-simple.src.html').read_text(encoding='utf-8')
(aqui/'odt-simple.html').write_text(src.replace('/*FONTS*/', css), encoding='utf-8')
print('ok', len(css))
