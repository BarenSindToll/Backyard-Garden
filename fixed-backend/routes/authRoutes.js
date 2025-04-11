//min 62
import express from 'express'
import { login, logout, register } from '../controllers/authController.js';

const authRouter = express.Router();

//construct endpoints
authRouter.post('/register', register); //these will actually look like /api/auth/register from server use method
authRouter.post('/login', login);
authRouter.post('/logout', logout);

export default authRouter;

