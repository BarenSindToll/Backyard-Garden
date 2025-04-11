//find the token from the cookie, and from the token find userId
import jwt from "jsonwebtoken";

const userAuth = async (req, res, next) => {
    const { token } = req.cookies;

    if (!token) {
        return res.json({ success: false, message: "Not authorized. Log in again" })
    }

    try {
        // decode the token
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
        if (tokenDecode.id) {
            req.body.userId = tokenDecode.id;
        }
        else {
            return res.json({ success: false, message: "Not authorized. Log in again" });
        }

        next(); //this will call the controller function sendVerifyOtp

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export default userAuth;