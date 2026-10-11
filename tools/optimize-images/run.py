"""One-off: make small WebP copies of the big images in Supabase storage.
Output goes to public/img/opt/ (served by Cloudflare), named by content hash."""
import hashlib, io, json, pathlib, urllib.request
from PIL import Image

BASE = "https://qztnndbhauzawchfhcui.supabase.co/storage/v1/object/public/public-files/"
COVERS = "0a778aff_ae17aa519_BaSchTThEthiopiaTmVng.png|0b0edfac_6bc47b198_BaCodexEthiopiaPhn0.png|1d4480d2_5239b0a4d_BaSchTThEthiopiaTmVng.png|33202244_69cf9ea3a_BaCodexEthiopiaTmVngLngLy.png|33b3d34c_4a1f83485_BaCodexEthiopiaPhn1.png|42ab44e0_3353fc117_BaMtinEthiopiaPhn3.png|4be55da0_20b827501_nhChatGPT22_57_1630thg92026.png|8bfbe9d0_87ff1aac8_The-Ethiopian-Canon_Study-Circle-Guide.png|95b8bbf9_ea334c58f_BaCodexEthiopiaTmVngLngLy.png|9ad17052_5cdc77183_The-Book-of-Enoch_Study-Circle-Guide.png|9ad98fc2_941b62d35_BaSchTThEthiopiaTmVng.png|9d5c92f0_12c387f74_BaCodexEthiopiaTmVngLngLy.png|a60429f1_56be0ea3b_BaSchTThEthiopiaTmVng.png|a8556ba6_e94c10fcc_ethiopian-canon-study-circle-guide-cover.jpg|ace9760f_6508b3491_BaSchTThEthiopiaTmVng.png|b38a1ed8_96fa410ee_nhChatGPT15_33_244thg102026.png|bd178d56_e277cd0ab_BaCodexEthiopiaTmVngLngLy.png|cdc7400b_5a9436721_ThnhKinhEthiopia_Phn2.png|d33adeda_9f28c8e79_The-Book-of-Enoch.png|ebdd22b0_16d11ffc7_BaEthiopianCanonPhn4.png|f0825945_3753c7ac9_BaCodexEthiopiaTmVngLngLy.png|f562a60f_40d5809b6_The-Book-of-Enoch_Study-Circle-Guide.png"
WIDES = "29729528_3791339aa_generated_image.png|430bf94b_3791339aa_generated_image.png|4e8f99aa_e78d2b614_generated_image.png|6297ba03_a24bcc603_generated_image.png|a7e1846c_e78d2b614_generated_image.png|d97ea2b6_e78d2b614_generated_image.png|da8b3669_a24bcc603_generated_image.png|f4cedee3_d5ecf4330_ChatGPTImageMay11202610_04_51PM.png|458e9bae_b6f3b85c0_generated_image.png"

out = pathlib.Path("public/img/opt")
out.mkdir(parents=True, exist_ok=True)
mapping = {}
for names, max_w in ((COVERS, 640), (WIDES, 1600)):
    for name in names.split("|"):
        data = urllib.request.urlopen(BASE + name, timeout=60).read()
        target = out / f"{hashlib.sha256(data).hexdigest()[:12]}-{max_w}.webp"
        if not target.exists():
            img = Image.open(io.BytesIO(data))
            img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
            if img.width > max_w:
                img = img.resize((max_w, round(img.height * max_w / img.width)), Image.LANCZOS)
            img.save(target, "WEBP", quality=80, method=6)
        mapping[name] = f"img/opt/{target.name}"
        print(name, len(data), "->", target.name, target.stat().st_size)
pathlib.Path("tools/optimize-images/map.json").write_text(json.dumps(mapping, indent=1))
