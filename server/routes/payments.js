const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// @route   POST /api/payments/escrow
// @desc    Deposit funds into escrow for a contract or milestone
router.post('/escrow', protect, async (req, res) => {
  try {
    const { contractId, milestoneId, amount, method, senderPhone, transactionId, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required for payment verification.' });
    }

    const user = await User.findById(req.user._id);
    
    // Verify OTP
    if (!user.paymentOtp || user.paymentOtp !== otp || user.paymentOtpExpire < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired payment OTP.' });
    }

    // Clear OTP
    user.paymentOtp = undefined;
    user.paymentOtpExpire = undefined;
    await user.save();

    const contract = await Contract.findById(contractId);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    // Verify current user is the client (contract.user)
    if (contract.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the client can deposit funds' });
    }

    // Create a new success payment record
    const payment = await Payment.create({
      contract: contractId,
      milestone: milestoneId || null,
      payer: req.user._id,
      payee: contract.freelancer,
      amount,
      method,
      senderPhone,
      transactionId,
      status: 'success', // Simulated success
      type: 'escrow',
    });

    // Update contract/milestone status
    if (milestoneId) {
      const milestone = contract.milestones.id(milestoneId);
      if (milestone) {
        milestone.paymentStatus = 'escrowed';
        contract.escrowedAmount += Number(amount);
        if (contract.paymentStatus === 'unpaid') contract.paymentStatus = 'escrowed';
      }
    } else {
      contract.paymentStatus = 'escrowed';
      contract.escrowedAmount += Number(amount);
    }

    await contract.save();

    // Notify freelancer
    await Notification.create({
      recipient: contract.freelancer,
      sender: req.user._id,
      contract: contract._id,
      type: 'contract_request', // Reusing type or could add a new one
      message: `Funds of ${amount} ${contract.currency} have been deposited into escrow for "${contract.title}".`,
    });

    res.status(201).json({ message: 'Payment deposited into escrow!', payment, contract });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   POST /api/payments/send-otp
// @desc    Send OTP for payment verification
router.post('/send-otp', protect, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const user = await User.findById(req.user._id);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.paymentOtp = otp;
    user.paymentOtpExpire = otpExpire;
    await user.save();

    // Send Email
    await sendEmail({
      email: user.email,
      subject: 'Payment Verification OTP',
      message: `Your verification code for payment of ${amount} ${currency || 'USD'} is ${otp}. This code will expire in 5 minutes.`,
    });

    res.status(200).json({ message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('Send payment OTP error:', err);
    res.status(500).json({ message: 'Failed to send verification code.' });
  }
});

module.exports = router;
