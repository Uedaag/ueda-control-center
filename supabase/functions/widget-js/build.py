#!/usr/bin/env python3
"""Rebuild runtime.ts from runtime.js so the edge function bundles the source."""
import base64, pathlib
here = pathlib.Path(__file__).parent
src = (here / 'runtime.js').read_text(encoding='utf-8')
b64 = base64.b64encode(src.encode('utf-8')).decode('ascii')
chunks = [b64[i:i+120] for i in range(0, len(b64), 120)]
out = ['// AUTO-GENERATED from runtime.js — do not edit by hand.',
       '// Regenerate: python3 supabase/functions/widget-js/build.py',
       'const B64 = [']
for c in chunks: out.append(f'  "{c}",')
out += ['].join("");',
        'const bin = atob(B64);',
        'const bytes = new Uint8Array(bin.length);',
        'for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);',
        'export default new TextDecoder().decode(bytes);',
        '']
(here / 'runtime.ts').write_text('\n'.join(out), encoding='utf-8')
print('runtime.ts updated', len(src), 'source bytes')
