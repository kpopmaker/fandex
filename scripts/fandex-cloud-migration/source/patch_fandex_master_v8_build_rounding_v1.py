from pathlib import Path


TARGET = Path("fandex_master_v8_build_v1.py")
BACKUP = Path("fandex_master_v8_build_v1_before_rounding_fix.py")


old = """        rolling_point = round(
            rolling_map[
                artist
            ][
                "rollingPoint"
            ],
            2,
        )

        lastfm_contribution = round(
            rolling_point
            * LASTFM_SCALE,
            2,
        )
"""

new = """        rolling_raw = safe_float(
            rolling_map[
                artist
            ][
                "rollingPoint"
            ]
        )

        rolling_point = round(
            rolling_raw,
            2,
        )

        lastfm_contribution = round(
            rolling_raw
            * LASTFM_SCALE,
            2,
        )
"""


text = TARGET.read_text(
    encoding="utf-8"
)

if old not in text:
    raise RuntimeError(
        "Target block not found. "
        "No file was modified."
    )

BACKUP.write_text(
    text,
    encoding="utf-8"
)

patched = text.replace(
    old,
    new,
    1
)

TARGET.write_text(
    patched,
    encoding="utf-8"
)

print("PATCH OK")
print(f"target: {TARGET}")
print(f"backup: {BACKUP}")
print("calculation: raw rolling * scale -> round")
print("baseMasterModified: FALSE")
print("websiteModified: FALSE")