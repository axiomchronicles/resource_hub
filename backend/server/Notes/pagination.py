from rest_framework.pagination import LimitOffsetPagination

class TwelveDefaultLimitPagination(LimitOffsetPagination):
    default_limit = 12
    max_limit = 100
