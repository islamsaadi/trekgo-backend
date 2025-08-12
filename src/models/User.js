import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { bcrypt as bcryptConfig } from '../config/auth.js';

class UserSchema {
  constructor() {
    this.schema = new mongoose.Schema({
      name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters'],
      },
      email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
      },
      password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false,
      },
      refreshTokens: [{
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 2592000 // 30 days
        }
      }],
      failedLoginAttempts: {
        type: Number,
        default: 0,
      },
      accountLockedUntil: Date,
      lastLogin: Date,
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    }, {
      timestamps: true,
    });

    this.setupMiddleware();
    this.setupMethods();
  }

  setupMiddleware() {
    this.schema.pre('save', async function(next) {
      if (!this.isModified('password')) return next();
      
      try {
        const salt = await bcrypt.genSalt(bcryptConfig.rounds);
        this.password = await bcrypt.hash(this.password, salt);
        next();
      } catch (error) {
        next(error);
      }
    });

    this.schema.pre('save', function(next) {
      if (this.isNew || this.isModified()) {
        this.updatedAt = new Date();
      }
      next();
    });
  }

  setupMethods() {
    this.schema.methods.comparePassword = async function(candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
    };

    this.schema.methods.isAccountLocked = function() {
      return this.accountLockedUntil && this.accountLockedUntil > Date.now();
    };

    this.schema.methods.incrementFailedAttempts = async function() {
      this.failedLoginAttempts += 1;
      if (this.failedLoginAttempts >= 5) {
        this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      await this.save();
    };

    this.schema.methods.resetFailedAttempts = async function() {
      this.failedLoginAttempts = 0;
      this.accountLockedUntil = undefined;
      this.lastLogin = new Date();
      await this.save();
    };

    this.schema.methods.toJSON = function() {
      const obj = this.toObject();
      delete obj.password;
      delete obj.refreshTokens;
      delete obj.__v;
      return obj;
    };
  }

  getModel() {
    return mongoose.model('User', this.schema);
  }
}

export default new UserSchema().getModel();