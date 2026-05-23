import os
import httpx
import chromadb
from app.config import settings

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

CHROMA_COLLECTION = "electric_castle"
RAG_SCRIPT_URL = "http://localhost:8001/ingest"

chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection(CHROMA_COLLECTION)

import os
import httpx
import chromadb
from app.config import settings

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

CHROMA_COLLECTION = "electric_castle"
RAG_SCRIPT_URL = "http://localhost:8001/ingest"

chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection(CHROMA_COLLECTION)

async def upload_to_uploadthing(file_content: bytes, filename: str, file_type: str) -> str:
    async with httpx.AsyncClient() as client:
        # Step 1: prepareUpload
        prepare_response = await client.post(
            "https://api.uploadthing.com/v7/prepareUpload",
            headers={
                "x-uploadthing-api-key": settings.UPLOADTHING_SECRET,
                "x-uploadthing-version": "6.4.0",
            },
            json={
                "fileName": filename,
                "fileSize": len(file_content),
                "fileType": file_type,
                "acl": "public-read",
                "contentDisposition": "inline"
            }
        )
        prepare_data = prepare_response.json()
        print("prepareUpload response:", prepare_data)

        upload_url = prepare_data["url"]
        file_key = prepare_data["key"]

        # Step 2: upload cu FormData
        files = {"file": (filename, file_content, file_type)}
        upload_response = await client.put(upload_url, files=files)
        print("upload response status:", upload_response.status_code)
        print("upload response body:", upload_response.text)

        if upload_response.status_code not in (200, 201, 204):
            raise Exception(f"Upload failed: {upload_response.text}")

        file_url = f"https://{settings.UPLOADTHING_APP_ID}.ufs.sh/f/{file_key}"
        return file_url

async def process_document(file_content: bytes, filename: str) -> str:
    url = await upload_to_uploadthing(file_content, filename, "application/pdf")

    local_path = os.path.join(UPLOAD_DIR, filename)
    with open(local_path, "wb") as f:
        f.write(file_content)

    # TODO: trimite la scriptul colegului când e gata
    # async with httpx.AsyncClient() as client:
    #     await client.post(RAG_SCRIPT_URL, files={"file": open(local_path, "rb")})

    return url

async def process_image(file_content: bytes, filename: str, file_type: str) -> str:
    return await upload_to_uploadthing(file_content, filename, file_type)

async def process_document(file_content: bytes, filename: str) -> str:
    # Upload pe UploadThing
    url = await upload_to_uploadthing(
        file_content, filename, "application/pdf"
    )

    # Salvează local temporar
    local_path = os.path.join(UPLOAD_DIR, filename)
    with open(local_path, "wb") as f:
        f.write(file_content)

    # TODO: trimite la scriptul colegului când e gata
    # async with httpx.AsyncClient() as client:
    #     await client.post(RAG_SCRIPT_URL, files={"file": open(local_path, "rb")})

    return url

async def process_image(file_content: bytes, filename: str, file_type: str) -> str:
    url = await upload_to_uploadthing(
        file_content, filename, file_type, settings.UPLOADTHING_BUCKET_IMAGES
    )
    return url