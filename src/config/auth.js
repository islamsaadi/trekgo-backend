import dotenv from 'dotenv';
dotenv.config();

export const jwt = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRE,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE,
};

export const bcrypt = {
  rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
};