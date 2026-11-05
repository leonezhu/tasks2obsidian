#!/usr/bin/env python3
"""生成扩展图标: 16/48/128 圆角紫底白菱形(与OLO风格一致)"""
import struct, zlib, os

def make_png(size, path):
    s = size
    radius = max(2, s // 5)
    pixels = []
    for y in range(s):
        row = []
        for x in range(s):
            corner = False
            for cx, cy in [(radius, radius), (s - radius, radius), (radius, s - radius), (s - radius, s - radius)]:
                if (x < radius and y < radius) or (x >= s - radius and y < radius) or \
                   (x < radius and y >= s - radius) or (x >= s - radius and y >= s - radius):
                    if (x - cx) ** 2 + (y - cy) ** 2 > radius ** 2:
                        corner = True
                        break
            mid = s // 2
            d = abs(x - mid) + abs(y - mid)
            if not corner and d < s // 3:
                row += [255, 255, 255, 255]
            elif corner:
                row += [0, 0, 0, 0]
            else:
                row += [124, 58, 237, 255]
        pixels.append(bytes(row))
    raw = b''.join(b'\x00' + p for p in pixels)

    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', s, s, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

base = os.path.dirname(os.path.abspath(__file__))
icons = os.path.join(base, 'icons')
os.makedirs(icons, exist_ok=True)
for size, name in [(16, 'icon16.png'), (48, 'icon48.png'), (128, 'icon128.png')]:
    make_png(size, os.path.join(icons, name))
print('icons ok:', os.listdir(icons))
