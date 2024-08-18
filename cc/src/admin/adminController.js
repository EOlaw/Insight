// adminController.js
const User = require('../auth/models/userModel');
const Consultant = require('../consult/models/consultantModel');
const Client = require('../consult/models/clientModel');
const Service = require('../consult/models/serviceModel');
const Consultation = require('../consult/models/consultationModel');

const adminController = {
    // Render users page
    renderUsers: async (req, res) => {
        try {
            const users = await User.find().select('-password');
            res.render('admin/users', { users });
        } catch (err) {
            res.status(500).render('error', { message: 'Error fetching users', error: err.message });
        }
    },

    // Manage users (POST)
    manageUsers: async (req, res) => {
        try {
            const { action, userId, userData } = req.body;
            let result;

            switch (action) {
                case 'update':
                    result = await User.findByIdAndUpdate(userId, userData, { new: true, runValidators: true });
                    break;
                case 'delete':
                    result = await User.findByIdAndDelete(userId);
                    await Consultant.findOneAndDelete({ user: userId });
                    await Client.findOneAndDelete({ user: userId });
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid action' });
            }

            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: 'Error managing users', error: err.message });
        }
    },

    // View system statistics (Dashboard)
    viewSystemStats: async (req, res) => {
      try {
          const userCount = await User.countDocuments();
          const consultantCount = await Consultant.countDocuments();
          const clientCount = await Client.countDocuments();
          const serviceCount = await Service.countDocuments();
          const consultationCount = await Consultation.countDocuments();

          const recentConsultations = await Consultation.find()
              .sort({ dateTime: -1 })
              .limit(10)
              .populate('client', 'firstName lastName')
              .populate('consultant', 'firstName lastName');

          // Calculate total revenue
          const revenueResult = await Consultation.aggregate([
              { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
          ]);
          const totalRevenue = revenueResult[0]?.totalRevenue || 0;

          res.render('admin/dashboard', {
              userCount,
              consultantCount,
              clientCount,
              serviceCount,
              consultationCount,
              totalRevenue,
              recentConsultations,
              activeServiceCount: serviceCount // Assuming all services are active, adjust if needed
          });
      } catch (err) {
          res.status(500).render('error', { message: 'Error fetching system stats', error: err.message });
      }
    },

    // Render services page
    renderServices: async (req, res) => {
        try {
            const services = await Service.find();
            res.render('admin/services', { services });
        } catch (err) {
            res.status(500).render('error', { message: 'Error fetching services', error: err.message });
        }
    },

    // Manage services (POST)
    manageServices: async (req, res) => {
        try {
            const { action, serviceId, serviceData } = req.body;
            let result;

            switch (action) {
                case 'create':
                    result = await Service.create(serviceData);
                    break;
                case 'update':
                    result = await Service.findByIdAndUpdate(serviceId, serviceData, { new: true, runValidators: true });
                    break;
                case 'delete':
                    result = await Service.findByIdAndDelete(serviceId);
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid action' });
            }

            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: 'Error managing services', error: err.message });
        }
    },

    // Render consultations page
    renderConsultations: async (req, res) => {
        try {
            const consultations = await Consultation.find()
                .populate('client', 'firstName lastName')
                .populate('consultant', 'firstName lastName')
                .populate('service', 'name');
            res.render('admin/consultations', { consultations });
        } catch (err) {
            res.status(500).render('error', { message: 'Error fetching consultations', error: err.message });
        }
    },

    // Manage consultations (POST)
    manageConsultations: async (req, res) => {
        try {
            const { action, consultationId, consultationData } = req.body;
            let result;

            switch (action) {
                case 'update':
                    result = await Consultation.findByIdAndUpdate(consultationId, consultationData, { new: true, runValidators: true });
                    break;
                case 'delete':
                    result = await Consultation.findByIdAndDelete(consultationId);
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid action' });
            }

            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: 'Error managing consultations', error: err.message });
        }
    },

    // Render reports page
    renderReports: async (req, res) => {
        res.render('admin/reports', { reportData: null, reportType: null });
    },

    // Generate reports
    generateReports: async (req, res) => {
      try {
          const { reportType, startDate, endDate } = req.body;
          let report;

          switch (reportType) {
              case 'revenue':
                  report = await Consultation.aggregate([
                      { $match: { dateTime: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
                      { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
                  ]);
                  break;
              case 'popular-services':
                  report = await Consultation.aggregate([
                      { $match: { dateTime: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
                      { $group: { _id: '$service', count: { $sum: 1 } } },
                      { $sort: { count: -1 } },
                      { $limit: 5 }
                  ]);
                  break;
              default:
                  return res.status(400).json({ message: 'Invalid report type' });
          }

          res.render('admin/reports', { reportData: report, reportType });
      } catch (err) {
          res.status(500).render('error', { message: 'Error generating report', error: err.message });
      }
    },


    // Render the main admin panel
    renderAdminPanel: async (req, res) => {
      try {
          // Fetch initial data for the dashboard
          const userCount = await User.countDocuments();
          const consultantCount = await Consultant.countDocuments();
          const clientCount = await Client.countDocuments();
          const serviceCount = await Service.countDocuments();
          const consultationCount = await Consultation.countDocuments();

          const recentConsultations = await Consultation.find()
              .sort({ dateTime: -1 })
              .limit(10)
              .populate('client', 'firstName lastName')
              .populate('consultant', 'firstName lastName');

          const revenueResult = await Consultation.aggregate([
              { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
          ]);
          const totalRevenue = revenueResult[0]?.totalRevenue || 0;

          res.render('admin/panel', {
              userCount,
              consultantCount,
              clientCount,
              serviceCount,
              consultationCount,
              totalRevenue,
              recentConsultations,
              activeServiceCount: serviceCount
          });
      } catch (err) {
          res.status(500).render('error', { message: 'Error loading admin panel', error: err.message });
      }
    },

    // Handle partial content requests
    getAdminContent: async (req, res) => {
      const section = req.params.section;
      try {
          switch(section) {
              case 'dashboard':
                  await adminController.viewSystemStats(req, res);
                  break;
              case 'users':
                  await adminController.renderUsers(req, res);
                  break;
              case 'services':
                  await adminController.renderServices(req, res);
                  break;
              case 'consultations':
                  await adminController.renderConsultations(req, res);
                  break;
              case 'reports':
                  await adminController.renderReports(req, res);
                  break;
              default:
                  res.status(404).send('Section not found');
          }
      } catch (err) {
          res.status(500).json({ message: 'Error loading content', error: err.message });
      }
    }
};




module.exports = adminController;