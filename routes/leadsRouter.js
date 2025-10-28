const express = require('express')
const isAuth = require('../middleware/isAuth')

const { upload } = require('../middleware/cloudinary')
const { csvUpload } = require('../middleware/csvUpload')
const leadsController = require('../controllers/leadsController')

const leadsRouter = express.Router()


// leadsRouter.get("/get/:id",leadsController.get_details);
leadsRouter.post('/add',isAuth,leadsController.add)
leadsRouter.post('/upload-bulkleads',isAuth,csvUpload.single('csvfile'),leadsController.upload_csvbulkleads)
leadsRouter.get('/csv-template',leadsController.download_csvtemplate)
leadsRouter.get('/list',isAuth,leadsController.list)
leadsRouter.get('/list-openleads',isAuth,leadsController.list_openleads)
leadsRouter.get('/view-pdf',isAuth,leadsController.view_pdf)
leadsRouter.put('/assign/:id',isAuth,leadsController.assign)
leadsRouter.put('/update-details/:id',isAuth,leadsController.update_details)
leadsRouter.put('/update-userleadform/:id',isAuth,upload.any(),leadsController.update_userleadform)

leadsRouter.put('/update-priority/:id',isAuth,leadsController.update_priority)
leadsRouter.put('/update-status/:id',isAuth,leadsController.update_status)
leadsRouter.put('/set-nextfollowup/:id',isAuth,leadsController.set_nextfollowup)
leadsRouter.delete('/delete-multipleleads',isAuth,leadsController.delete_multipleleads)
// leadsRouter.delete("/:id/followups/rejected", leadsController.removeRejectedFollowup);


module.exports = leadsRouter