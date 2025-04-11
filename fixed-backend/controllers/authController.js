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

        return res.json({ success: true });



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