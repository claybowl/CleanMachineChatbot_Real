import { db } from './db';
import { MailService } from '@sendgrid/mail';
import { 
  customers,
  emailCampaigns,
  emailTemplates,
  emailSubscribers,
  type InsertEmailCampaign,
  type InsertEmailTemplate
} from '@shared/schema';
import { eq, ne, gt, lt, and, desc, sql } from 'drizzle-orm';
import OpenAI from 'openai';

// Initialize SendGrid
const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY || '');

// Initialize OpenAI for content generation
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interface for campaign data
export interface CampaignData {
  id?: number;
  name: string;
  subject: string;
  content: string;
  scheduledDate: string | null;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  targetAudience: string;
  recipientCount: number;
}

// Interface for template data
export interface TemplateData {
  id?: number;
  name: string;
  subject: string;
  content: string;
  category: string;
}

/**
 * Get all email campaigns
 */
export async function getAllCampaigns() {
  try {
    return await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt));
  } catch (error) {
    console.error('Error getting campaigns:', error);
    throw new Error('Failed to retrieve email campaigns');
  }
}

/**
 * Get campaign by ID
 */
export async function getCampaignById(id: number) {
  try {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id));
    
    return campaign || null;
  } catch (error) {
    console.error('Error getting campaign by ID:', error);
    throw new Error('Failed to retrieve email campaign');
  }
}

/**
 * Create a new email campaign
 */
export async function createCampaign(campaignData: CampaignData) {
  try {
    const insertData: InsertEmailCampaign = {
      name: campaignData.name,
      subject: campaignData.subject,
      content: campaignData.content,
      scheduledDate: campaignData.scheduledDate ? new Date(campaignData.scheduledDate) : null,
      status: campaignData.status,
      targetAudience: campaignData.targetAudience,
      recipientCount: campaignData.recipientCount
    };
    
    const [newCampaign] = await db.insert(emailCampaigns).values(insertData).returning();
    
    // If scheduled for a future date, set up a job to send it
    if (campaignData.status === 'scheduled' && campaignData.scheduledDate) {
      scheduleEmailCampaign(newCampaign.id, new Date(campaignData.scheduledDate));
    }
    
    return newCampaign;
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw new Error('Failed to create email campaign');
  }
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(id: number, campaignData: Partial<CampaignData>) {
  try {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id));
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Don't allow updates to sent campaigns
    if (campaign.status === 'sent') {
      throw new Error('Cannot update a campaign that has already been sent');
    }
    
    const updateData: Partial<InsertEmailCampaign> = {
      name: campaignData.name,
      subject: campaignData.subject,
      content: campaignData.content,
      status: campaignData.status,
      targetAudience: campaignData.targetAudience,
      recipientCount: campaignData.recipientCount
    };
    
    if (campaignData.scheduledDate) {
      updateData.scheduledDate = new Date(campaignData.scheduledDate);
      
      // If status changed to scheduled, set up the job
      if (campaignData.status === 'scheduled' && campaign.status !== 'scheduled') {
        scheduleEmailCampaign(id, new Date(campaignData.scheduledDate));
      }
    }
    
    const [updatedCampaign] = await db
      .update(emailCampaigns)
      .set(updateData)
      .where(eq(emailCampaigns.id, id))
      .returning();
    
    return updatedCampaign;
  } catch (error) {
    console.error('Error updating campaign:', error);
    throw new Error('Failed to update email campaign');
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: number) {
  try {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id));
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Don't allow deletion of sent campaigns
    if (campaign.status === 'sent') {
      throw new Error('Cannot delete a campaign that has already been sent');
    }
    
    await db
      .delete(emailCampaigns)
      .where(eq(emailCampaigns.id, id));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting campaign:', error);
    throw new Error('Failed to delete email campaign');
  }
}

/**
 * Cancel a scheduled campaign
 */
export async function cancelCampaign(id: number) {
  try {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id));
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    if (campaign.status !== 'scheduled') {
      throw new Error('Only scheduled campaigns can be cancelled');
    }
    
    const [cancelledCampaign] = await db
      .update(emailCampaigns)
      .set({ status: 'cancelled' })
      .where(eq(emailCampaigns.id, id))
      .returning();
    
    return cancelledCampaign;
  } catch (error) {
    console.error('Error cancelling campaign:', error);
    throw new Error('Failed to cancel email campaign');
  }
}

/**
 * Send a campaign immediately
 */
export async function sendCampaignNow(id: number) {
  try {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id));
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    if (campaign.status === 'sent') {
      throw new Error('Campaign has already been sent');
    }
    
    // Fetch recipients based on target audience
    const recipients = await getRecipientsByAudience(campaign.targetAudience || 'all');
    
    if (recipients.length === 0) {
      throw new Error('No recipients found for this campaign');
    }
    
    // Send the campaign
    await sendEmailCampaign(campaign, recipients);
    
    // Update campaign status
    const [sentCampaign] = await db
      .update(emailCampaigns)
      .set({ 
        status: 'sent',
        sentAt: new Date() 
      })
      .where(eq(emailCampaigns.id, id))
      .returning();
    
    return sentCampaign;
  } catch (error) {
    console.error('Error sending campaign:', error);
    throw new Error('Failed to send email campaign');
  }
}

