import { Express, Request, Response } from 'express';
import { db } from './db';
import { services } from '../shared/schema';
import { eq } from 'drizzle-orm';

export function registerServiceManagementRoutes(app: Express) {
  // Get all services from database
  app.get('/api/admin/services', async (req: Request, res: Response) => {
    try {
      const allServices = await db.select().from(services);
      res.json({ success: true, services: allServices });
    } catch (error) {
      console.error('Error fetching services from database:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch services' 
      });
    }
  });

  // Get a single service by ID
  app.get('/api/admin/services/:id', async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.id);
      const service = await db.select().from(services).where(eq(services.id, serviceId));
      
      if (service.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Service not found' 
        });
      }
      
      res.json({ success: true, service: service[0] });
    } catch (error) {
      console.error('Error fetching service:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch service' 
      });
    }
  });

  // Create a new service
  app.post('/api/admin/services', async (req: Request, res: Response) => {
    try {
      const { name, priceRange, overview, detailedDescription, duration, durationHours, imageUrl } = req.body;
      
      if (!name || !priceRange || !overview || !detailedDescription || !duration || !durationHours) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }

      const newService = await db.insert(services).values({
        name,
        priceRange,
        overview,
        detailedDescription,
        duration,
        durationHours: durationHours.toString(),
        imageUrl: imageUrl || null
      }).returning();

      res.json({ success: true, service: newService[0] });
    } catch (error) {
      console.error('Error creating service:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create service' 
      });
    }
  });

  // Update a service
  app.put('/api/admin/services/:id', async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { name, priceRange, overview, detailedDescription, duration, durationHours, imageUrl } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (priceRange !== undefined) updateData.priceRange = priceRange;
      if (overview !== undefined) updateData.overview = overview;
      if (detailedDescription !== undefined) updateData.detailedDescription = detailedDescription;
      if (duration !== undefined) updateData.duration = duration;
      if (durationHours !== undefined) updateData.durationHours = durationHours.toString();
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

      const updatedService = await db
        .update(services)
        .set(updateData)
        .where(eq(services.id, serviceId))
        .returning();

      if (updatedService.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Service not found' 
        });
      }

      res.json({ success: true, service: updatedService[0] });
    } catch (error) {
      console.error('Error updating service:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update service' 
      });
    }
  });

  // Delete a service
  app.delete('/api/admin/services/:id', async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.id);
      
      const deletedService = await db
        .delete(services)
        .where(eq(services.id, serviceId))
        .returning();

      if (deletedService.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Service not found' 
        });
      }

      res.json({ success: true, message: 'Service deleted successfully' });
    } catch (error) {
      console.error('Error deleting service:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete service' 
      });
    }
  });
}
