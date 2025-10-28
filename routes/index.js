const express = require('express');
const loginRouter = require('./loginRouter');
const leadsRouter = require('./leadsRouter');
const customersRouter = require('./customersRouter');
const staffsRouter = require('./staffsRouter');
const tasksRouter = require('./tasksRouter');
const teamsRouter = require('./teamsRouter');
const customerstatusSettingsRouter = require('./settingsRoutes/customerStatusSettingsRouter');
const leadFormFieldsSettingsRouter = require('./settingsRoutes/leadFormFieldsSettingsRouter');
const leadSourceSettingsRouter = require('./settingsRoutes/leadSourceSettingsRouter');
const impersonateRouter = require('./impersonateRouter');
const documentSettingsRouter = require('./settingsRoutes/documentSettingsRouter');
const notificationRouter = require('./notificationRouter');
const nextfollowupRouter = require('./nextfollowupRouter');
const passwordRouter = require('./passwordRouter');
const registeradminRouter = require('./registeradminRouter');
const paymentstatusRouter = require('./paymentstatusRouter');
const productSettingsRouter = require('./settingsRoutes/productSettingsRouter');
const paymentRouter = require('./paymentRouter');
const permissionRouter = require('./permissionRouter');
const gstSettingsRouter = require('./settingsRoutes/gstSettingsRouter');

const router = express()
 
router.use('/admin',registeradminRouter)
router.use('/leads',leadsRouter)
router.use('/auth',loginRouter)
router.use('/customers',customersRouter)
router.use('/staffs',staffsRouter)
router.use('/tasks',tasksRouter)
router.use('/teams',teamsRouter)
router.use('/customer-statussettings',customerstatusSettingsRouter)
router.use('/document-settings',documentSettingsRouter)
router.use('/lead-formfieldssettings',leadFormFieldsSettingsRouter)
router.use('/lead-sourcesettings',leadSourceSettingsRouter)
router.use('/impersonate',impersonateRouter)
router.use('/notification',notificationRouter)
router.use('/nextfollowup',nextfollowupRouter)
router.use('/password',passwordRouter)
router.use('/paymentstatus',paymentstatusRouter)
router.use('/product-setting',productSettingsRouter)
router.use('/payment',paymentRouter);
router.use("/permission",permissionRouter)
router.use("/gst",gstSettingsRouter)


module.exports = router;