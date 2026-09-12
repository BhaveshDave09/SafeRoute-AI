const emergencyService = require('../services/emergencyService');

/**
 * Save an emergency contact.
 */
async function saveContact(req, res, next) {
  try {
    const { user_id, name, phone, email, relation } = req.body;

    const contact = await emergencyService.saveEmergencyContact({
      user_id: user_id || 'default_user',
      name,
      phone,
      email,
      relation,
    });

    return res.status(201).json({
      success: true,
      message: 'Emergency contact saved successfully.',
      contact,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all emergency contacts for a user.
 */
async function getContacts(req, res, next) {
  try {
    const { userId } = req.params;

    const contacts = await emergencyService.getEmergencyContacts(userId || 'default_user');

    return res.status(200).json({
      success: true,
      contacts,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete an emergency contact.
 */
async function deleteContact(req, res, next) {
  try {
    const { id } = req.params;
    const { user_id } = req.body; // Expect user_id to verify ownership

    await emergencyService.deleteEmergencyContact(id, user_id || 'default_user');

    return res.status(200).json({
      success: true,
      message: 'Emergency contact deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  saveContact,
  getContacts,
  deleteContact,
};
