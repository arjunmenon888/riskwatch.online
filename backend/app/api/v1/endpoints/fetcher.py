# filepath: backend/app/api/v1/endpoints/fetcher.py
from fastapi import APIRouter, WebSocket, Depends, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
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
    """
    WebSocket endpoint to stream the progress of the news fetching service.
    
    Authentication is performed via a JWT token sent as the first message
    over the WebSocket connection.
    """
    await websocket.accept()
    
    # 1. Authenticate and authorize the user from the token
    try:
        token = await websocket.receive_text()
        current_user = await deps.get_current_user(db=db, token=token)
        if current_user.role != Role.SUPERADMIN:
            await websocket.close(code=4003, reason="Insufficient permissions")
            return
    except Exception as e:
        await websocket.close(code=4001, reason=f"Authentication failed: {e}")
        return

    # 2. Instantiate the service and start streaming updates.
    # The service no longer takes parameters like 'limit' or 'custom_sites'
    # as it now reads its configuration from the database.
    service = NewsFetcherService(db=db, superadmin=current_user)
    
    try:
        async for status_update in service.run():
            # Send each progress update to the client as a JSON string
            await websocket.send_text(status_update.model_dump_json())
            if status_update.is_complete:
                break
    except WebSocketDisconnect:
        print("Client disconnected during fetch process.")
    except Exception as e:
        # If an unhandled error occurs in the service, send a final error message
        error_message = {
            "stage": "Critical Error", 
            "progress": 100, 
            "message": f"An unexpected error occurred: {str(e)}", 
            "is_complete": True
        }
        await websocket.send_text(json.dumps(error_message))
    finally:
        # Ensure the connection is always closed gracefully
        await websocket.close()