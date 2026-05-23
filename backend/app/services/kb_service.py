import os
import requests
import chromadb
from PyPDF2 import PdfReader

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# TODO: schimba cu settings când e gata
CHROMA_COLLECTION = "electric_castle"
RAG_SCRIPT_URL = "http://localhost:8001/ingest"

chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection(CHROMA_COLLECTION)

async def process_document(url: str, filename: str) -> str:

    response = requests.get(url)
    local_path = os.path.join(UPLOAD_DIR, filename)
    with open(local_path, "wb") as f:
        f.write(response.content)
    
    # TODO: trimite la scriptul colegului când e gata
    # requests.post(RAG_SCRIPT_URL, files={"file": open(local_path, "rb")})
    
    return local_path