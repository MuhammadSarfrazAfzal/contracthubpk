const express = require('express');
const User = require('../models/User');
const Contract = require('../models/Contract');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

// Apply admin protection to all routes in this file
router.use(protect);
router.use(admin);

// @route   GET /api/admin/users
// @desc    Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user (Add by admin)
router.post('/users', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const user = await User.create({ email, password, role });
    res.status(201).json({ _id: user._id, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check if trying to delete self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Admin cannot delete themselves' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   POST /api/admin/users/:id/reset-password
// @desc    Admin manually resets a user's password
router.post('/users/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   GET /api/admin/stats
// @desc    Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeContracts = await Contract.countDocuments({ status: 'active' });
    const pendingDisputes = await Contract.countDocuments({ status: 'cancellation_pending' });
    
    // Total value of all contracts
    const contracts = await Contract.find();
    const totalVolume = contracts.reduce((acc, contract) => acc + (contract.value || 0), 0);

    res.json({
      totalUsers,
      activeContracts,
      pendingDisputes,
      totalVolume,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   GET /api/admin/disputes
// @desc    Get all cancellation requests
router.get('/disputes', async (req, res) => {
  try {
    const disputes = await Contract.find({ status: 'cancellation_pending' })
      .populate('user', 'name email')
      .populate('freelancer', 'name email')
      .populate('cancellationRequest.requestedBy', 'name email role');
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   POST /api/admin/disputes/:id/resolve
// @desc    Admin resolve dispute (Approve/Reject cancellation)
router.post('/disputes/:id/resolve', async (req, res) => {
  const { action } = req.body; // 'approve' or 'reject'
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract || contract.status !== 'cancellation_pending') {
      return res.status(404).json({ message: 'Active dispute not found for this contract' });
    }

    if (action === 'approve') {
      contract.status = 'cancelled';
      contract.cancellationRequest.status = 'approved';
    } else if (action === 'reject') {
      contract.status = 'active'; // Return to active or previously valid state? Assuming active for now.
      contract.cancellationRequest.status = 'rejected';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await contract.save();
    res.json({ message: `Dispute ${action}ed successfully`, contract });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
