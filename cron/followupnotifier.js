const cron = require('node-cron');
const asynchandler = require('express-async-handler');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');

// Utility function to assign background color based on the notification title
const getNotificationColor = (title) => {
  switch (title) {
    case 'Follow-up Warning':
      return 'bg-yellow-500'; // Yellow for follow-up warnings
    case 'Follow-up Missed':
      return 'bg-red-500'; // Red for missed follow-ups
    default:
      return 'bg-gray-500'; // Default gray for other notifications
  }
};

// Cron runs every hour at the 0th minute
cron.schedule('0 * * * *', asynchandler(async () => {
    const now = new Date();
    const leads = await User.find({
        nextFollowUp: { $exists: true },
        status: { $in: ['new', 'open'] }
    }).populate('createdBy assignedTo');

    for (const lead of leads) {
        const followDate = new Date(lead.nextFollowUp);  // The date when the follow-up is scheduled
        const oneDayBefore = new Date(followDate);  // One day before follow-up date
        oneDayBefore.setDate(followDate.getDate() - 1);  // Set the day to one day before the follow-up date

        const followupDone = lead.status !== 'new' && lead.status !== 'open';  // Check if follow-up was done

        const nowDate = now.toISOString().split('T')[0];  // Current date in 'YYYY-MM-DD' format
        const followDateStr = followDate.toISOString().split('T')[0];  // Follow-up date in 'YYYY-MM-DD' format
        const oneDayBeforeStr = oneDayBefore.toISOString().split('T')[0];  // One day before follow-up date in 'YYYY-MM-DD' format

        // 1. Follow-up completed: Confirm next day at 9PM
        if (followupDone) {
            const completedDate = new Date(lead.updatedAt);  // Get the last update date of the lead
            const nextDay = new Date(completedDate);
            nextDay.setDate(completedDate.getDate() + 1);  // Get the next day after the completed date
            nextDay.setHours(21, 0, 0, 0);  // Set the time to 9 PM

            if (
                now.toDateString() === nextDay.toDateString() &&  // Check if today is the next day after completion
                now.getHours() === 21  // Check if the current time is 9 PM
            ) {
                await sendNotification(lead, 'Follow-up Completed', `${lead.name} was followed up on time.`);
            }
            continue;
        }

        // 2. Warning one day before at 6PM
        if (
            nowDate === oneDayBeforeStr &&  // Check if today is one day before the follow-up date
            now.getHours() === 18  // Check if the current time is 6 PM
        ) {
            await sendNotification(lead, 'Follow-up Warning', `${lead.name} has a follow-up scheduled for tomorrow.`);
        }

        // 3. Missed follow-up at 9PM
        if (
            nowDate === followDateStr &&  // Check if today is the scheduled follow-up date
            now.getHours() === 21  // Check if the current time is 9 PM
        ) {
            await sendNotification(lead, 'Follow-up Missed', `${lead.name} was not followed up today.`);
        }
    }
}));

// Notification helper function
async function sendNotification(lead, title, message) {
    const recipients = [];

    if (lead.createdBy) recipients.push(lead.createdBy._id);  // Add the creator to the recipients
    if (lead.assignedTo && !recipients.includes(lead.assignedTo._id)) {
        recipients.push(lead.assignedTo._id);  // Add the assigned user to the recipients if not already added
    }

    // Create the notifications array with title, message, and color
    const notifications = recipients.map(userId => ({
        user: userId,
        title,
        message,
        isRead: false,
        color: getNotificationColor(title),  // Assign color based on the notification title
    }));

    await Notification.insertMany(notifications);  // Insert notifications into the database
}
