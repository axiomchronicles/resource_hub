from axiomelectrus import Electrus

client = Electrus()
database = client["resource_hub_db"]

# Collection for user registrations
shallowuserregistration = database["shallow_user_registration"]   
usercollection = database["resource_hub_user_collection"]

# user collection logs
usercollectionlogs = database["resource_hub_user_collection_logs"]

# user collection metadata
usercollectionmetadata = database["resource_hub_user_collection_metadata"]