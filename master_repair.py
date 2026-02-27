import os
import re
import shutil

base_content_dir = r'c:\Users\ahmed\OneDrive\Documents\GitHub\website\src\content\articles'
base_image_dir = r'c:\Users\ahmed\OneDrive\Documents\GitHub\website\src\assets\images\articles'

def delete_ghost_folders(path):
    if not os.path.exists(path):
        return
    for entry in os.scandir(path):
        if entry.is_dir() and entry.name.endswith('.'):
            # Use \\?\ for long paths and weird characters on Windows
            ghost_path = r'\\?\\' + entry.path
            print(f"Deleting ghost folder: {entry.name}")
            try:
                shutil.rmtree(ghost_path)
            except Exception as e:
                print(f"Failed to delete {entry.name}: {e}")

def fix_titles(path):
    for root, dirs, files in os.walk(path):
        if 'index.mdx' in files:
            filepath = os.path.join(root, 'index.mdx')
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Check if title: exists
            has_title = any(line.strip().startswith('title:') for line in lines)
            
            if not has_title:
                print(f"Adding missing title to: {filepath}")
                folder_name = os.path.basename(root)
                pretty_title = folder_name.replace('-', ' ').title()
                
                # Insert title: after the first ---
                new_lines = []
                inserted = False
                for line in lines:
                    new_lines.append(line)
                    if line.strip() == '---' and not inserted:
                        new_lines.append(f'title: "{pretty_title}"\n')
                        inserted = True
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.writelines(new_lines)

print("Starting Master Repair...")
delete_ghost_folders(base_content_dir)
delete_ghost_folders(base_image_dir)
fix_titles(base_content_dir)
print("Master Repair Finished.")
