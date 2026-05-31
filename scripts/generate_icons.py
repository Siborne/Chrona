"""Resize logo.png into Tauri icon sizes + .ico file."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent  # scripts/ -> project root
SRC = ROOT / "public" / "logo.png"
OUT = ROOT / "src-tauri" / "icons"

SIZES = {
    "32x32.png":       (32, 32),
    "128x128.png":     (128, 128),
    "128x128@2x.png":  (256, 256),
    "icon.png":        (256, 256),  # tray icon, larger for HiDPI
}

def main():
    img = Image.open(SRC).convert("RGBA")
    print(f"Source: {SRC} ({img.size[0]}x{img.size[1]})")

    OUT.mkdir(parents=True, exist_ok=True)

    for name, size in SIZES.items():
        resized = img.resize(size, Image.LANCZOS)
        path = OUT / name
        resized.save(path, "PNG")
        print(f"  {name}: {size[0]}x{size[1]}")

    # Generate .ico with multiple sizes
    ico_path = OUT / "icon.ico"
    ico_sizes = [(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)]
    img.save(ico_path, format="ICO", sizes=ico_sizes)
    print(f"  icon.ico: {ico_sizes}")

    print("\nDone. All icons generated.")

if __name__ == "__main__":
    main()
