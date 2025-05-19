import dbService from '../db/database-service';

// Removed unused getDB function

export const stepService = {
  // Get a step with its prompt
  async getStepWithPrompt(stepId) {
    try {
      // Get step
      const step = await dbService.get('SELECT * FROM steps WHERE id = ?', [stepId]);
    
      if (!step) {
        throw new Error(`Step with ID ${stepId} not found`);
      }
      
      // Get prompt for step
      const prompt = await dbService.get('SELECT * FROM prompts WHERE step_id = ?', [step.id]);
    
      // Get tags for prompt if available
      let tags = [];
      // Get attachments for prompt if available
      let attachments = [];
      
      if (prompt) {
        tags = await dbService.all(`
          SELECT t.id, t.name 
          FROM tags t
          JOIN prompt_tags pt ON t.id = pt.tag_id
          WHERE pt.prompt_id = ?
        `, [prompt.id]);
        
        // console.log(`Retrieved ${tags.length} tags for prompt ${prompt.id}`); // Removed log
        
        // Get attachments list (without file data)
        try {
          // console.log('ATTACHMENT DEBUG: Fetching attachments for prompt ID:', prompt.id); // Removed log
          
          // Make sure prompt.id is a valid number
          if (typeof prompt.id !== 'number') {
            console.error(`Invalid prompt ID type in getStepWithPrompt: ${typeof prompt.id}, value: ${prompt.id}`);
            throw new Error('Prompt ID must be a number');
          }
          
          attachments = await dbService.all(`
            SELECT id, filename, file_type, file_size, created_at
            FROM prompt_attachments
            WHERE prompt_id = ?
          `, [prompt.id]);
          
          // Validate retrieved attachments
          if (Array.isArray(attachments)) {
            const validAttachments = attachments.filter(a => a && a.filename && a.id);
            if (validAttachments.length !== attachments.length) {
              console.warn('Some retrieved attachments have invalid data structure, filtering them out');
              attachments = validAttachments;
            }
          } else {
            console.error('Retrieved attachments is not an array:', attachments);
            attachments = [];
          }
          
          // console.log('ATTACHMENT DEBUG: Retrieved attachments:', attachments.map(a => ({id: a.id, filename: a.filename}))); // Removed log
          // console.log(`ATTACHMENT DEBUG: Retrieved ${attachments.length} attachments for prompt ${prompt.id}`); // Removed log
        } catch (attachmentError) {
          console.error('ATTACHMENT DEBUG: Error fetching attachments:', attachmentError);
          attachments = []; // Ensure we don't break even if attachments fail
        }
      }
      
      // console.log(`Retrieved step ${stepId} with prompt:`, prompt ? `ID ${prompt.id}` : 'no prompt'); // Removed log
    
      // Make a clean return object with clear structure
      const returnObj = { 
        ...step, 
        prompt: prompt ? { 
          ...prompt, 
          tags, 
          attachments 
        } : null 
      };
      
      // console.log('ATTACHMENT DEBUG: Final step object structure:', JSON.stringify({ // Removed log
      //   ...returnObj,
      //   prompt: returnObj.prompt ? {
      //     ...returnObj.prompt,
      //     content: returnObj.prompt.content ? '[CONTENT]' : null,
      //     attachments: returnObj.prompt.attachments ? 
      //       `[${returnObj.prompt.attachments.length} attachments]` : []
      //   } : null
      // }, null, 2));
      
      return returnObj;
    } catch (error) {
      console.error(`Error fetching step with ID ${stepId}:`, error);
      throw error;
    }
  },
  
  // Get all steps for a journey with their prompts
  async getStepsWithPrompts(journeyId) {
    try {
      // Get steps for journey
      const steps = await dbService.all(
        'SELECT * FROM steps WHERE journey_id = ? ORDER BY position ASC',
        [journeyId]
      );
    
      // console.log(`Retrieved ${steps.length} steps for journey ${journeyId}`); // Removed log
      
      // For each step, get its prompt and tags
      const stepsWithPrompts = await Promise.all(steps.map(async (step) => {
        const prompt = await dbService.get('SELECT * FROM prompts WHERE step_id = ?', [step.id]);
        
        let tags = [];
        let attachments = [];
      
        if (prompt) {
          tags = await dbService.all(`
            SELECT t.id, t.name 
            FROM tags t
            JOIN prompt_tags pt ON t.id = pt.tag_id
            WHERE pt.prompt_id = ?
          `, [prompt.id]);
          
          // Get attachments list (without file data)
          // Add similar validation as in getStepWithPrompt
          try {
            if (typeof prompt.id !== 'number') {
              console.error(`Invalid prompt ID type in getStepsWithPrompts: ${typeof prompt.id}, value: ${prompt.id}`);
              throw new Error('Prompt ID must be a number');
            }
            attachments = await dbService.all(`
              SELECT id, filename, file_type, file_size, created_at
              FROM prompt_attachments
              WHERE prompt_id = ?
            `, [prompt.id]);
            
            if (!Array.isArray(attachments)) {
              console.error('Retrieved attachments is not an array in getStepsWithPrompts:', attachments);
              attachments = [];
            } else {
              // Filter invalid ones silently for bulk load
              attachments = attachments.filter(a => a && a.filename && a.id);
            }
          } catch (attachmentError) {
            console.error(`Error fetching attachments for prompt ${prompt.id} in getStepsWithPrompts:`, attachmentError);
            attachments = [];
          }
        }
        
        return { ...step, prompt: prompt ? { ...prompt, tags, attachments } : null };
      }));
      
      return stepsWithPrompts;
    } catch (error) {
      console.error(`Error fetching steps for journey ${journeyId}:`, error);
      throw error;
    }
  },
  
  // Get attachment by ID
  async getAttachment(attachmentId) {
    try {
      const attachment = await dbService.get('SELECT * FROM prompt_attachments WHERE id = ?', [attachmentId]);
      
      if (!attachment) {
        throw new Error(`Attachment with ID ${attachmentId} not found`);
      }
      
      return attachment;
    } catch (error) {
      console.error(`Error fetching attachment with ID ${attachmentId}:`, error);
      throw error;
    }
  },
  
  // Add attachment to a prompt
  async addAttachment(promptId, attachment) {
    // console.log(`STEP_SERVICE DEBUG: addAttachment called with promptId: ${promptId} (type: ${typeof promptId}), filename: ${attachment?.filename}`); // Removed log
    try {
      // Validate promptId is a valid number
      if (!promptId || typeof promptId !== 'number') {
        console.error(`STEP_SERVICE DEBUG: Invalid prompt ID: ${promptId} (type: ${typeof promptId})`);
        throw new Error('Prompt ID is required and must be a number');
      }
      
      if (!attachment || !attachment.file_data) {
        console.error(`STEP_SERVICE DEBUG: Missing attachment data for file ${attachment?.filename}`);
        throw new Error('Attachment file data is required');
      }
      
      // console.log(`STEP_SERVICE DEBUG: Proceeding to add attachment for prompt ID: ${promptId}`); // Removed log

      // Use dbService.run which handles the database interaction including prompt check
      const result = await dbService.run(
        'INSERT INTO prompt_attachments (prompt_id, filename, file_type, file_size, file_data) VALUES (?, ?, ?, ?, ?)',
        [
          promptId,
          attachment.filename,
          attachment.file_type,
          attachment.file_size,
          attachment.file_data
        ]
      );

      if (!result || !result.lastID) {
        console.error(`STEP_SERVICE DEBUG: dbService.run did not return a valid result for attachment insert.`);
        throw new Error('Failed to insert attachment into database.');
      }

      const id = result.lastID;
      // console.log(`STEP_SERVICE DEBUG: Successfully added attachment with ID ${id} to prompt ${promptId}`); // Removed log
        
      return {
        id,
        prompt_id: promptId,
        filename: attachment.filename,
        file_type: attachment.file_type,
        file_size: attachment.file_size,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`STEP_SERVICE DEBUG: Error in addAttachment for prompt ${promptId}:`, error);
      throw error; // Rethrow so caller can handle
    }
  },
  
  // Delete attachment
  async deleteAttachment(attachmentId) {
    try {
      await dbService.run('DELETE FROM prompt_attachments WHERE id = ?', [attachmentId]);
      return { id: attachmentId, deleted: true };
    } catch (error) {
      console.error(`Error deleting attachment with ID ${attachmentId}:`, error);
      throw error;
    }
  },
  
  // Create a new step
  async createStep(stepData) {
    try {
      if (!stepData) {
        throw new Error('No step data provided');
      }
      
      if (!stepData.journey_id) {
        throw new Error('Journey ID is required');
      }
      
      if (!stepData.step_id || !stepData.title) {
        throw new Error('Step ID and title are required');
      }
      
      // console.log('Creating step with data:', JSON.stringify({ // Removed log
      //   ...stepData,
      //   prompt: stepData.prompt ? {
      //     ...stepData.prompt,
      //     attachments: stepData.prompt.attachments ? 
      //       `[${stepData.prompt.attachments.length} attachments]` : []
      //   } : null
      // }, null, 2));

      // Get current max position for the journey
      const result = await dbService.get(
        'SELECT MAX(position) as maxPos FROM steps WHERE journey_id = ?',
        [stepData.journey_id]
      );
      const position = result && result.maxPos !== null ? result.maxPos + 1 : 0;

      // Insert step
      const stepResult = await dbService.run(
        'INSERT INTO steps (journey_id, step_id, title, description, icon, color, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          stepData.journey_id,
          stepData.step_id,
          stepData.title,
          stepData.description || '',
          stepData.icon || 'Compass',
          stepData.color || '#5B8FB9',
          position
        ]
      );

      const stepId = stepResult.lastID;
      // console.log(`Created step with ID ${stepId}`); // Removed log
      
      // Insert prompt if available
      let promptId = null;
      if (stepData.prompt && stepData.prompt.content) {
        // console.log(`Adding prompt for step ${stepId} with content:`, stepData.prompt.content.substring(0, 50) + '...'); // Removed log
        
        try {
          const promptResult = await dbService.run(
            'INSERT INTO prompts (step_id, content) VALUES (?, ?)',
            [stepId, stepData.prompt.content]
          );
          
          promptId = promptResult.lastID;
          // console.log(`Created prompt with ID ${promptId}`); // Removed log
          
          // Insert tags if available
          if (stepData.prompt.tags && stepData.prompt.tags.length > 0) {
            // console.log(`Adding ${stepData.prompt.tags.length} tags for prompt ${promptId}`); // Removed log
            
            for (const tagName of stepData.prompt.tags) {
              try {
                // Check if tag exists
                let tag = await dbService.get('SELECT id FROM tags WHERE name = ?', [tagName]);
                
                // If tag doesn't exist, create it
                if (!tag) {
                  const tagResult = await dbService.run('INSERT INTO tags (name) VALUES (?)', [tagName]);
                  tag = { id: tagResult.lastID };
                  // console.log(`Created new tag "${tagName}" with ID ${tag.id}`); // Removed log
                } else {
                  // console.log(`Using existing tag "${tagName}" with ID ${tag.id}`); // Removed log
                }
                
                // Associate tag with prompt
                await dbService.run(
                  'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)',
                  [promptId, tag.id]
                );
                // console.log(`Associated tag ${tag.id} with prompt ${promptId}`); // Removed log
              } catch (tagError) {
                console.error(`Error processing tag "${tagName}":`, tagError);
                // Continue with other tags
              }
            }
          }
          
          // Add attachments if available
          if (stepData.prompt.attachments && stepData.prompt.attachments.length > 0) {
            // console.log(`Processing ${stepData.prompt.attachments.length} attachments for prompt ${promptId}`); // Removed log
            
            // Ensure promptId is a valid number
            if (typeof promptId !== 'number') {
              console.error(`Invalid prompt ID type: ${typeof promptId}, value: ${promptId}`);
              throw new Error('Prompt ID must be a number');
            }
            
            // Modified to be more resilient - process each attachment separately
            const attachmentPromises = stepData.prompt.attachments.map(attachment => 
              this.addAttachment(promptId, attachment)
                .catch(err => {
                  console.error(`Failed to add attachment ${attachment.filename}:`, err);
                  return null; // Return null for failed attachments
                })
            );
            
            // Wait for all attachments to be processed (success or failure)
            const results = await Promise.allSettled(attachmentPromises);
            
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
            
            if (successCount < stepData.prompt.attachments.length) {
              console.warn(`Attachment processing partially failed: ${successCount} succeeded`);
            }
          }
        } catch (promptError) {
          console.error(`Error creating prompt for step ${stepId}:`, promptError);
          // Continue even if prompt creation fails
        }
      } else {
        // console.log(`No prompt content provided for step ${stepId}`); // Removed log
      }
      
      // Return the created step with its prompt and tags
      const createdStep = await this.getStepWithPrompt(stepId);
      // console.log('Step created successfully:', createdStep); // Removed log
      return createdStep;
    } catch (error) {
      console.error('Error creating step:', error);
      throw error;
    }
  },
  
  // Update a step
  async updateStep(stepId, stepData) {
    try {
      if (!stepId) {
        throw new Error('Step ID is required for update');
      }
      
      if (!stepData) {
        throw new Error('No update data provided');
      }
      
      // console.log(`Updating step ${stepId} with data:`, JSON.stringify(stepData, null, 2)); // Removed log
    
      // Update step
      await dbService.run(
        'UPDATE steps SET title = ?, description = ?, icon = ?, color = ? WHERE id = ?',
        [
          stepData.title,
          stepData.description || '',
          stepData.icon || 'Compass',
          stepData.color || '#5B8FB9',
          stepId
        ]
      );
    
      // Update prompt if available
      if (stepData.prompt) {
        // Check if prompt exists
        const prompt = await dbService.get('SELECT id FROM prompts WHERE step_id = ?', [stepId]);
      
        if (prompt) {
          // console.log(`Updating existing prompt ${prompt.id} for step ${stepId}`); // Removed log
          
          // Update existing prompt
          await dbService.run(
            'UPDATE prompts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [stepData.prompt.content, prompt.id]
          );
        
          // Update tags if available
          if (stepData.prompt.tags) {
            // console.log(`Updating tags for prompt ${prompt.id}`); // Removed log
            
            // Remove existing tag associations
            await dbService.run('DELETE FROM prompt_tags WHERE prompt_id = ?', [prompt.id]);
          
            // Add new tag associations
            for (const tagName of stepData.prompt.tags) {
              // Check if tag exists
              let tag = await dbService.get('SELECT id FROM tags WHERE name = ?', [tagName]);
            
              // If tag doesn't exist, create it
              if (!tag) {
                const tagResult = await dbService.run('INSERT INTO tags (name) VALUES (?)', [tagName]);
                tag = { id: tagResult.lastID };
                // console.log(`Created new tag "${tagName}" with ID ${tag.id}`); // Removed log
              }
            
              // Associate tag with prompt
              await dbService.run(
                'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)',
                [prompt.id, tag.id]
              );
              // console.log(`Associated tag ${tag.id} with prompt ${prompt.id}`); // Removed log
            }
          }
        
          // Handle attachments if available
          if (stepData.prompt.attachments) {
            // Any new attachments to add
            const newAttachments = stepData.prompt.attachments.filter(a => !a.id);
          
            if (newAttachments.length > 0) {
              // console.log(`Adding ${newAttachments.length} new attachments to prompt ${prompt.id}`); // Removed log
            
              // Ensure prompt.id is a valid number
              if (typeof prompt.id !== 'number') {
                console.error(`Invalid prompt ID type: ${typeof prompt.id}, value: ${prompt.id}`);
                throw new Error('Prompt ID must be a number');
              }
            
              // Track successfully added attachments
              const addedAttachments = [];
              
              // Add new attachments
              for (const attachment of newAttachments) {
                try {
                  const addedAttachment = await this.addAttachment(prompt.id, attachment);
                  if (addedAttachment) {
                    addedAttachments.push(addedAttachment);
                  }
                } catch (attachErr) {
                  console.error(`Failed to add attachment: ${attachErr.message}`);
                  // Continue with other attachments instead of failing completely
                }
              }
              
              // console.log(`Successfully added ${addedAttachments.length} new attachments`); // Removed log
            }
          }
        } else {
          // console.log(`Creating new prompt for step ${stepId}`); // Removed log
          
          // Create new prompt
          const promptResult = await dbService.run(
            'INSERT INTO prompts (step_id, content) VALUES (?, ?)',
            [stepId, stepData.prompt.content]
          );
        
          const promptId = promptResult.lastID;
          // console.log(`Created new prompt with ID ${promptId}`); // Removed log
          
          // Add tags if available
          if (stepData.prompt.tags && stepData.prompt.tags.length > 0) {
            // console.log(`Adding ${stepData.prompt.tags.length} tags for prompt ${promptId}`); // Removed log
            
            for (const tagName of stepData.prompt.tags) {
              // Check if tag exists
              let tag = await dbService.get('SELECT id FROM tags WHERE name = ?', [tagName]);
            
              // If tag doesn't exist, create it
              if (!tag) {
                const tagResult = await dbService.run('INSERT INTO tags (name) VALUES (?)', [tagName]);
                tag = { id: tagResult.lastID };
                // console.log(`Created new tag "${tagName}" with ID ${tag.id}`); // Removed log
              }
            
              // Associate tag with prompt
              await dbService.run(
                'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)',
                [promptId, tag.id]
              );
              // console.log(`Associated tag ${tag.id} with prompt ${promptId}`); // Removed log
            }
          }
        
          // Add attachments if available
          if (stepData.prompt.attachments && stepData.prompt.attachments.length > 0) {
            // console.log(`Adding ${stepData.prompt.attachments.length} attachments for new prompt ${promptId}`); // Removed log
            
            // Ensure promptId is a valid number
            if (typeof promptId !== 'number') {
              console.error(`Invalid prompt ID type: ${typeof promptId}, value: ${promptId}`);
              throw new Error('Prompt ID must be a number');
            }
            
            // Track successfully added attachments
            const addedAttachments = [];
            
            for (const attachment of stepData.prompt.attachments) {
              try {
                const addedAttachment = await this.addAttachment(promptId, attachment);
                if (addedAttachment) {
                  addedAttachments.push(addedAttachment);
                }
              } catch (attachErr) {
                console.error(`Failed to add attachment: ${attachErr.message}`);
                // Continue with other attachments instead of failing completely
              }
            }
            
            // console.log(`Successfully added ${addedAttachments.length} attachments to new prompt`); // Removed log
          }
        }
      }
    
      // Wait a moment to ensure database operations complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Return the updated step with its prompt and tags
      const updatedStep = await this.getStepWithPrompt(stepId);
      // console.log('Step updated successfully:', JSON.stringify({ // Removed log
      //   id: updatedStep.id,
      //   title: updatedStep.title,
      //   has_prompt: !!updatedStep.prompt,
      //   attachment_count: updatedStep.prompt?.attachments?.length || 0
      // }));
      return updatedStep;
    } catch (error) {
      console.error(`Error updating step with ID ${stepId}:`, error);
      throw error;
    }
  },
  
  // Delete a step
  async deleteStep(stepId) {
    try {
      if (!stepId) {
        throw new Error('Step ID is required for deletion');
      }
      
      // console.log(`Deleting step ${stepId}`); // Removed log
    
      // Get step to check its journey_id and position
      const step = await dbService.get('SELECT journey_id, position FROM steps WHERE id = ?', [stepId]);
    
      if (!step) {
        throw new Error(`Step with ID ${stepId} not found`);
      }
    
      // Delete step (will cascade delete prompts and tag associations)
      await dbService.run('DELETE FROM steps WHERE id = ?', [stepId]);
      // console.log(`Step ${stepId} deleted`); // Removed log
    
      // Update positions of remaining steps
      await dbService.run(
        'UPDATE steps SET position = position - 1 WHERE journey_id = ? AND position > ?',
        [step.journey_id, step.position]
      );
      // console.log(`Updated positions for steps in journey ${step.journey_id}`); // Removed log
    
      return { id: stepId, deleted: true };
    } catch (error) {
      console.error(`Error deleting step with ID ${stepId}:`, error);
      throw error;
    }
  },
  
  // Reorder steps for a journey
  async reorderSteps(journeyId, stepIds) {
    try {
      if (!journeyId) {
        throw new Error('Journey ID is required');
      }
      
      if (!stepIds || !Array.isArray(stepIds) || stepIds.length === 0) {
        throw new Error('Step IDs array is required for reordering');
      }
      
      // console.log(`Reordering ${stepIds.length} steps for journey ${journeyId}`); // Removed log
      
      // Update positions based on the new order
      for (let i = 0; i < stepIds.length; i++) {
        await dbService.run(
          'UPDATE steps SET position = ? WHERE id = ? AND journey_id = ?',
          [i, stepIds[i], journeyId]
        );
      }
      
      // Return the updated steps
      return this.getStepsWithPrompts(journeyId);
    } catch (error) {
      console.error(`Error reordering steps for journey ${journeyId}:`, error);
      throw error;
    }
  }
};