from transutil import syncbit

class Names(syncbit.Schema):
    """
    Schema for names used in the authentication system.
    """
    first_name: str = syncbit.fields.String(required=True, extras = {"description": "The first name of the user."})
    last_name: str = syncbit.fields.String(required=True, extras = {"description": "The last name of the user."})

class User(syncbit.Schema):
    """
    Schema for user details in the authentication system.
    """
    email: str = syncbit.fields.String(required=True, extras = {"description": "The email address of the user."})
    password: str = syncbit.fields.String(required=True, extras = {"description": "The password for the user account."})
    names: Names = syncbit.fields.Object(Names, required=True, extras = {"description": "The names of the user."})