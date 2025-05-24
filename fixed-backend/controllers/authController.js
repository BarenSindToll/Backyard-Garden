
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/nodemailer.js';

// REGISTER
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ success: false, message: 'Missing details' });
  }

  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Create a temporary JWT token with user data and OTP (not yet saved to DB)
    const preUserToken = jwt.sign(
      { name, email, password: hashedPassword, otp },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: 'Verify your Backyard Garden account',
      text: `Your OTP is: ${otp}. Use this code to verify and complete your registration.`,
    });

    res.cookie('preUserToken', preUserToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};


// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: 'Required fields' });
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: 'User does not exist' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Incorrect password' });
    }

    if (!user.isAccountVerified) {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      user.verifyOtp = otp;
      user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;
      await user.save();

      const mailOption = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: 'Verify your Backyard Garden account',
        text: `Your OTP is: ${otp}. Verify your Backyard Garden account using this code.`,
      };
      await transporter.sendMail(mailOption);

      return res.json({
        success: false,
        message: 'Account not verified. A new OTP has been sent to your email.',
        shouldVerify: true,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// LOGOUT
export const logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    return res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// SEND OTP
export const sendVerifyOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await userModel.findById(userId);

    if (user.isAccountVerified) {
      return res.json({ success: false, message: "Account already verified" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: 'Account verification OTP',
      text: `Welcome to Backyard Garden! To verify your email and log in, use this OTP: ${otp}.`
    };

    await transporter.sendMail(mailOption);
    res.json({ success: true, message: "Verification OTP sent on email" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// VERIFY EMAIL
export const verifyEmail = async (req, res) => {
  const { otp } = req.body;
  const { preUserToken } = req.cookies;

  if (!preUserToken || !otp) {
    return res.json({ success: false, message: 'Missing verification details.' });
  }

  try {
    const decoded = jwt.verify(preUserToken, process.env.JWT_SECRET);
    const { name, email, password, otp: storedOtp } = decoded;

    if (otp.trim() !== String(storedOtp).trim()) {
      return res.json({ success: false, message: 'Invalid OTP.' });
    }


    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: 'Account already exists.' });
    }

    const user = new userModel({ name, email, password, isAccountVerified: true });
    await user.save();

    const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.clearCookie('preUserToken');
    return res.json({ success: true, message: 'Account verified and created.' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};


// AUTH CHECK
export const isAuthenticated = async (req, res) => {
  try {
    return res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// RESET PASSWORD FLOW
export const sendResetOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required!" });
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found!" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;

    await user.save();

    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: 'Password reset OTP',
      text: `Your OTP for resetting your password is: ${otp}. Use it to proceed with resetting your password.`
    };

    await transporter.sendMail(mailOption);
    res.json({ success: true, message: "Reset OTP sent on email" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Assuming token contains userId and is verified via middleware
export const resetPassword = async (req, res) => {
  const { otp, newPassword } = req.body;
  const { token } = req.cookies;

  if (!otp || !newPassword || !token) {
    return res.json({ success: false, message: "OTP and new password are required!" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.json({ success: false, message: "User not found!" });
    }

    if (user.resetOtp !== otp || user.resetOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "Invalid or expired OTP!" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = '';
    user.resetOtpExpireAt = 0;
    await user.save();

    return res.json({ success: true, message: "Password has been reset." });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};
