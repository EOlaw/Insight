const Service = require('../models/serviceModel');

const serviceController = {
    // Create a new service
    createService: async (req, res) => {
        try {
            const { name, description, category, price, duration } = req.body;

            // Validate input
            if (!name || !description || !category || !price || !duration) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            const service = new Service({ name, description, category, price, duration });
            await service.save();

            res.status(201).json({ message: 'Service created successfully', service });
        } catch (error) {
            res.status(500).json({ message: 'Error creating service', error });
        }
    },

    // Get all services
    getAllServices: async (req, res) => {
        try {
            const services = await Service.find();
            res.status(200).json(services);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching services', error });
        }
    },

    // Get a service by ID
    getServiceById: async (req, res) => {
        try {
            const { id } = req.params;

            const service = await Service.findById(id);
            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }

            res.status(200).json(service);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching service', error });
        }
    },

    // Update a service by ID
    updateService: async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            const service = await Service.findByIdAndUpdate(id, updates, { new: true });
            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }

            res.status(200).json({ message: 'Service updated successfully', service });
        } catch (error) {
            res.status(500).json({ message: 'Error updating service', error });
        }
    },

    // Delete a service by ID
    deleteService: async (req, res) => {
        try {
            const { id } = req.params;

            const service = await Service.findByIdAndDelete(id);
            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }

            res.status(200).json({ message: 'Service deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting service', error });
        }
    }
};

module.exports = serviceController;
