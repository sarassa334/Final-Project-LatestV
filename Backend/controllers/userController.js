import { 
    findUserById,
    findUserByEmail,
    findUserByOAuthId,
    createUser,
    updateUser,
    deleteUser,
    getAllUsers,
    linkOAuthProvider 
  } from '../models/userModel.js';
  import { createResponse } from '../utils/helpers.js';
  
  // Get user profile (updated for OAuth)
  export const getProfile = async (req, res) => {
    try {
      const user = await findUserById(req.user.id);
      
      if (!user) {
        return res.status(404).json(
          createResponse(false, 'User not found')
        );
      }
      
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        oauth_provider: user.oauth_provider,
        created_at: user.created_at,
        is_active: user.is_active
      };
      
      return res.json(
        createResponse(true, 'Profile retrieved', userData)
      );
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json(
        createResponse(false, 'Server error')
      );
    }
  };
  
  // Update profile (OAuth-safe)
  export const updateProfile = async (req, res) => {
    try {
      const { name, avatar } = req.body;
      
      // OAuth users might not have all fields
      const updateData = { 
        name: name || undefined,
        avatar: avatar || undefined
      };
      
      const updatedUser = await updateUser(req.user.id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json(
          createResponse(false, 'User not found')
        );
      }
      
      return res.json(
        createResponse(true, 'Profile updated', {
          id: updatedUser.id,
          name: updatedUser.name,
          avatar: updatedUser.avatar
        })
      );
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json(
        createResponse(false, 'Server error')
      );
    }
  };
  
  // Delete account (with OAuth cleanup)
  export const deleteAccount = async (req, res) => {
    try {
      const deletedUser = await deleteUser(req.user.id);
      
      if (!deletedUser) {
        return res.status(404).json(
          createResponse(false, 'User not found')
        );
      }
      
      req.logout(() => {
        req.session.destroy(() => {
          res.clearCookie('accessToken');
          res.clearCookie('refreshToken');
          res.clearCookie('connect.sid');
          res.json(createResponse(true, 'Account deleted'));
        });
      });
    } catch (error) {
      console.error('Delete account error:', error);
      return res.status(500).json(
        createResponse(false, 'Server error')
      );
    }
  };
  
  // Get all users (admin only)
  export const getUsers = async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json(
          createResponse(false, 'Unauthorized access')
        );
      }
      
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      
      const users = await getAllUsers(Number(limit), Number(offset));
      
      const userList = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        oauth_provider: user.oauth_provider,
        is_active: user.is_active,
        created_at: user.created_at
      }));
      
      return res.json(
        createResponse(true, 'Users retrieved', {
          users: userList,
          pagination: {
            current_page: Number(page),
            per_page: Number(limit),
            total_items: userList.length
          }
        })
      );
    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).json(
        createResponse(false, 'Server error')
      );
    }
  };
  
  // Link OAuth provider to existing account
  export const linkProvider = async (req, res) => {
    try {
      const { provider, providerId, email } = req.body;
      
      // Verify user exists
      const user = await findUserById(req.user.id);
      if (!user) {
        return res.status(404).json(
          createResponse(false, 'User not found')
        );
      }
      
      // Check if provider already linked
      if (user.oauth_provider === provider) {
        return res.status(400).json(
          createResponse(false, 'Provider already linked')
        );
      }
      
      // Update user with OAuth info
      const updatedUser = await linkOAuthProvider(user.id, {
        provider,
        providerId,
        email: email || user.email
      });
      
      return res.json(
        createResponse(true, 'Provider linked', {
          id: updatedUser.id,
          oauth_provider: updatedUser.oauth_provider
        })
      );
    } catch (error) {
      console.error('Link provider error:', error);
      return res.status(500).json(
        createResponse(false, 'Server error')
      );
    }
  };