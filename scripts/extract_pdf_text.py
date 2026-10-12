"""Optional, local-only PDF text cache. Install pypdf; OCR needs pdftoppm and tesseract."""
import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path


def extract(source, cache):
    from pypdf import PdfReader
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    cache.mkdir(parents=True, exist_ok=True)
    text_path, meta_path = cache / (digest + '.txt'), cache / (digest + '.json')
    if text_path.exists() and meta_path.exists():
        return {'status': 'cached', 'sha256': digest, 'text': str(text_path)}
    reader, pages, methods, unresolved = PdfReader(source), [], [], []
    for number, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ''
        method = 'text-layer'
        if len(text.strip()) < 30:
            if shutil.which('pdftoppm') and shutil.which('tesseract'):
                with tempfile.TemporaryDirectory(prefix='canvas-pdf-') as tmp:
                    image = Path(tmp) / 'page'
                    try:
                        subprocess.run(['pdftoppm', '-f', str(number), '-l', str(number), '-singlefile', '-r', '180', '-png', str(source), str(image)], check=True, capture_output=True, timeout=120)
                        result = subprocess.run(['tesseract', str(image) + '.png', 'stdout'], check=True, capture_output=True, text=True, timeout=120)
                        if len(result.stdout.strip()) > len(text.strip()):
                            text, method = result.stdout, 'ocr'
                    except (subprocess.SubprocessError, OSError):
                        method = 'unverified'
            else:
                method = 'unverified'
            if method == 'unverified' or len(text.strip()) < 30:
                unresolved.append(number)
        pages.append(f'===== PAGE {number} =====\n{text}')
        methods.append(method)
    text_path.write_text('\n\n'.join(pages), encoding='utf-8')
    meta_path.write_text(json.dumps({'sha256': digest, 'filename': source.name, 'page_methods': methods, 'unverified_pages': unresolved}, indent=2), encoding='utf-8')
    return {'status': 'extracted', 'sha256': digest, 'text': str(text_path), 'unverified_pages': unresolved}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--cache', type=Path, default=Path('.local/pdf-text'))
    args = parser.parse_args()
    print(json.dumps(extract(args.pdf, args.cache), ensure_ascii=False))
