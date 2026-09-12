const journeyService = require('../services/journeyService');

/**
 * Start a new monitored journey.
 */
async function startJourney(req, res, next) {
  try {
    const { user_name, start_location, destination, eta_minutes, emergency_contact_ids } = req.body;

    const journey = await journeyService.startJourney({
      user_name,
      start_location,
      destination,
      eta_minutes: parseInt(eta_minutes),
      emergency_contact_ids,
    });

    return res.status(201).json({
      success: true,
      message: 'Journey started and monitoring is active.',
      journey,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Check-in to confirm safety.
 */
async function checkIn(req, res, next) {
  try {
    const { id } = req.params;

    const journey = await journeyService.checkInJourney(id);

    return res.status(200).json({
      success: true,
      message: 'Checked in successfully. Monitoring is stopped.',
      journey,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get journey details by ID.
 */
async function getJourney(req, res, next) {
  try {
    const { id } = req.params;

    const journey = await journeyService.getJourneyById(id);

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: 'Journey not found.',
      });
    }

    return res.status(200).json({
      success: true,
      journey,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startJourney,
  checkIn,
  getJourney,
};
