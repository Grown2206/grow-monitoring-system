/**
 * Controller Template - Best Practices
 *
 * Use this as a reference for creating new controllers
 * Demonstrates standardized error handling and async patterns
 */

const {
  asyncHandler,
  NotFoundError,
  ValidationError,
  DatabaseError
} = require('../middleware/errorHandler');

// Example Model (replace with actual model)
// const ExampleModel = require('../models/Example');

/**
 * @desc    Get all items with pagination
 * @route   GET /api/examples
 * @access  Public
 */
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

  // Validate pagination params
  if (page < 1 || limit < 1 || limit > 100) {
    throw new ValidationError('Invalid pagination parameters', {
      page: 'Must be >= 1',
      limit: 'Must be between 1 and 100'
    });
  }

  const skip = (page - 1) * limit;

  try {
    const [items, total] = await Promise.all([
      ExampleModel.find()
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExampleModel.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: items
    });
  } catch (error) {
    throw new DatabaseError('Failed to fetch items', { error: error.message });
  }
});

/**
 * @desc    Get single item by ID
 * @route   GET /api/examples/:id
 * @access  Public
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await ExampleModel.findById(id);

  if (!item) {
    throw new NotFoundError('Item');
  }

  res.status(200).json({
    success: true,
    data: item
  });
});

/**
 * @desc    Create new item
 * @route   POST /api/examples
 * @access  Private
 */
const create = asyncHandler(async (req, res) => {
  // Validate required fields
  const { name, description } = req.body;

  if (!name) {
    throw new ValidationError('Name is required');
  }

  try {
    const item = await ExampleModel.create({
      name,
      description,
      createdBy: req.user?._id // If auth middleware provides user
    });

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: item
    });
  } catch (error) {
    // MongoDB duplicate key error will be handled by error middleware
    if (error.code === 11000) {
      throw error; // Let handleMongoError process it
    }
    throw new DatabaseError('Failed to create item', { error: error.message });
  }
});

/**
 * @desc    Update item
 * @route   PUT /api/examples/:id
 * @access  Private
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Find and update
  const item = await ExampleModel.findByIdAndUpdate(
    id,
    updates,
    {
      new: true,        // Return updated document
      runValidators: true  // Run model validators
    }
  );

  if (!item) {
    throw new NotFoundError('Item');
  }

  res.status(200).json({
    success: true,
    message: 'Item updated successfully',
    data: item
  });
});

/**
 * @desc    Delete item
 * @route   DELETE /api/examples/:id
 * @access  Private
 */
const deleteItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await ExampleModel.findByIdAndDelete(id);

  if (!item) {
    throw new NotFoundError('Item');
  }

  res.status(200).json({
    success: true,
    message: 'Item deleted successfully',
    data: { id }
  });
});

/**
 * @desc    Bulk operations example
 * @route   POST /api/examples/bulk
 * @access  Private
 */
const bulkOperation = asyncHandler(async (req, res) => {
  const { operations } = req.body;

  if (!Array.isArray(operations) || operations.length === 0) {
    throw new ValidationError('Operations array is required');
  }

  // Validate all operations before executing
  for (const op of operations) {
    if (!op.action || !['create', 'update', 'delete'].includes(op.action)) {
      throw new ValidationError('Invalid operation action', {
        validActions: ['create', 'update', 'delete']
      });
    }
  }

  const results = {
    created: 0,
    updated: 0,
    deleted: 0,
    errors: []
  };

  // Execute operations (could use bulkWrite for better performance)
  for (const op of operations) {
    try {
      switch (op.action) {
        case 'create':
          await ExampleModel.create(op.data);
          results.created++;
          break;
        case 'update':
          await ExampleModel.findByIdAndUpdate(op.id, op.data);
          results.updated++;
          break;
        case 'delete':
          await ExampleModel.findByIdAndDelete(op.id);
          results.deleted++;
          break;
      }
    } catch (error) {
      results.errors.push({
        operation: op,
        error: error.message
      });
    }
  }

  res.status(200).json({
    success: true,
    message: 'Bulk operation completed',
    results
  });
});

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteItem,
  bulkOperation
};