/**
 * Get all templates
 */
export async function getAllTemplates() {
  try {
    return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.lastUsed));
  } catch (error) {
    console.error('Error getting templates:', error);
    throw new Error('Failed to retrieve email templates');
  }
}

/**
 * Create a new template
 */
export async function createTemplate(templateData: TemplateData) {
  try {
    const insertData: InsertEmailTemplate = {
      name: templateData.name,
      subject: templateData.subject,
      content: templateData.content,
      category: templateData.category
    };
    
    const [newTemplate] = await db.insert(emailTemplates).values(insertData).returning();
    return newTemplate;
  } catch (error) {
    console.error('Error creating template:', error);
    throw new Error('Failed to create email template');
  }
}

/**
 * Update a template
 */
export async function updateTemplate(id: number, templateData: Partial<TemplateData>) {
  try {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set({
        name: templateData.name ?? template.name,
        subject: templateData.subject ?? template.subject,
        content: templateData.content ?? template.content,
        category: templateData.category ?? template.category,
      })
      .where(eq(emailTemplates.id, id))
      .returning();
    
    return updatedTemplate;
  } catch (error) {
    console.error('Error updating template:', error);
    throw new Error('Failed to update email template');
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: number) {
  try {
    await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.id, id));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting template:', error);
    throw new Error('Failed to delete email template');
  }
}

/**
 * Get all customers for email campaigns
 */
export async function getEmailCustomers() {
  try {
    // First try to get customers from the database
    let customerList: Array<{ id: number; name: string; email: string | null; phone: string | null }> = [];
    try {
      customerList = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone
        })
        .from(customers)
        .where(
          and(
            sql`${customers.email} IS NOT NULL`,
            sql`${customers.email} != ''`
          )
        );
    } catch (dbError) {
      console.log('Database query for customers failed, will use Google Sheets instead:', dbError);
      customerList = [];
    }
    
    // If no customers from database, fetch from Google Sheets
    if (customerList.length === 0) {
      try {
        // Import the customer search function
        const { getAllCustomers } = await import('./customerSearch');
        const sheetCustomers = await getAllCustomers();
        
        // Map sheet customers to our expected format
        customerList = sheetCustomers
          .filter(customer => customer.email && customer.email.trim() !== '')
          .map(customer => ({
            id: parseInt(customer.id || String(Date.now() + Math.floor(Math.random() * 1000))),
            name: customer.name || 'Unknown',
            email: customer.email,
            phone: customer.phone || ''
          }));
      } catch (sheetError) {
        console.error('Error fetching customers from Google Sheets:', sheetError);
      }
    }
    
    // Get unsubscribed list
    const unsubscribed = await db
      .select({
        email: emailSubscribers.email
      })
      .from(emailSubscribers)
      .where(eq(emailSubscribers.subscribed, false));
    
    const unsubscribedEmails = new Set(unsubscribed.map(u => u.email.toLowerCase()));
    
    // Mark customers as unsubscribed
    return customerList.map(customer => ({
      ...customer,
      unsubscribed: customer.email ? unsubscribedEmails.has(customer.email.toLowerCase()) : false
    }));
  } catch (error) {
    console.error('Error getting email customers:', error);
    throw new Error('Failed to retrieve email customers');
  }
}

/**
 * Generate email content using AI
 */
