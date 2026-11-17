"""buat-cadangan-csv.py - menghasilkan data-tamu.js dari data-tamu.csv.

Dipakai supaya halaman admin tetap bisa memuat data contoh walau dibuka
langsung dari file (file://), karena fetch() diblokir browser pada file://.

Jalankan dari folder proyek (butuh Python):
    python alat\\buat-cadangan-csv.py
"""
import json
import os

AKAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
csv_path = os.path.join(AKAR, "data-tamu.csv")
js_path = os.path.join(AKAR, "data-tamu.js")

isi = open(csv_path, encoding="utf-8").read().strip()

js = (
    "/* data-tamu.js - CADANGAN isi data-tamu.csv.\n"
    "   Dibuat otomatis dari data-tamu.csv. Dipakai hanya kalau fetch() gagal,\n"
    "   misalnya saat admin.html dibuka langsung dengan klik dua kali (file://).\n"
    "   Kalau isi CSV berubah, jalankan ulang: python alat/buat-cadangan-csv.py */\n"
    "window.DATA_TAMU_CSV = " + json.dumps(isi, ensure_ascii=False) + ";\n"
)

open(js_path, "w", encoding="utf-8").write(js)
print("dibuat:", js_path)
print("baris data:", isi.count("\n"))