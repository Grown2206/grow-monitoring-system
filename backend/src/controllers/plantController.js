const Plant = require('../models/Plant');

// Alle Pflanzen holen
const getPlants = async (req, res) => {
  try {
    // Sortiert nach Slot ID (1-6)
    const plants = await Plant.find().sort({ slotId: 1 });
    res.json(plants);
  } catch (error) {
    console.error("Fehler in getPlants:", error);
    res.status(500).json({ message: "Konnte Pflanzen nicht laden", error: error.message });
  }
};

// Pflanze aktualisieren
const updatePlant = async (req, res) => {
  try {
    const { slotId } = req.params;
    const updateData = req.body;

    const updatedPlant = await Plant.findOneAndUpdate(
      { slotId: parseInt(slotId) },
      updateData,
      { new: true, upsert: true } // Erstellt Pflanze, falls sie noch nicht existiert
    );

    res.json(updatedPlant);
  } catch (error) {
    console.error("Fehler in updatePlant:", error);
    res.status(500).json({ message: "Update fehlgeschlagen", error: error.message });
  }
};

module.exports = {
  getPlants,
  updatePlant
};