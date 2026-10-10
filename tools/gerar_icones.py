"""Gera icons/icon-192.png e icons/icon-512.png (fundo roxo, 🎭 desenhado com formas simples)."""
from pathlib import Path
from PIL import Image, ImageDraw

ROXO = (109, 40, 217)
CORES = [(21, 128, 61), (217, 119, 6), (220, 38, 38)]


def icone(tamanho: int) -> Image.Image:
    img = Image.new("RGB", (tamanho, tamanho), ROXO)
    d = ImageDraw.Draw(img)
    u = tamanho / 100
    # rosto (dentro da zona segura de 80% para ícone maskable)
    d.ellipse([28 * u, 22 * u, 72 * u, 66 * u], fill=(255, 255, 255))
    d.ellipse([38 * u, 36 * u, 45 * u, 43 * u], fill=ROXO)
    d.ellipse([55 * u, 36 * u, 62 * u, 43 * u], fill=ROXO)
    d.arc([39 * u, 40 * u, 61 * u, 58 * u], 20, 160, fill=ROXO, width=max(2, int(3 * u)))
    # três pontos = fácil / médio / difícil
    for i, cor in enumerate(CORES):
        cx = (38 + i * 12) * u
        d.ellipse([cx - 4 * u, 72 * u, cx + 4 * u, 80 * u], fill=cor)
    return img


if __name__ == "__main__":
    pasta = Path(__file__).resolve().parent.parent / "icons"
    pasta.mkdir(exist_ok=True)
    for t in (192, 512):
        icone(t).save(pasta / f"icon-{t}.png")
