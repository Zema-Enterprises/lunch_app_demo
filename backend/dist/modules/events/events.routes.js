"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const events_controller_1 = require("./events.controller");
const validation_1 = require("../../middleware/validation");
const events_validation_1 = require("./events.validation");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
router.get('/', events_controller_1.getEvents);
router.get('/:id', events_controller_1.getEvent);
router.post('/', (0, validation_1.validate)(events_validation_1.createEventSchema), events_controller_1.createEvent);
router.patch('/:id', (0, validation_1.validate)(events_validation_1.updateEventSchema), events_controller_1.updateEvent);
router.delete('/:id', events_controller_1.deleteEvent);
router.post('/:id/close', events_controller_1.closeEvent);
router.post('/:id/join', events_controller_1.joinEvent);
router.post('/:id/check-completion', events_controller_1.checkCompletion);
exports.default = router;
