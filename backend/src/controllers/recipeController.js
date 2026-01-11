const GrowRecipe = require('../models/GrowRecipe');

/**
 * Holt alle Grow-Rezepte
 */
exports.getAll = async (req, res) => {
  try {
    const { type, difficulty, isTemplate } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (isTemplate !== undefined) filter.isTemplate = isTemplate === 'true';

    const recipes = await GrowRecipe.find(filter).sort({ uses: -1, createdAt: -1 });

    res.json({
      success: true,
      count: recipes.length,
      data: recipes
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Rezepte:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Rezepte'
    });
  }
};

/**
 * Holt ein einzelnes Rezept
 */
exports.getById = async (req, res) => {
  try {
    const recipe = await GrowRecipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Rezept nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: recipe
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Rezepts:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Rezepts'
    });
  }
};

/**
 * Erstellt ein neues Rezept
 */
exports.create = async (req, res) => {
  try {
    const recipeData = req.body;

    // Berechne Total Duration
    if (recipeData.phases && recipeData.phases.length > 0) {
      recipeData.totalDuration = recipeData.phases.reduce(
        (sum, phase) => sum + (phase.duration || 0),
        0
      );
    }

    const recipe = new GrowRecipe(recipeData);
    await recipe.save();

    res.status(201).json({
      success: true,
      message: 'Rezept erfolgreich erstellt',
      data: recipe
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Rezepts:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen des Rezepts'
    });
  }
};

/**
 * Aktualisiert ein Rezept
 */
exports.update = async (req, res) => {
  try {
    const recipeData = req.body;

    // Berechne Total Duration neu
    if (recipeData.phases && recipeData.phases.length > 0) {
      recipeData.totalDuration = recipeData.phases.reduce(
        (sum, phase) => sum + (phase.duration || 0),
        0
      );
    }

    const recipe = await GrowRecipe.findByIdAndUpdate(
      req.params.id,
      recipeData,
      { new: true, runValidators: true }
    );

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Rezept nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Rezept erfolgreich aktualisiert',
      data: recipe
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Rezepts:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Rezepts'
    });
  }
};

/**
 * Löscht ein Rezept
 */
exports.delete = async (req, res) => {
  try {
    const recipe = await GrowRecipe.findByIdAndDelete(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Rezept nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Rezept erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Rezepts:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Rezepts'
    });
  }
};

/**
 * Verwendet ein Rezept (erhöht den Zähler)
 */
exports.use = async (req, res) => {
  try {
    const recipe = await GrowRecipe.findByIdAndUpdate(
      req.params.id,
      { $inc: { uses: 1 } },
      { new: true }
    );

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Rezept nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Rezept wird verwendet',
      data: recipe
    });
  } catch (error) {
    console.error('Fehler beim Verwenden des Rezepts:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Verwenden des Rezepts'
    });
  }
};

/**
 * Like/Unlike ein Rezept
 */
exports.like = async (req, res) => {
  try {
    const { unlike } = req.body;
    const increment = unlike ? -1 : 1;

    const recipe = await GrowRecipe.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: increment } },
      { new: true }
    );

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Rezept nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: recipe
    });
  } catch (error) {
    console.error('Fehler beim Liken des Rezepts:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Liken des Rezepts'
    });
  }
};

/**
 * Klont ein bestehendes Rezept
 */
exports.clone = async (req, res) => {
  try {
    const originalRecipe = await GrowRecipe.findById(req.params.id).lean();

    if (!originalRecipe) {
      return res.status(404).json({
        success: false,
        error: 'Rezept nicht gefunden'
      });
    }

    // Entferne MongoDB _id und erstelle Klon
    delete originalRecipe._id;
    delete originalRecipe.createdAt;
    delete originalRecipe.updatedAt;

    const clonedRecipe = new GrowRecipe({
      ...originalRecipe,
      name: `${originalRecipe.name} (Kopie)`,
      clonedFrom: req.params.id,
      isTemplate: false,
      likes: 0,
      uses: 0
    });

    await clonedRecipe.save();

    res.status(201).json({
      success: true,
      message: 'Rezept erfolgreich geklont',
      data: clonedRecipe
    });
  } catch (error) {
    console.error('Fehler beim Klonen des Rezepts:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Klonen des Rezepts'
    });
  }
};

/**
 * Exportiert ein Rezept als JSON
 */
exports.exportRecipe = async (req, res) => {
  try {
    const recipe = await GrowRecipe.findById(req.params.id).lean();

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Rezept nicht gefunden'
      });
    }

    // Entferne MongoDB-spezifische Felder
    delete recipe._id;
    delete recipe.__v;
    delete recipe.createdAt;
    delete recipe.updatedAt;
    delete recipe.likes;
    delete recipe.uses;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${recipe.name.replace(/[^a-z0-9]/gi, '_')}.json"`);
    res.json(recipe);
  } catch (error) {
    console.error('Fehler beim Exportieren des Rezepts:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Exportieren des Rezepts'
    });
  }
};

/**
 * Importiert ein Rezept aus JSON
 */
