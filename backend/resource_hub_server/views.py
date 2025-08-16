from aquilify.shortcuts import render
from datetime import datetime, timezone

from api.auth.registerauth_hub import connection

# Define all your views here.

async def homeview() -> None:
    
    update_doc = {
        "$set": {
            "otp.isVerified": True,
            "otp.isUsed": True,
            "otp.usedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "status.isEmailVerified": True,
            "timestamps.updatedAt": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"), 
        }
    }

    query = await connection.shallowuserregistration.update(
        {"email": "pawan94vip@gmail.com"},
        update_doc
    )
    return "Query executed successfully" if query.acknowledged else "Query failed"