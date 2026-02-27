import os
import re

base_dir = r'c:\Users\ahmed\OneDrive\Documents\GitHub\website\src\content\articles'

for entry in os.scandir(base_dir):
    if entry.is_dir():
        mdx_path = os.path.join(entry.path, 'index.mdx')
        if os.path.exists(mdx_path):
            with open(mdx_path, 'rb') as f:
                content = f.read()
                # Find title line in bytes
                match = re.search(rb'title:([^\n\r]*)', content)
                if match:
                    title_bytes = match.group(1)
                    print(f"File: {entry.name} | Title Bytes: {title_bytes!r} | Hex: {title_bytes.hex()}")