exports.importRecipe = async (req, res) => {
  try {
    const recipeData = req.body;

    // Validiere Pflichtfelder
    if (!recipeData.name || !recipeData.phases || recipeData.phases.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Ungültiges Rezept-Format: Name und mindestens eine Phase erforderlich'
      });
    }

    // Berechne Total Duration
    recipeData.totalDuration = recipeData.phases.reduce(
      (sum, phase) => sum + (phase.duration || 0),
      0
    );

    // Setze Import-Flag
    recipeData.isTemplate = false;
    recipeData.likes = 0;
    recipeData.uses = 0;

    const recipe = new GrowRecipe(recipeData);
    await recipe.save();

    res.status(201).json({
      success: true,
      message: 'Rezept erfolgreich importiert',
      data: recipe
    });
  } catch (error) {
    console.error('Fehler beim Importieren des Rezepts:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Importieren des Rezepts: ' + error.message
    });
  }
};

/**
 * Toggle Favorit
 */
exports.toggleFavorite = async (req, res) => {
  try {
    const recipe = await GrowRecipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Rezept nicht gefunden'
      });
    }

    recipe.isFavorite = !recipe.isFavorite;
    await recipe.save();

    res.json({
      success: true,
      message: recipe.isFavorite ? 'Zu Favoriten hinzugefügt' : 'Von Favoriten entfernt',
      data: recipe
    });
  } catch (error) {
    console.error('Fehler beim Favorisieren:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Favorisieren'
    });
  }
};

/**
 * Initialisiert vordefinierte Rezept-Templates
 */
