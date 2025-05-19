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
  try {
    const attachment = await stepService.getAttachment(req.params.id);
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Parse data URL to get content type and data
    const matches = attachment.file_data.match(/^data:(.+);base64,(.*)$/);
    
    if (!matches) {
      return res.status(400).json({ error: 'Invalid file data format' });
    }
    
    const contentType = matches[1];
    const data = Buffer.from(matches[2], 'base64');
    
    // Set Content-Disposition for download
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// View attachment (inline)
router.get('/attachments/:id/view', async (req, res) => {
  try {
    const attachment = await stepService.getAttachment(req.params.id);
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Parse data URL to get content type and data
    const matches = attachment.file_data.match(/^data:(.+);base64,(.*)$/);
    
    if (!matches) {
      return res.status(400).json({ error: 'Invalid file data format' });
    }
    
    const contentType = matches[1];
    const data = Buffer.from(matches[2], 'base64');
    
    // Set Content-Disposition for inline viewing
    res.setHeader('Content-Disposition', `inline; filename="${attachment.filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
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