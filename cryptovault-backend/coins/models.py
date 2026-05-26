from django.db import models


class Coin(models.Model):
    """
    All prices stored in USD.
    INR conversion = current_price_usd * usd_to_inr_rate
    usd_to_inr_rate is refreshed from exchangerate-api every time prices update.
    """
    coingecko_id = models.CharField(max_length=100, unique=True)
    symbol       = models.CharField(max_length=20)
    name         = models.CharField(max_length=100)
    image_url    = models.URLField(blank=True)
    is_active    = models.BooleanField(default=True)

    # USD prices — the only stored prices
    current_price_usd    = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    price_change_24h_pct = models.DecimalField(max_digits=8,  decimal_places=2, default=0)
    price_change_24h_usd = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    market_cap_usd       = models.DecimalField(max_digits=30, decimal_places=2, default=0)
    volume_24h_usd       = models.DecimalField(max_digits=30, decimal_places=2, default=0)
    high_24h_usd         = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    low_24h_usd          = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    circulating_supply   = models.DecimalField(max_digits=30, decimal_places=2, default=0)

    # Live USD→INR rate — updated with every price refresh
    usd_to_inr_rate = models.DecimalField(max_digits=10, decimal_places=4, default=83.5)

    last_updated = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-market_cap_usd']

    def __str__(self):
        return f'{self.name} ({self.symbol})'

    @property
    def current_price_inr(self):
        """Computed on the fly — never stored"""
        return round(float(self.current_price_usd) * float(self.usd_to_inr_rate), 2)