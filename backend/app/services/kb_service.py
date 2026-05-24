import os
import httpx
from app.config import settings

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

AGENT_URL = "http://localhost:8000"


async def upload_to_uploadthing(file_content: bytes, filename: str, file_type: str) -> str:
    async with httpx.AsyncClient() as client:
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
        upload_url = prepare_data["url"]
        file_key = prepare_data["key"]

        files = {"file": (filename, file_content, file_type)}
        upload_response = await client.put(upload_url, files=files)
        if upload_response.status_code not in (200, 201, 204):
            raise Exception(f"Upload failed: {upload_response.text}")

        return f"https://{settings.UPLOADTHING_APP_ID}.ufs.sh/f/{file_key}"


def _extract_text(file_content: bytes, filename: str, file_type: str) -> str:
    """Extrage text din PDF, DOCX sau TXT."""
    try:
        if file_type == "application/pdf":
            import pypdf
            import io
            reader = pypdf.PdfReader(io.BytesIO(file_content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)

        elif file_type in (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ):
            import docx
            import io
            doc = docx.Document(io.BytesIO(file_content))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

        elif file_type in ("text/plain", "text/markdown"):
            return file_content.decode("utf-8", errors="ignore")

    except Exception as e:
        print(f"[kb_service] text extraction failed for {filename}: {e}")

    return ""


async def _send_to_agent(text: str, filename: str) -> dict:
    """Trimite textul extras la agentul de ingestie."""
    if not text.strip():
        return {"chunks_added": 0, "skipped": True, "reason": "no text extracted"}
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                f"{AGENT_URL}/ingest",
                json={"text": text, "filename": filename, "lang": "en"},
            )
            r.raise_for_status()
            return r.json()
    except Exception as e:
        print(f"[kb_service] agent ingest failed: {e}")
        return {"chunks_added": 0, "error": str(e)}


async def process_document(file_content: bytes, filename: str) -> str:
    # 1. Upload la Uploadthing
    url = await upload_to_uploadthing(file_content, filename, "application/pdf")

    # 2. Extrage textul
    text = _extract_text(file_content, filename, "application/pdf")

    # 3. Trimite la agent pentru ingestie in Chroma
    result = await _send_to_agent(text, filename)
    print(f"[kb_service] ingest result: {result}")

    return url


async def process_text_file(file_content: bytes, filename: str, file_type: str) -> str:
    # 1. Upload la Uploadthing
    url = await upload_to_uploadthing(file_content, filename, file_type)

    # 2. Extrage textul
    text = _extract_text(file_content, filename, file_type)

    # 3. Trimite la agent
    result = await _send_to_agent(text, filename)
    print(f"[kb_service] ingest result: {result}")

    return url


async def process_image(file_content: bytes, filename: str, file_type: str) -> str:
    return await upload_to_uploadthing(file_content, filename, file_type)