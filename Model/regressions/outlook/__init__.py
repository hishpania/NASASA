"""scikit-learn style 12-month outlooks: below, near or above normal.

Only variables whose forecasts beat chance in the 2010-2026 backtest have an
estimator; precipitation and solar radiation had no skill at any lead. See
README.md.
"""

from outlook import data
from outlook import models

fetch_region = data.fetch_region
Region = data.Region
Outlook = models.Outlook
AirTemperature = models.AirTemperature
RelativeHumidity = models.RelativeHumidity
RootZoneSoilWetness = models.RootZoneSoilWetness
