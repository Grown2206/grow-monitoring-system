const simulationService = require('../services/simulationService');
const SimulationRun = require('../models/SimulationRun');

class SimulationController {
  async runSimulation(req, res) {
    try {
      const userId = req.user?.userId;
      const {
        name,
        strain,
        strainType,
        parameters,
        growPhases,
        monteCarloRuns,
        pricePerGram
      } = req.body;

      if (!name || !strain || !strainType) {
        return res.status(400).json({
          error: 'Name, Strain und Strain-Typ sind erforderlich'
        });
      }

      const simulationParams = {
        name,
        strain,
        strainType,
        parameters: parameters || {},
        growPhases: growPhases || [],
        monteCarloRuns: monteCarloRuns || 1000,
        pricePerGram: pricePerGram || 10,
        userId
      };

      const result = await simulationService.runSimulation(simulationParams);

      res.status(201).json({
        success: true,
        message: 'Simulation erfolgreich durchgeführt',
        data: result
      });
    } catch (error) {
      console.error('Fehler bei Simulation:', error);
      res.status(500).json({
        error: 'Fehler bei der Simulation',
        details: error.message
      });
    }
  }

  async getSimulation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const simulation = await SimulationRun.findById(id);

      if (!simulation) {
        return res.status(404).json({ error: 'Simulation nicht gefunden' });
      }

      if (simulation.userId && simulation.userId.toString() !== userId?.toString() && !simulation.isPublic) {
        return res.status(403).json({ error: 'Zugriff verweigert' });
      }

      res.json({
        success: true,
        data: simulation
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Simulation:', error);
      res.status(500).json({
        error: 'Fehler beim Abrufen der Simulation',
        details: error.message
      });
    }
  }

