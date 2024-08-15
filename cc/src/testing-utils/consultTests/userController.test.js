const userController = require('../../auth/controllers/userController');
const User = require('../../auth/models/userModel');
const Consultant = require('../../consult/models/consultantModel');
const Client = require('../../consult/models/clientModel');
const fs = require('fs');
const path = require('path');

jest.mock('../../auth/models/userModel');
jest.mock('../../consult/models/consultantModel');
jest.mock('../../consult/models/clientModel');
jest.mock('passport');

// Mock implementation for User.register
User.register = jest.fn().mockImplementation((newUser, password, cb) => {
  const user = {
    _id: 'mockedId',
    username: newUser.username,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    phoneNumber: newUser.phoneNumber,
    role: newUser.role,
    isAdmin: false,
    isDeveloper: false,
    isVerified: false
  };
  cb(null, user);
});

const logFile = path.join(__dirname, '../../../logs/test_results.log');

const logTestResult = (testName, passed, error = null) => {
  const logEntry = `${new Date().toISOString()} - ${testName}: ${passed ? 'PASSED' : 'FAILED'}${error ? ` - Error: ${error}` : ''}\n`;
  fs.appendFileSync(logFile, logEntry);
};

beforeAll(() => {
  fs.appendFileSync(logFile, `\n--- Test Run Started: ${new Date().toISOString()} ---\n`);
});

afterAll(() => {
  fs.appendFileSync(logFile, `--- Test Run Completed: ${new Date().toISOString()} ---\n\n`);
});

describe('User Controller Tests', () => {
  let mockRequest;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    mockRequest = {
      body: {},
      user: {},
      isAuthenticated: jest.fn(),
      login: jest.fn((user, cb) => cb(null)),
      logout: jest.fn(cb => cb()),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn(),
      render: jest.fn(),
    };
    mockNext = jest.fn();
  });

  const runTest = async (testName, testFunction) => {
    try {
      await testFunction();
      logTestResult(testName, true);
    } catch (error) {
      logTestResult(testName, false, error.message);
      throw error;
    }
  };

  describe('User Registration', () => {
    it('should register a new consultant successfully', () => runTest('Register Consultant', async () => {
      const mockUserData = {
        username: 'newconsultant',
        email: 'consultant@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: 1234567890,
        role: 'consultant',
      };
  
      mockRequest.body = mockUserData;
  
      User.findOne.mockResolvedValue(null);
      Consultant.prototype.save.mockResolvedValue({});
  
      await userController.registerUser(mockRequest, mockResponse);
  
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: expect.objectContaining({
          username: mockUserData.username,
          email: mockUserData.email,
          firstName: mockUserData.firstName,
          lastName: mockUserData.lastName,
          phoneNumber: mockUserData.phoneNumber,
          role: mockUserData.role,
          isAdmin: false,
          isDeveloper: false,
          isVerified: false,
        }),
      });
    }));
  
    // Update the client registration test similarly
    it('should register a new client successfully', () => runTest('Register Client', async () => {
      const mockUserData = {
        username: 'newclient',
        email: 'client@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: 1234567890,
        role: 'client',
      };
  
      mockRequest.body = mockUserData;
  
      User.findOne.mockResolvedValue(null);
      Consultant.prototype.save.mockResolvedValue({});
  
      await userController.registerUser(mockRequest, mockResponse);
  
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: expect.objectContaining({
          username: mockUserData.username,
          email: mockUserData.email,
          firstName: mockUserData.firstName,
          lastName: mockUserData.lastName,
          phoneNumber: mockUserData.phoneNumber,
          role: mockUserData.role,
          isAdmin: false,
          isDeveloper: false,
          isVerified: false,
        }),
      });
    }));
  });

  describe('User Login', () => {
    it('should login user successfully', () => runTest('User Login', async () => {
      const mockUser = { 
        _id: '123', 
        username: 'testuser', 
        role: 'client',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      };
      mockRequest.body = { username: 'testuser', password: 'password123' };

      require('passport').authenticate.mockImplementation((strategy, cb) => {
        return (req, res, next) => {
          cb(null, mockUser, null);
        };
      });

      await userController.loginUser(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Login successful',
        user: expect.objectContaining({
          id: mockUser._id,
          username: mockUser.username,
          role: mockUser.role,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          email: mockUser.email,
        }),
      }));
    }));
  });

  describe('Get User Profile', () => {
    it('should return user profile for authenticated user', () => runTest('Get User Profile', async () => {
      const mockUser = { 
        _id: '123', 
        username: 'testuser', 
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'client',
        phoneNumber: 1234567890,
        isAdmin: false,
        isDeveloper: false,
        isVerified: true,
      };
      mockRequest.user = { _id: '123' };

      User.findById.mockResolvedValue(mockUser);

      await userController.getUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        id: mockUser._id,
        username: mockUser.username,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        phoneNumber: mockUser.phoneNumber,
        role: mockUser.role,
        isAdmin: mockUser.isAdmin,
        isDeveloper: mockUser.isDeveloper,
        isVerified: mockUser.isVerified
      }));
    }));
  });
});