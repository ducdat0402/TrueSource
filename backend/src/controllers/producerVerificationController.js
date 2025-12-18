const ProducerVerification = require('../models/producerVerificationModel');
const User = require('../models/userModel');

/**
 * POST /producer/verification/register
 * Producer đăng ký xác thực
 */
async function registerVerification(req, res) {
  try {
    const userId = req.user._id;
    
    // Kiểm tra user phải là producer
    if (req.user.role !== 'producer') {
      return res.status(403).json({ error: 'Chỉ producer mới có thể đăng ký xác thực' });
    }

    // Kiểm tra đã đăng ký xác thực chưa
    const existingVerification = await ProducerVerification.findOne({ userId });
    if (existingVerification) {
      if (existingVerification.status === 'pending') {
        return res.status(400).json({ error: 'Bạn đã có đơn xác thực đang chờ duyệt' });
      }
      if (existingVerification.status === 'approved') {
        return res.status(400).json({ error: 'Bạn đã được xác thực rồi' });
      }
    }

    const {
      companyName,
      businessLicense,
      taxId,
      address,
      fullName,
      phone,
      email,
      walletAddress
    } = req.body;

    // Validation
    if (!companyName || !businessLicense || !taxId || !address || 
        !fullName || !phone || !email || !walletAddress) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Kiểm tra taxId đã được sử dụng chưa
    const existingTaxId = await ProducerVerification.findOne({ taxId });
    if (existingTaxId && existingTaxId.userId.toString() !== userId.toString()) {
      return res.status(400).json({ error: 'Mã số thuế này đã được sử dụng' });
    }

    // Tạo hoặc cập nhật verification
    let verification;
    if (existingVerification) {
      // Cập nhật lại nếu bị reject
      verification = await ProducerVerification.findOneAndUpdate(
        { userId },
        {
          companyName,
          businessLicense,
          taxId,
          address,
          fullName,
          phone,
          email,
          walletAddress,
          status: 'pending',
          reviewedBy: null,
          reviewedAt: null,
          adminNotes: ''
        },
        { new: true }
      );
    } else {
      verification = await ProducerVerification.create({
        userId,
        companyName,
        businessLicense,
        taxId,
        address,
        fullName,
        phone,
        email,
        walletAddress,
        status: 'pending'
      });
    }

    // Cập nhật verificationStatus của user
    await User.findByIdAndUpdate(userId, { verificationStatus: 'pending' });

    res.json({
      success: true,
      message: 'Đăng ký xác thực thành công. Vui lòng chờ admin duyệt.',
      verification
    });
  } catch (error) {
    console.error('Error registering verification:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /producer/verification/status
 * Lấy trạng thái xác thực của producer
 */
async function getVerificationStatus(req, res) {
  try {
    const userId = req.user._id;
    
    if (req.user.role !== 'producer') {
      return res.status(403).json({ error: 'Chỉ producer mới có thể xem trạng thái xác thực' });
    }

    const verification = await ProducerVerification.findOne({ userId })
      .populate('reviewedBy', 'username email');

    res.json({
      success: true,
      verificationStatus: req.user.verificationStatus,
      verification: verification || null
    });
  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /admin/producers/pending
 * Admin xem danh sách producer đang chờ duyệt
 */
async function getPendingVerifications(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có thể xem danh sách này' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const verifications = await ProducerVerification.find({ status: 'pending' })
      .populate('userId', 'username email role verificationStatus')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await ProducerVerification.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      verifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting pending verifications:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /admin/producers/:verificationId/approve
 * Admin duyệt producer
 */
async function approveVerification(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có thể duyệt producer' });
    }

    const { verificationId } = req.params;
    const { adminNotes } = req.body;

    const verification = await ProducerVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({ error: 'Không tìm thấy đơn xác thực' });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({ error: 'Đơn xác thực này không ở trạng thái chờ duyệt' });
    }

    // Cập nhật verification
    verification.status = 'approved';
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    if (adminNotes) {
      verification.adminNotes = adminNotes;
    }
    await verification.save();

    // Cập nhật user verificationStatus và grant role trên contract
    const user = await User.findById(verification.userId);
    if (user) {
      user.verificationStatus = 'verified';
      await user.save();

      // Grant PRODUCER_ROLE trên smart contract
      try {
        const app = require('../app');
        const contract = app.contract;
        const account = app.account;

        if (contract && account && verification.walletAddress) {
          const PRODUCER_ROLE = await contract.methods.PRODUCER_ROLE().call();
          await contract.methods.grantRole(PRODUCER_ROLE, verification.walletAddress).send({
            from: account.address,
            gas: 100000
          });
          console.log(`✅ Granted PRODUCER_ROLE to ${verification.walletAddress}`);
        }
      } catch (contractError) {
        console.error('Error granting role on contract:', contractError);
        // Không throw error, vì đã update DB rồi
      }
    }

    res.json({
      success: true,
      message: 'Đã duyệt producer thành công',
      verification
    });
  } catch (error) {
    console.error('Error approving verification:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /admin/producers/:verificationId/reject
 * Admin từ chối producer
 */
async function rejectVerification(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có thể từ chối producer' });
    }

    const { verificationId } = req.params;
    const { adminNotes } = req.body;

    if (!adminNotes) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do từ chối' });
    }

    const verification = await ProducerVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({ error: 'Không tìm thấy đơn xác thực' });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({ error: 'Đơn xác thực này không ở trạng thái chờ duyệt' });
    }

    // Cập nhật verification
    verification.status = 'rejected';
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = new Date();
    verification.adminNotes = adminNotes;
    await verification.save();

    // Cập nhật user verificationStatus
    const user = await User.findById(verification.userId);
    if (user) {
      user.verificationStatus = 'rejected';
      await user.save();
    }

    res.json({
      success: true,
      message: 'Đã từ chối producer',
      verification
    });
  } catch (error) {
    console.error('Error rejecting verification:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  registerVerification,
  getVerificationStatus,
  getPendingVerifications,
  approveVerification,
  rejectVerification
};