export async function generateEmailContent(prompt: string, template?: string) {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const contextTemplate = template ? `Use this as inspiration: ${template}` : '';
    const systemPrompt = `You are an expert email marketing copywriter for an auto detailing business called "Clean Machine". 
    Write compelling email marketing content that converts. Your content should be concise, engaging, and focused on the customer benefits.
    Include a subject line and email body content. Format the response as a JSON object with 'subject' and 'content' fields.
    ${contextTemplate}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated');
    }
    
    try {
      const parsed = JSON.parse(content);
      return {
        subject: parsed.subject || 'Your Clean Machine Special Offer',
        content: parsed.content || 'Content could not be generated.'
      };
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Extract subject and content if possible
      const subjectMatch = content.match(/subject[":]+\s*"([^"]+)"/i);
      const contentMatch = content.match(/content[":]+\s*"([^"]+)"/i);
      
      return {
        subject: subjectMatch ? subjectMatch[1] : 'Your Clean Machine Special Offer',
        content: contentMatch ? contentMatch[1] : content
      };
    }
  } catch (error) {
    console.error('Error generating email content:', error);
    throw new Error('Failed to generate email content');
  }
}

/**
 * Subscribe or unsubscribe a customer from email campaigns
 */
export async function updateSubscription(email: string, subscribed: boolean) {
  try {
    // Check if subscriber exists
    const [existing] = await db
      .select()
      .from(emailSubscribers)
      .where(eq(emailSubscribers.email, email.toLowerCase()));
    
    if (existing) {
      // Update existing
      await db
        .update(emailSubscribers)
        .set({ subscribed })
        .where(eq(emailSubscribers.email, email.toLowerCase()));
    } else {
      // Create new
      await db
        .insert(emailSubscribers)
        .values({
          email: email.toLowerCase(),
          subscribed,
          unsubscribedAt: subscribed ? null : new Date()
        });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw new Error('Failed to update subscription');
  }
}

/**
 * Schedule an email campaign for future sending
 */
function scheduleEmailCampaign(campaignId: number, scheduledDate: Date) {
  const now = new Date();
  const delay = scheduledDate.getTime() - now.getTime();
  
  if (delay <= 0) {
    // If the scheduled date is in the past, send immediately
    sendCampaignNow(campaignId).catch(error => {
      console.error(`Error sending immediate campaign ${campaignId}:`, error);
    });
    return;
  }
  
  // Schedule for future (in a real system, this would use a job queue like Bull)
  setTimeout(async () => {
    try {
      // Check if the campaign is still scheduled
      const [campaign] = await db
        .select()
        .from(emailCampaigns)
        .where(
          and(
            eq(emailCampaigns.id, campaignId),
            eq(emailCampaigns.status, 'scheduled')
          )
        );
      
      if (campaign) {
        await sendCampaignNow(campaignId);
      }
    } catch (error) {
      console.error(`Error sending scheduled campaign ${campaignId}:`, error);
    }
  }, delay);
  
  console.log(`Campaign ${campaignId} scheduled to be sent on ${scheduledDate}`);
}

/**
 * Get recipients based on audience targeting
 */
async function getRecipientsByAudience(targetAudience: string) {
  // Get all active subscribers
  const activeSubscribers = await db
    .select({
      email: emailSubscribers.email
    })
    .from(emailSubscribers)
    .where(eq(emailSubscribers.subscribed, true));
  
  const subscribedEmails = new Set(activeSubscribers.map(s => s.email.toLowerCase()));
  
  // Get customers based on targeting
  let query = db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email
    })
    .from(customers)
    .where(
      and(
        sql`${customers.email} IS NOT NULL`,
        sql`${customers.email} != ''`
      )
    );
  
  switch (targetAudience) {
    case 'repeat_customers':
      // Customers with more than one service
      // Filter would require counting appointments - for now just use all
      // In production: JOIN with appointments and GROUP BY to count
      break;
    case 'new_customers':
      // New customers in the last 90 days
      // Filter would require createdAt field on customers table
      // For now, send to all customers
      break;
    case 'premium_customers':
      // Customers who have spent more than $500
      // Filter would require totalSpent field on customers table
      // For now, send to all customers
      break;
    // 'all' customers - no additional filters
  }
  
  const potentialRecipients = await query;
  
  // Filter to only include subscribed emails
  return potentialRecipients.filter(
    customer => customer.email && subscribedEmails.has(customer.email.toLowerCase())
  );
}

/**
 * Send an email campaign to recipients
 */
async function sendEmailCampaign(campaign: any, recipients: any[]) {
  // In production, we'd batch these sends to avoid rate limits
  const sendPromises = recipients.map(recipient => {
    const personalizedContent = personalizeCampaignContent(campaign.content, recipient);
    
    const msg = {
      to: recipient.email,
      from: 'cleanmachinetulsa@gmail.com',
      subject: campaign.subject,
      html: personalizedContent,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      },
      customArgs: {
        campaign_id: campaign.id.toString()
      }
    };
    
    return mailService.send(msg);
  });
  
  await Promise.all(sendPromises);
  
  // Update campaign status
  await db
    .update(emailCampaigns)
    .set({
      status: 'sent',
      sentAt: new Date(),
      recipientCount: recipients.length
    })
    .where(eq(emailCampaigns.id, campaign.id));
  
  return {
    success: true,
    recipientCount: recipients.length
  };
}

/**
 * Personalize email content for recipient
 */
function personalizeCampaignContent(content: string, recipient: any): string {
  let personalized = content;
  
  // Replace placeholder tokens with recipient data
  personalized = personalized.replace(/\{name\}/g, recipient.name || 'Valued Customer');
  personalized = personalized.replace(/\{email\}/g, recipient.email);
  
  // Add unsubscribe link
  const unsubscribeLink = `https://www.cleanmachine.com/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
  personalized += `<br><br><p style="font-size: 12px; color: #888;">If you no longer wish to receive these emails, <a href="${unsubscribeLink}">click here to unsubscribe</a>.</p>`;
  
  return personalized;
}