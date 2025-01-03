# serializers.py

from rest_framework import serializers
from .models import Trade

class TradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trade
        fields = ['symbol', 'entry_dt', 'exit_dt', 'entry_price_0', 'qty_0', 'entry_price_1', 'qty_1', 'exit_type', 'profit_loss', 'fees', 'status', 'exit_price_0', 'exit_price_1']
