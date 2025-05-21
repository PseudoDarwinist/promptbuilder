import express from 'express';
import { Buffer } from 'buffer';
import { stepService } from '../services/stepService';

const router = express.Router();

// Get a step with its prompt
router.get('/:id', async (req, res) => {
  try {
    const step = await stepService.getStepWithPrompt(req.params.id);
    res.json(step);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get attachment by ID
router.get('/attachments/:id', async (req, res) => {
  const attachmentId = req.params.id;
  console.log(`[stepRoutes] API GET /attachments/${attachmentId} called.`);
  try {
    console.log(`[stepRoutes] Calling stepService.getAttachment with ID: ${attachmentId}`);
    const attachment = await stepService.getAttachment(attachmentId);
    
    if (!attachment) {
      console.error(`[stepRoutes] Attachment with ID ${attachmentId} not found in service.`);
      return res.status(404).json({ error: 'Attachment not found' });
    }
    console.log(`[stepRoutes] Attachment found: ${attachment.filename}, Type: ${attachment.file_type}, Size: ${attachment.file_size}`);
    console.log(`[stepRoutes] Attachment file_data (first 100 chars): ${attachment.file_data ? attachment.file_data.substring(0, 100) : 'No file_data'}`);
    
    // Parse data URL to get content type and data
    if (!attachment.file_data || typeof attachment.file_data !== 'string') {
      console.error(`[stepRoutes] Invalid or missing file_data for attachment ID ${attachmentId}`);
      return res.status(500).json({ error: 'Invalid or missing file data for attachment' });
    }
    
    const matches = attachment.file_data.match(/^data:(.+);base64,(.*)$/);
    
    if (!matches || matches.length < 3) {
      console.error(`[stepRoutes] Invalid file_data format for attachment ID ${attachmentId}. Data: ${attachment.file_data.substring(0,100)}`);
      return res.status(400).json({ error: 'Invalid file data format' });
    }
    
    const contentType = matches[1];
    const data = Buffer.from(matches[2], 'base64');
    
    console.log(`[stepRoutes] Successfully parsed. ContentType: ${contentType}, Data length: ${data.length}`);
    
    // Set Content-Disposition for download
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.setHeader('Content-Type', contentType);
    console.log(`[stepRoutes] Sending file ${attachment.filename} to client.`);
    res.send(data);
  } catch (error) {
    console.error(`[stepRoutes] Error in GET /attachments/${attachmentId}:`, error);
    // Send a JSON error response instead of default HTML error page
    res.status(500).json({ 
      error: 'Server error while fetching attachment', 
      message: error.message,
      stack: error.stack // Always include stack if available
    });
  }
});

// View attachment (inline)
router.get('/attachments/:id/view', async (req, res) => {
  const attachmentId = req.params.id;
  console.log(`[stepRoutes] API GET /attachments/${attachmentId}/view called.`);
  try {
    console.log(`[stepRoutes] Calling stepService.getAttachment with ID: ${attachmentId} for view`);
    const attachment = await stepService.getAttachment(attachmentId);
    
    if (!attachment) {
      console.error(`[stepRoutes] Attachment with ID ${attachmentId} not found in service for view.`);
      return res.status(404).json({ error: 'Attachment not found for view' });
    }
    console.log(`[stepRoutes] Attachment found for view: ${attachment.filename}, Type: ${attachment.file_type}, Size: ${attachment.file_size}`);
    console.log(`[stepRoutes] Attachment file_data for view (first 100 chars): ${attachment.file_data ? attachment.file_data.substring(0, 100) : 'No file_data'}`);

    if (!attachment.file_data || typeof attachment.file_data !== 'string') {
      console.error(`[stepRoutes] Invalid or missing file_data for attachment ID ${attachmentId} (view)`);
      return res.status(500).json({ error: 'Invalid or missing file data for attachment (view)' });
    }

    const matches = attachment.file_data.match(/^data:(.+);base64,(.*)$/);
    
    if (!matches || matches.length < 3) {
      console.error(`[stepRoutes] Invalid file_data format for attachment ID ${attachmentId} (view). Data: ${attachment.file_data.substring(0,100)}`);
      return res.status(400).json({ error: 'Invalid file data format (view)' });
    }
    
    const contentType = matches[1];
    const data = Buffer.from(matches[2], 'base64');
    
    console.log(`[stepRoutes] Successfully parsed for view. ContentType: ${contentType}, Data length: ${data.length}`);

    // Set Content-Disposition for inline viewing
    res.setHeader('Content-Disposition', `inline; filename="${attachment.filename}"`);
    res.setHeader('Content-Type', contentType);
    console.log(`[stepRoutes] Sending file ${attachment.filename} for inline view to client.`);
    res.send(data);
  } catch (error) {
    console.error(`[stepRoutes] Error in GET /attachments/${attachmentId}/view:`, error);
    res.status(500).json({ 
      error: 'Server error while fetching attachment for view', 
      message: error.message,
      stack: error.stack // Always include stack if available
    });
  }
});

// Delete attachment
router.delete('/attachments/:id', async (req, res) => {
  try {
    const result = await stepService.deleteAttachment(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new step
router.post('/', async (req, res) => {
  try {
    const step = await stepService.createStep(req.body);
    res.status(201).json(step);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a step
router.put('/:id', async (req, res) => {
  try {
    const step = await stepService.updateStep(req.params.id, req.body);
    res.json(step);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a step
router.delete('/:id', async (req, res) => {
  try {
    const result = await stepService.deleteStep(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reorder steps
router.post('/reorder', async (req, res) => {
  try {
    const steps = await stepService.reorderSteps(req.body.journey_id, req.body.step_ids);
    res.json(steps);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router; 