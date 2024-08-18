// serviceController.js

const Service = require('../models/serviceModel');

const serviceController = {
    // Create a new service
    createService: async (req, res) => {
        try {
            const service = new Service(req.body);
            await service.save();
            res.status(201).json({ message: 'Service created successfully', service: service });
        } catch (err) {
            res.status(400).json({ message: 'Error creating service', error: err.message });
        }
    },

    // Get all services
    getAllServices: async (req, res) => {
        try {
            const services = await Service.find();
            res.status(200).render('services/service', { services });
            //res.status(200).json(services);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching services', error: err.message });
        }
    },

    // Get a single service by ID
    getServiceById: async (req, res) => {
        try {
            const service = await Service.findById(req.params.id);
            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }
            res.status(200).render('services/serviceDetails', { service });
            // res.status(200).json(service);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching service', error: err.message });
        }
    },

    // Update a service
    updateService: async (req, res) => {
        try {
            const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }
            res.status(200).json({ message: 'Service updated successfully', service: service });
        } catch (err) {
            res.status(400).json({ message: 'Error updating service', error: err.message });
        }
    },

    // Delete a service
    deleteService: async (req, res) => {
        try {
            const service = await Service.findByIdAndDelete(req.params.id);
            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }
            res.status(200).json({ message: 'Service deleted successfully' });
        } catch (err) {
            res.status(500).json({ message: 'Error deleting service', error: err.message });
        }
    },

    // Toggle service active status
    toggleServiceStatus: async (req, res) => {
        try {
            const service = await Service.findById(req.params.id);
            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }
            service.isActive = !service.isActive;
            await service.save();
            res.status(200).json({ message: 'Service status toggled successfully', isActive: service.isActive });
        } catch (err) {
            res.status(500).json({ message: 'Error toggling service status', error: err.message });
        }
    },

    // Get services by category
    getServicesByCategory: async (req, res) => {
        try {
            const services = await Service.find({ category: req.params.category });
            res.status(200).json(services);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching services by category', error: err.message });
        }
    },

    // Search services
    searchServices: async (req, res) => {
        try {
            const query = req.query.q;
            const services = await Service.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { tags: { $in: [new RegExp(query, 'i')] } }
                ]
            });
            res.status(200).json(services);
        } catch (err) {
            res.status(500).json({ message: 'Error searching services', error: err.message });
        }
    }
};

module.exports = serviceController;