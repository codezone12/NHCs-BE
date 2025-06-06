// controllers/newsletterController.js
const { PrismaClient } = require('@prisma/client');
const { sendNewsletterConfirmationEmail } = require('../utils/email');

const prisma = new PrismaClient();

/**
 * Handle newsletter subscription
 * @route POST /api/newsletter/subscribe
 */
exports.subscribeToNewsletter = async (req, res) => {
    try {
        const { email, firstName, lastName, countryCode } = req.body;

        // Validate required fields
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Check if email already exists
        const existingSubscriber = await prisma.newsletter.findUnique({
            where: { email }
        });

        if (existingSubscriber) {
            if (existingSubscriber.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'This email is already subscribed to our newsletter'
                });
            } else {
                // Reactivate the subscription
                await prisma.newsletter.update({
                    where: { email },
                    data: {
                        isActive: true,
                        firstName: firstName || existingSubscriber.firstName,
                        lastName: lastName || existingSubscriber.lastName,
                        countryCode: countryCode || existingSubscriber.countryCode,
                        updatedAt: new Date()
                    }
                });

                // Send confirmation email
                await sendNewsletterConfirmationEmail({
                    email,
                    firstName: firstName || existingSubscriber.firstName
                });

                return res.status(200).json({
                    success: true,
                    message: 'Welcome back! Your newsletter subscription has been reactivated.'
                });
            }
        }

        // Create new newsletter subscription
        const newSubscriber = await prisma.newsletter.create({
            data: {
                email,
                firstName: firstName || null,
                lastName: lastName || null,
                countryCode: countryCode || null
            }
        });

        // Send confirmation email
        await sendNewsletterConfirmationEmail({
            email,
            firstName: firstName || 'Subscriber'
        });

        res.status(201).json({
            success: true,
            message: 'Thank you for subscribing! You will receive a confirmation email shortly.',
            data: {
                id: newSubscriber.id,
                email: newSubscriber.email
            }
        });

    } catch (error) {
        console.error('Newsletter subscription error:', error);

        // Handle Prisma unique constraint error
        if (error.code === 'P2002') {
            return res.status(400).json({
                success: false,
                message: 'This email is already subscribed to our newsletter'
            });
        }

        // Handle email sending errors
        if (error.code === 'EAUTH' || error.code === 'ECONNECTION') {
            return res.status(500).json({
                success: false,
                message: 'Subscription saved but confirmation email could not be sent. Please contact support.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error processing your subscription. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Handle newsletter unsubscription
 * @route POST /api/newsletter/unsubscribe
 */
exports.unsubscribeFromNewsletter = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }

        // Find and deactivate the subscription
        const subscriber = await prisma.newsletter.findUnique({
            where: { email }
        });

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Email address not found in our newsletter list'
            });
        }

        if (!subscriber.isActive) {
            return res.status(400).json({
                success: false,
                message: 'This email is already unsubscribed'
            });
        }

        await prisma.newsletter.update({
            where: { email },
            data: {
                isActive: false,
                updatedAt: new Date()
            }
        });

        res.status(200).json({
            success: true,
            message: 'You have been successfully unsubscribed from our newsletter'
        });

    } catch (error) {
        console.error('Newsletter unsubscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing your unsubscription. Please try again.'
        });
    }
};

/**
 * Get newsletter statistics (admin only)
 * @route GET /api/newsletter/stats
 */
exports.getNewsletterStats = async (req, res) => {
    try {
        const [totalSubscribers, activeSubscribers, recentSubscribers] = await Promise.all([
            prisma.newsletter.count(),
            prisma.newsletter.count({ where: { isActive: true } }),
            prisma.newsletter.count({
                where: {
                    isActive: true,
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                    }
                }
            })
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalSubscribers,
                activeSubscribers,
                inactiveSubscribers: totalSubscribers - activeSubscribers,
                recentSubscribers
            }
        });
    } catch (error) {
        console.error('Newsletter stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching newsletter statistics'
        });
    }
};