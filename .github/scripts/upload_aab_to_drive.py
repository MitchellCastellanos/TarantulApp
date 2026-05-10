#!/usr/bin/env python3
"""Sube el .aab del build a una carpeta de Google Drive (cuenta de servicio)."""
from __future__ import annotations

import glob
import json
import os
import sys


def main() -> None:
    folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "").strip()
    raw = os.environ.get("GOOGLE_CREDENTIALS_JSON", "").strip()
    pattern = os.environ.get(
        "AAB_GLOB",
        "frontend/android/app/build/outputs/bundle/release/*.aab",
    )
    if not folder_id or not raw:
        print(
            "Faltan GOOGLE_DRIVE_FOLDER_ID o GOOGLE_CREDENTIALS_JSON",
            file=sys.stderr,
        )
        sys.exit(1)
    paths = sorted(glob.glob(pattern))
    if not paths:
        print(f"No hay AAB en {pattern}", file=sys.stderr)
        sys.exit(1)
    path = paths[-1]

    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    scopes = ["https://www.googleapis.com/auth/drive.file"]
    info = json.loads(raw)
    creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
    service = build("drive", "v3", credentials=creds, cache_discovery=False)
    name = os.path.basename(path)
    meta = {"name": name, "parents": [folder_id]}
    media = MediaFileUpload(path, resumable=True)
    created = (
        service.files()
        .create(
            body=meta,
            media_body=media,
            fields="id,name",
            supportsAllDrives=True,
        )
        .execute()
    )
    print(f"Drive OK: {created.get('name')} id={created.get('id')}")


if __name__ == "__main__":
    main()
