const {
  createIncident,
  getAllIncidents,
  getIncidentById,
} = require('../services/incidentService');
const { successResponse, errorResponse, parsePagination } = require('../utils/helpers');

/**
 * POST /api/incidents
 * Report a new safety incident.
 */
async function reportIncident(req, res, next) {
  try {
    const incident = await createIncident(req.body);
    return successResponse(res, incident, 201, 'Incident reported successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/incidents
 * Retrieve all incidents with optional filters: ?severity=high&incident_type=theft&page=1&limit=20
 */
async function listIncidents(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { severity, incident_type } = req.query;

    const { incidents, total } = await getAllIncidents({
      severity,
      incident_type,
      limit,
      offset,
    });

    return successResponse(res, {
      incidents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/incidents/:id
 * Retrieve a single incident by UUID.
 */
async function getIncident(req, res, next) {
  try {
    const incident = await getIncidentById(req.params.id);
    if (!incident) {
      return errorResponse(res, `Incident with ID '${req.params.id}' not found.`, 404);
    }
    return successResponse(res, incident);
  } catch (err) {
    next(err);
  }
}

module.exports = { reportIncident, listIncidents, getIncident };
