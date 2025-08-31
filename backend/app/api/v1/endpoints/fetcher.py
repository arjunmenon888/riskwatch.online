from fastapi import APIRouter, WebSocket, Depends, WebSocketDisconnect, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.api import deps
from app.models.user import User, Role
from app.services.news_fetcher_service import NewsFetcherService

router = APIRouter()

@router.websocket("/fetch-news")
async def fetch_news_stream(
    websocket: WebSocket,
    db: AsyncSession = Depends(deps.get_db),
):
    await websocket.accept()
    
    # 1. Authenticate and authorize the user from the token sent as the first message
    try:
        token = await websocket.receive_text()
        current_user = await deps.get_current_user(db=db, token=token)
        if current_user.role != Role.SUPERADMIN:
            await websocket.close(code=4003, reason="Insufficient permissions")
            return
    except Exception as e:
        await websocket.close(code=4001, reason=f"Authentication failed: {e}")
        return

    # 2. Wait for the fetch command
    try:
        data = await websocket.receive_json()
        limit = data.get("limit", 10)
        custom_sites = data.get("custom_sites", [])
    except json.JSONDecodeError:
        await websocket.send_text(json.dumps({"error": "Invalid command format."}))
        await websocket.close()
        return

    # 3. Start the service and stream updates
    service = NewsFetcherService(db=db, limit=limit, custom_sites=custom_sites, superadmin=current_user)
    try:
        async for status_update in service.run():
            await websocket.send_text(status_update.model_dump_json())
            if status_update.is_complete:
                break
    except WebSocketDisconnect:
        print("Client disconnected during fetch process.")
    except Exception as e:
        error_message = {"stage": "Critical Error", "progress": 100, "message": str(e), "is_complete": True}
        await websocket.send_text(json.dumps(error_message))
    finally:
        await websocket.close()