  async getUserSimulations(req, res) {
    try {
      const userId = req.user?.userId;
      const {
        limit = 20,
        skip = 0,
        strainType,
        sortBy = 'createdAt',
        order = 'desc'
      } = req.query;

      const query = { userId };
      if (strainType) {
        query.strainType = strainType;
      }

      const sortOrder = order === 'asc' ? 1 : -1;
      const sortOptions = { [sortBy]: sortOrder };

      const [simulations, total] = await Promise.all([
        SimulationRun.find(query)
          .sort(sortOptions)
          .limit(parseInt(limit))
          .skip(parseInt(skip)),
        SimulationRun.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: simulations,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: total > parseInt(skip) + parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Simulationen:', error);
      res.status(500).json({
        error: 'Fehler beim Abrufen der Simulationen',
        details: error.message
      });
    }
  }

  async optimizeParameters(req, res) {
    try {
      const { strainType, constraints, duration } = req.body;

      if (!strainType) {
        return res.status(400).json({ error: 'Strain-Typ ist erforderlich' });
      }

      const optimization = await simulationService.optimizeParameters(
        strainType,
        constraints || {},
        duration || 90
      );

      res.json({
        success: true,
        message: 'Parameter-Optimierung erfolgreich',
        data: optimization
      });
    } catch (error) {
      console.error('Fehler bei Parameter-Optimierung:', error);
      res.status(500).json({
        error: 'Fehler bei der Parameter-Optimierung',
        details: error.message
      });
    }
  }

  async getPresets(req, res) {
    try {
      const presets = simulationService.getPresets();

      res.json({
        success: true,
        data: presets
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Presets:', error);
      res.status(500).json({
        error: 'Fehler beim Abrufen der Presets',
        details: error.message
      });
    }
  }

  async deleteSimulation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const simulation = await SimulationRun.findById(id);

      if (!simulation) {
        return res.status(404).json({ error: 'Simulation nicht gefunden' });
      }

      if (simulation.userId.toString() !== userId?.toString()) {
        return res.status(403).json({ error: 'Zugriff verweigert' });
      }

      await SimulationRun.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Simulation erfolgreich gelöscht'
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Simulation:', error);
      res.status(500).json({
        error: 'Fehler beim Löschen der Simulation',
        details: error.message
      });
    }
  }

  async updateSimulation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const { name, isPublic, tags } = req.body;

      const simulation = await SimulationRun.findById(id);

      if (!simulation) {
        return res.status(404).json({ error: 'Simulation nicht gefunden' });
      }

      if (simulation.userId.toString() !== userId?.toString()) {
        return res.status(403).json({ error: 'Zugriff verweigert' });
      }

      if (name !== undefined) simulation.name = name;
      if (isPublic !== undefined) simulation.isPublic = isPublic;
      if (tags !== undefined) simulation.tags = tags;

      await simulation.save();

      res.json({
        success: true,
        message: 'Simulation erfolgreich aktualisiert',
        data: simulation
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Simulation:', error);
      res.status(500).json({
        error: 'Fehler beim Aktualisieren der Simulation',
        details: error.message
      });
    }
  }

  async getPublicSimulations(req, res) {
    try {
      const {
        limit = 20,
        skip = 0,
        strainType,
        sortBy = 'predictions.yieldGrams.expected',
        order = 'desc'
      } = req.query;

      const query = { isPublic: true };
      if (strainType) {
        query.strainType = strainType;
      }

      const sortOrder = order === 'asc' ? 1 : -1;
      const sortOptions = { [sortBy]: sortOrder };

      const [simulations, total] = await Promise.all([
        SimulationRun.find(query)
          .sort(sortOptions)
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .select('-userId'),
        SimulationRun.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: simulations,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: total > parseInt(skip) + parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der öffentlichen Simulationen:', error);
      res.status(500).json({
        error: 'Fehler beim Abrufen der öffentlichen Simulationen',
        details: error.message
      });
    }
  }

  async compareSimulations(req, res) {
    try {
      const { ids } = req.body;
      const userId = req.user?.userId;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Simulation-IDs sind erforderlich' });
      }

      if (ids.length > 5) {
        return res.status(400).json({ error: 'Maximal 5 Simulationen können verglichen werden' });
      }

      const simulations = await SimulationRun.find({
        _id: { $in: ids },
        $or: [
          { userId },
          { isPublic: true }
        ]
      });

      if (simulations.length === 0) {
        return res.status(404).json({ error: 'Keine Simulationen gefunden' });
      }

      const comparison = {
        simulations: simulations.map(sim => ({
          id: sim._id,
          name: sim.name,
          strain: sim.strain,
          strainType: sim.strainType,
          yieldExpected: sim.predictions.yieldGrams.expected,
          yieldMin: sim.predictions.yieldGrams.min,
          yieldMax: sim.predictions.yieldGrams.max,
          totalDays: sim.predictions.totalDays,
          quality: sim.predictions.quality,
          totalCosts: sim.costs.total,
          roi: sim.roi.roiPercentage,
          yieldPerDay: sim.yieldPerDay,
          efficiencyScore: sim.efficiencyScore
        })),
        best: {
          yield: simulations.reduce((best, sim) =>
            sim.predictions.yieldGrams.expected > best.predictions.yieldGrams.expected ? sim : best
          ),
          efficiency: simulations.reduce((best, sim) =>
            sim.efficiencyScore > best.efficiencyScore ? sim : best
          ),
          roi: simulations.reduce((best, sim) =>
            sim.roi.roiPercentage > best.roi.roiPercentage ? sim : best
          ),
          quality: simulations.reduce((best, sim) =>
            sim.predictions.quality > best.predictions.quality ? sim : best
          )
        }
      };

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('Fehler beim Vergleichen der Simulationen:', error);
      res.status(500).json({
        error: 'Fehler beim Vergleichen der Simulationen',
        details: error.message
      });
    }
  }

  async getStatistics(req, res) {
    try {
      const userId = req.user?.userId;

      const stats = await SimulationRun.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalSimulations: { $sum: 1 },
            avgYield: { $avg: '$predictions.yieldGrams.expected' },
            maxYield: { $max: '$predictions.yieldGrams.expected' },
            avgQuality: { $avg: '$predictions.quality' },
            avgCosts: { $avg: '$costs.total' },
            avgROI: { $avg: '$roi.roiPercentage' },
            strainTypes: { $addToSet: '$strainType' }
          }
        }
      ]);

      const strainStats = await SimulationRun.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$strainType',
            count: { $sum: 1 },
            avgYield: { $avg: '$predictions.yieldGrams.expected' },
            avgQuality: { $avg: '$predictions.quality' }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          overall: stats[0] || {},
          byStrainType: strainStats
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Statistiken:', error);
      res.status(500).json({
        error: 'Fehler beim Abrufen der Statistiken',
        details: error.message
      });
    }
  }
}

module.exports = new SimulationController();
