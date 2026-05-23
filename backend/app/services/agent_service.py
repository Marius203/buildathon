async def get_agent_response(message: str, session_id: str) -> tuple[str, bool]:
    # TODO: inlocuieste cu call la RAG
    # return await call_rag_api(message)
    
    response = "Acesta este un răspuns mock. RAG-ul nu este conectat încă."
    answered = False
    return response, answered