import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import transporter from '../config/nodemailer.js';


export const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.json({ success: false, message: 'Missing Details' })
    }

    try {

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10); //the number is medium encryption, higher means more time to encrypt a more secure pass

        const user = new userModel({ name, email, password: hashedPassword }) //provide these details from req body, the rest are given by default
        await user.save();

        //generating the token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });//dont geit the ._id

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', //if the env is production => true, else false min 47 GratStack
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 //7 days converted in miliseconds
        });

        //sending welcome mail
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Welcome to Backyard Garden!',
            text: `Welcome to Backyard Garden! Your account has been created with email id: ${email}`
        }
        await transporter.sendMail(mailOptions);

        return res.json({ success: true });

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: 'Required fields' })
    }
    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User does not exist" });
        }


        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.json({ success: false, message: "Incorrect password" });
        }

        //generating the token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });//dont understand the ._id

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', //if the env is production => true, else false min 47 GratStack
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 //7 days converted in miliseconds
        });

        return res.json({ success: true, userId: user._id });



    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', //if the env is production => true, else false min 47 GratStack
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
        })

        return res.json({ success: true, message: "Logged out" })

    } catch (error) {
        res.json({ success: false, message: error.message });
    }

}

//Send the verification OTP to user's email
export const sendVerifyOtp = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await userModel.findById(userId);

        if (user.isAccountVerified) {
            return res.json({ success: false, message: "Account already verified" })
        }
        //generate otp with math random
        const otp = String(Math.floor(100000 + Math.random() * 900000)); //6 digit number converted to string

        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000; // 1 day

        await user.save();

        //send otp to user
        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account verification OTP',
            text: `Your OTP is: ${otp}. Verify your account using this OTP.`
        }

        await transporter.sendMail(mailOption);
        res.json({ success: true, message: "Verification OTP sent on email" });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// verify the email using otp
export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body; //the user will only type the otp, the userId will be taken from the token using a middleware function

    if (!userId || !otp) {
        return res.json({ success: false, message: "Missing details for verification!" });

    }
    try {
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User nout found!" });
        }

        if (user.verifyOtp === '' || user.verifyOtp !== otp) {
            return res.json({ success: false, message: "Invalid OTP!" });
        }

        if (user.verifyOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "OTP expired!" });
        }

        user.isAccountVerified = true;
        //reset 
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;

        await user.save();
        res.json({ success: true, message: "Email verified successfully!" });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

//check if user is already logged in 
//the middleware userAuth is executed before this controller function
export const isAuthenticated = async (req, res) => {
    try {
        return res.json({ success: true });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

//send password reset otp
export const sendResetOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.json({ success: false, message: "Email is equired!" })
    }

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            res.json({ success: false, message: "User not found!" });
        }
        //generate reset otp
        const otp = String(Math.floor(100000 + Math.random() * 900000)); //6 digit number converted to string

        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 min

        await user.save();

        //send otp to user
        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Password reset OTP',
            text: `Your OTP for resetting your password is: ${otp}. Use it to proceed with resetting your password.`
        }

        await transporter.sendMail(mailOption);
        res.json({
            success: true, message: "Reset OTP sent on email"
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

//verify the otp and reset the password
export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.json({ success: false, message: "Email, OTP and new password are required!" });
    }

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found!" });
        }
        if (user.resetOtp === "" || user.resetOtp !== otp) {
            return res.json({ success: false, message: "Invalid OTP!" });
        }
        if (user.resetOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "OTP expired!" });
        }

        //store the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        //update pass
        user.password = hashedPassword;
        //reset the otp
        user.resetOtp = '';
        user.resetOtpExpireAt = 0;

        await user.save();
        return res.json({ success: true, message: "Password has been successfully reset." });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}