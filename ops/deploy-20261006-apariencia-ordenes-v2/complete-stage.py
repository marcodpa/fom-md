"""Reutiliza archivos idénticos del paquete anterior; verifica el paquete final."""
from pathlib import Path
import hashlib
import shutil

stage = Path('/home/fomadmin/deploy-20261006-apariencia-ordenes-v2').resolve()
previous = Path('/home/fomadmin/deploy-20261006-apariencia-ordenes').resolve()
for line in (stage / 'SHA256SUMS').read_text().splitlines():
    expected, relative = line.split('  ', 1)
    target = (stage / relative).resolve()
    source = (previous / relative).resolve()
    if not target.is_relative_to(stage) or not source.is_relative_to(previous):
        raise ValueError('Ruta fuera del paquete')
    if not target.exists():
        if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
            raise ValueError(f'No coincide: {relative}')
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    if hashlib.sha256(target.read_bytes()).hexdigest() != expected:
        raise ValueError(f'Paquete final inválido: {relative}')
print('FINAL_PACKAGE_VERIFIED')
