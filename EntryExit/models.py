from django.db import models

class Trade(models.Model):
    symbol = models.CharField(max_length=20)
    entry_dt = models.DateTimeField()
    exit_dt = models.DateTimeField()
    position_size = models.FloatField()
    entry_price_0 = models.FloatField()
    qty_0 = models.FloatField()
    entry_price_1 = models.FloatField()
    qty_1 = models.FloatField()
    exit_type = models.CharField(max_length=10)
    profit_loss = models.FloatField()
    fees = models.FloatField()
    status = models.CharField(max_length=10)
    exit_price_0 = models.FloatField()
    exit_price_1 = models.FloatField()
