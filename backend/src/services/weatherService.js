// Node.js 18+ hat natives fetch() - kein Import nötig

// OpenWeather API Config
const API_KEY = process.env.OPENWEATHER_API_KEY || 'demo-key'; // Benutzer muss eigenen Key in .env setzen
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

class WeatherService {
  /**
   * Holt aktuelles Wetter für eine Stadt
   */
  async getCurrentWeather(city = 'Munich', country = 'DE') {
    try {
      const url = `${API_BASE_URL}/weather?q=${city},${country}&appid=${API_KEY}&units=metric&lang=de`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('⚠️ OpenWeather API Key ungültig - verwende Mock-Daten');
          return this.getMockWeather(city);
        }
        throw new Error(`Weather API Error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        location: {
          city: data.name,
          country: data.sys.country,
          coordinates: {
            lat: data.coord.lat,
            lon: data.coord.lon
          }
        },
        current: {
          temp: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          tempMin: Math.round(data.main.temp_min),
          tempMax: Math.round(data.main.temp_max),
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          cloudiness: data.clouds.all,
          visibility: data.visibility,
          windSpeed: data.wind.speed,
          windDirection: data.wind.deg,
          sunrise: new Date(data.sys.sunrise * 1000),
          sunset: new Date(data.sys.sunset * 1000)
        },
        timestamp: new Date(data.dt * 1000)
      };
    } catch (error) {
      console.error('❌ Fehler beim Abrufen des Wetters:', error.message);
      // Fallback zu Mock-Daten
      return this.getMockWeather(city);
    }
  }

  /**
   * Holt Wettervorhersage für 5 Tage
   */
  async getForecast(city = 'Munich', country = 'DE', days = 5) {
    try {
      const url = `${API_BASE_URL}/forecast?q=${city},${country}&appid=${API_KEY}&units=metric&lang=de`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('⚠️ OpenWeather API Key ungültig - verwende Mock-Daten');
          return this.getMockForecast(city, days);
        }
        throw new Error(`Forecast API Error: ${response.statusText}`);
      }

      const data = await response.json();

      // Gruppiere Vorhersagen nach Tag
      const dailyForecasts = this.groupForecastsByDay(data.list);

      return {
        location: {
          city: data.city.name,
          country: data.city.country,
          coordinates: {
            lat: data.city.coord.lat,
            lon: data.city.coord.lon
          }
        },
        forecast: dailyForecasts.slice(0, days)
      };
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Vorhersage:', error.message);
      return this.getMockForecast(city, days);
    }
  }

  /**
   * Gruppiert 3-Stunden-Vorhersagen zu Tages-Vorhersagen
   */
  groupForecastsByDay(forecastList) {
    const dailyData = {};

    forecastList.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString('de-DE');

      if (!dailyData[date]) {
        dailyData[date] = {
          date: new Date(item.dt * 1000),
          temps: [],
          humidity: [],
          descriptions: [],
          icons: [],
          rain: 0
        };
      }

      dailyData[date].temps.push(item.main.temp);
      dailyData[date].humidity.push(item.main.humidity);
      dailyData[date].descriptions.push(item.weather[0].description);
      dailyData[date].icons.push(item.weather[0].icon);

      if (item.rain && item.rain['3h']) {
        dailyData[date].rain += item.rain['3h'];
      }
    });

    // Konvertiere zu Array und berechne Durchschnitte
    return Object.values(dailyData).map(day => ({
      date: day.date,
      tempMin: Math.round(Math.min(...day.temps)),
      tempMax: Math.round(Math.max(...day.temps)),
      tempAvg: Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length),
      humidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
      description: this.getMostFrequent(day.descriptions),
      icon: this.getMostFrequent(day.icons),
      rain: Math.round(day.rain * 10) / 10
    }));
  }

  /**
   * Holt das häufigste Element aus einem Array
   */
  getMostFrequent(arr) {
    const frequency = {};
    let maxFreq = 0;
    let mostFrequent = arr[0];

    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
      if (frequency[item] > maxFreq) {
        maxFreq = frequency[item];
        mostFrequent = item;
      }
    });

    return mostFrequent;
  }

  /**
   * Gibt Wetter-basierte Empfehlungen für Indoor Growing
   */
  getGrowingRecommendations(weather, indoorTemp, indoorHumidity) {
    const recommendations = [];

    // Außen-Temperatur vs Innen
    const tempDiff = weather.current.temp - indoorTemp;

    if (tempDiff > 10) {
      recommendations.push({
        type: 'warning',
        category: 'temperature',
        message: 'Außentemperatur ist deutlich höher als Innentemperatur. Lüftung könnte kontraproduktiv sein.',
        action: 'Klimaanlage in Betracht ziehen'
      });
    } else if (tempDiff < -5) {
      recommendations.push({
        type: 'info',
        category: 'temperature',
        message: 'Kühle Außentemperaturen - ideal zum Lüften und Kühlen',
        action: 'Nutze Frischluft-Zufuhr'
      });
    }

    // Luftfeuchtigkeit-Vergleich
    const humidityDiff = weather.current.humidity - indoorHumidity;

    if (humidityDiff > 20 && indoorHumidity < 60) {
      recommendations.push({
        type: 'info',
        category: 'humidity',
        message: 'Außenluft ist feuchter - Lüften könnte Luftfeuchtigkeit erhöhen',
        action: 'Kurzes Lüften in Erwägung ziehen'
      });
    }

    // Sonnenaufgang/Sonnenuntergang für Lichtplanung
    const now = new Date();
    const sunrise = weather.current.sunrise;
    const sunset = weather.current.sunset;
    const dayLength = (sunset - sunrise) / 1000 / 60 / 60; // in Stunden

    recommendations.push({
      type: 'info',
      category: 'light',
      message: `Natürliche Tageslänge: ${dayLength.toFixed(1)} Stunden`,
      action: 'Lichtzyklen an Jahreszeit anpassen'
    });

    // Luftdruck-Hinweis
    if (weather.current.pressure < 1000) {
      recommendations.push({
        type: 'info',
        category: 'pressure',
        message: 'Niedriger Luftdruck - Pflanzen können langsamer transpirieren',
        action: 'VPD-Werte im Auge behalten'
      });
    }

    return recommendations;
  }

  /**
   * Mock-Daten wenn API nicht verfügbar ist
   */
  getMockWeather(city) {
    console.log('📍 Verwende Mock-Wetter für', city);
    return {
      location: {
        city: city,
        country: 'DE',
        coordinates: { lat: 48.1351, lon: 11.5820 }
      },
      current: {
        temp: 22,
        feelsLike: 21,
        tempMin: 18,
        tempMax: 25,
        humidity: 65,
        pressure: 1013,
        description: 'Teils bewölkt',
        icon: '02d',
        cloudiness: 40,
        visibility: 10000,
        windSpeed: 3.5,
        windDirection: 180,
        sunrise: new Date(Date.now() - 6 * 60 * 60 * 1000),
        sunset: new Date(Date.now() + 8 * 60 * 60 * 1000)
      },
      timestamp: new Date(),
      isMock: true
    };
  }

  /**
   * Mock-Vorhersage
   */
  getMockForecast(city, days) {
    const forecast = [];
    const baseTemp = 20;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      forecast.push({
        date,
        tempMin: baseTemp - 3 + Math.random() * 2,
        tempMax: baseTemp + 5 + Math.random() * 3,
        tempAvg: baseTemp + Math.random() * 2,
        humidity: 60 + Math.random() * 20,
        description: ['Sonnig', 'Teils bewölkt', 'Bewölkt', 'Leichter Regen'][Math.floor(Math.random() * 4)],
        icon: ['01d', '02d', '03d', '10d'][Math.floor(Math.random() * 4)],
        rain: Math.random() < 0.3 ? Math.random() * 5 : 0
      });
    }

    return {
      location: {
        city,
        country: 'DE',
        coordinates: { lat: 48.1351, lon: 11.5820 }
      },
      forecast,
      isMock: true
    };
  }
}

module.exports = new WeatherService();
