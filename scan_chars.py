import os

base_dir = r'c:\Users\ahmed\OneDrive\Documents\GitHub\website\src\content\articles'

print("--- Article Folders Raw ---")
for entry in os.scandir(base_dir):
    if entry.is_dir():
        print(f"Folder: {entry.name!r} | Hex: {entry.name.encode('utf-8').hex()}")
        mdx_path = os.path.join(entry.path, 'index.mdx')
        if os.path.exists(mdx_path):
            with open(mdx_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                for line in lines:
                    if line.startswith('title:'):
                        print(f"  Title Line: {line!r} | Hex: {line.encode('utf-8').hex()}")
                        break
