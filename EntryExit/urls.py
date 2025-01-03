# urls.py

from django.urls import path
from .views import read_csv_file

urlpatterns = [
    path('', read_csv_file, name='home'),  # Map '/' to `read_csv_file` or another view
    path('api/chart-data/', read_csv_file, name='read_csv_file'),
]
