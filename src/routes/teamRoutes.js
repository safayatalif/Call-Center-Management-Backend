const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const teamController = require('../controllers/teamController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route   GET /api/teams
 * @desc    Get all teams
 * @access  Private
 */
router.get('/', authMiddleware, teamController.getAllTeams);

/**
 * @route   GET /api/teams/:id
 * @desc    Get team by ID with members
 * @access  Private
 */
router.get('/:id', authMiddleware, teamController.getTeamById);

/**
 * @route   POST /api/teams
 * @desc    Create new team
 * @access  Private
 */
router.post('/', [
    authMiddleware,
    check('teamname', 'Team name is required').not().isEmpty()
], teamController.createTeam);

/**
 * @route   PUT /api/teams/:id
 * @desc    Update team
 * @access  Private
 */
router.put('/:id', authMiddleware, teamController.updateTeam);

/**
 * @route   DELETE /api/teams/:id
 * @desc    Delete team
 * @access  Private
 */
router.delete('/:id', authMiddleware, teamController.deleteTeam);

/**
 * @route   POST /api/teams/:id/members
 * @desc    Add member to team
 * @access  Private
 */
router.post('/:id/members', [
    authMiddleware,
    check('employee_id', 'Employee ID is required').not().isEmpty()
], teamController.addTeamMember);

/**
 * @route   DELETE /api/teams/:id/members/:memberId
 * @desc    Remove member from team
 * @access  Private
 */
router.delete('/:id/members/:memberId', authMiddleware, teamController.removeTeamMember);

/**
 * @route   GET /api/teams/:teamId/available-employees
 * @desc    Get available employees for team
 * @access  Private
 */
router.get('/:teamId/available-employees', authMiddleware, teamController.getAvailableEmployees);

module.exports = router;