exports.initializeTemplates = async () => {
  try {
    // Prüfe ob Templates bereits existieren
    const existingTemplates = await GrowRecipe.countDocuments({ isTemplate: true });

    if (existingTemplates > 0) {
      console.log(`✅ ${existingTemplates} Rezept-Templates bereits vorhanden`);
      return;
    }

    const templates = [
      {
        name: 'Standard Photoperiode (Indica-dominant)',
        type: 'Indica',
        difficulty: 'Anfänger',
        description: 'Klassisches Rezept für Indica-dominante Photoperioden-Pflanzen. Ideal für Anfänger.',
        isTemplate: true,
        yieldEstimate: { min: 400, max: 600, unit: 'g/m²' },
        tags: ['indoor', 'photoperiode', 'anfänger'],
        phases: [
          {
            name: 'Keimling',
            duration: 7,
            lightHours: 18,
            tempDay: { min: 20, target: 24, max: 26 },
            tempNight: { min: 18, target: 20, max: 22 },
            humidity: { min: 65, target: 70, max: 80 },
            vpd: { min: 0.4, target: 0.6, max: 0.8 },
            ec: { min: 0, target: 0.4, max: 0.8 },
            ph: { min: 5.8, target: 6.0, max: 6.5 },
            wateringInterval: 24,
            description: 'Sanfter Start mit hoher Luftfeuchtigkeit',
            tips: ['Schonend gießen', 'Nicht überdüngen', 'Ausreichend Licht aber nicht zu intensiv']
          },
          {
            name: 'Vegetation',
            duration: 28,
            lightHours: 18,
            tempDay: { min: 22, target: 26, max: 28 },
            tempNight: { min: 18, target: 20, max: 22 },
            humidity: { min: 55, target: 60, max: 70 },
            vpd: { min: 0.8, target: 1.0, max: 1.2 },
            ec: { min: 0.8, target: 1.4, max: 1.8 },
            ph: { min: 5.8, target: 6.0, max: 6.5 },
            wateringInterval: 48,
            description: 'Kräftiges Wachstum aufbauen',
            tips: ['LST Training anwenden', 'Regelmäßig düngen', 'Luftzirkulation sicherstellen']
          },
          {
            name: 'Blüte',
            duration: 56,
            lightHours: 12,
            tempDay: { min: 20, target: 24, max: 26 },
            tempNight: { min: 16, target: 18, max: 20 },
            humidity: { min: 40, target: 50, max: 55 },
            vpd: { min: 1.0, target: 1.2, max: 1.4 },
            ec: { min: 1.4, target: 1.8, max: 2.2 },
            ph: { min: 6.0, target: 6.2, max: 6.5 },
            wateringInterval: 48,
            description: 'Blütenbildung und Reifung',
            tips: ['Luftfeuchtigkeit senken', 'Auf Schimmel achten', 'Letzte 2 Wochen nur Wasser']
          },
          {
            name: 'Spülen',
            duration: 14,
            lightHours: 12,
            tempDay: { min: 20, target: 22, max: 24 },
            tempNight: { min: 16, target: 18, max: 20 },
            humidity: { min: 40, target: 45, max: 50 },
            wateringInterval: 72,
            description: 'Nährstoffe ausspülen für besseren Geschmack',
            tips: ['Nur reines Wasser geben', 'Auf Trichome achten']
          }
        ]
      },
      {
        name: 'Autoflower Express',
        type: 'Autoflower',
        difficulty: 'Anfänger',
        description: 'Schnelles Rezept für Autoflowering-Sorten. Vom Samen bis zur Ernte in 10-12 Wochen.',
        isTemplate: true,
        yieldEstimate: { min: 50, max: 150, unit: 'g/plant' },
        tags: ['indoor', 'autoflower', 'schnell', 'anfänger'],
        phases: [
          {
            name: 'Keimling',
            duration: 7,
            lightHours: 20,
            tempDay: { min: 20, target: 24, max: 26 },
            tempNight: { min: 18, target: 20, max: 22 },
            humidity: { min: 65, target: 70, max: 80 },
            vpd: { min: 0.4, target: 0.6, max: 0.8 },
            ec: { min: 0, target: 0.4, max: 0.6 },
            ph: { min: 6.0, target: 6.2, max: 6.5 },
            wateringInterval: 24,
            description: 'Schneller Start ist wichtig',
            tips: ['20h Licht für maximales Wachstum', 'Nicht umtopfen']
          },
          {
            name: 'Vegetation',
            duration: 21,
            lightHours: 20,
            tempDay: { min: 22, target: 26, max: 28 },
            tempNight: { min: 18, target: 20, max: 22 },
            humidity: { min: 50, target: 60, max: 65 },
            vpd: { min: 0.8, target: 1.0, max: 1.2 },
            ec: { min: 0.8, target: 1.2, max: 1.6 },
            ph: { min: 6.0, target: 6.2, max: 6.5 },
            wateringInterval: 48,
            description: 'Automatischer Übergang zur Blüte',
            tips: ['Kein Training nötig', 'Moderater Dünger']
          },
          {
            name: 'Blüte',
            duration: 42,
            lightHours: 20,
            tempDay: { min: 20, target: 24, max: 26 },
            tempNight: { min: 16, target: 18, max: 20 },
            humidity: { min: 40, target: 50, max: 55 },
            vpd: { min: 1.0, target: 1.2, max: 1.4 },
            ec: { min: 1.2, target: 1.6, max: 2.0 },
            ph: { min: 6.0, target: 6.2, max: 6.5 },
            wateringInterval: 48,
            description: 'Schnelle Reifung',
            tips: ['Konstantes Licht beibehalten', 'Letzte Woche spülen']
          }
        ]
      },
      {
        name: 'Sativa Langstielig',
        type: 'Sativa',
        difficulty: 'Fortgeschritten',
        description: 'Für Sativa-dominante Sorten mit längerer Blütephase. Benötigt mehr Platz und Erfahrung.',
        isTemplate: true,
        yieldEstimate: { min: 350, max: 550, unit: 'g/m²' },
        tags: ['indoor', 'photoperiode', 'sativa', 'fortgeschritten'],
        phases: [
          {
            name: 'Keimling',
            duration: 7,
            lightHours: 18,
            tempDay: { min: 22, target: 26, max: 28 },
            tempNight: { min: 20, target: 22, max: 24 },
            humidity: { min: 65, target: 70, max: 75 },
            vpd: { min: 0.4, target: 0.6, max: 0.8 },
            ec: { min: 0, target: 0.4, max: 0.8 },
            ph: { min: 5.8, target: 6.0, max: 6.5 },
            wateringInterval: 24,
            description: 'Warmer Start für Sativa',
            tips: ['Höhere Temperaturen bevorzugt']
          },
          {
            name: 'Vegetation',
            duration: 35,
            lightHours: 18,
            tempDay: { min: 24, target: 28, max: 30 },
            tempNight: { min: 20, target: 22, max: 24 },
            humidity: { min: 50, target: 60, max: 65 },
            vpd: { min: 0.8, target: 1.0, max: 1.2 },
            ec: { min: 1.0, target: 1.6, max: 2.0 },
            ph: { min: 5.8, target: 6.0, max: 6.5 },
            wateringInterval: 48,
            description: 'Längere Veg-Phase für Struktur',
            tips: ['Topping früh durchführen', 'SCROG empfohlen']
          },
          {
            name: 'Blüte',
            duration: 70,
            lightHours: 12,
            tempDay: { min: 22, target: 26, max: 28 },
            tempNight: { min: 18, target: 20, max: 22 },
            humidity: { min: 40, target: 50, max: 55 },
            vpd: { min: 1.0, target: 1.2, max: 1.5 },
            ec: { min: 1.6, target: 2.0, max: 2.4 },
            ph: { min: 6.0, target: 6.2, max: 6.5 },
            wateringInterval: 48,
            description: 'Lange Blütephase typisch für Sativa',
            tips: ['Geduld haben', 'Stretch berücksichtigen']
          },
          {
            name: 'Spülen',
            duration: 14,
            lightHours: 12,
            tempDay: { min: 20, target: 22, max: 24 },
            tempNight: { min: 16, target: 18, max: 20 },
            humidity: { min: 35, target: 40, max: 45 },
            wateringInterval: 72,
            description: 'Finale Reifung',
            tips: ['Trichome überprüfen', 'Möglichst niedrige Luftfeuchtigkeit']
          }
        ]
      }
    ];

    await GrowRecipe.insertMany(templates);
    console.log(`✅ ${templates.length} Rezept-Templates erfolgreich initialisiert`);
  } catch (error) {
    console.error('❌ Fehler beim Initialisieren der Templates:', error);
  }
};

module.exports = exports;
