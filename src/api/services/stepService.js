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
            SELECT id, filename, file_type, file_size, created_at, file_data
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
              SELECT id, filename, file_type, file_size, created_at, file_data
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
    console.log(`[DEBUG] addAttachment called with: 
      promptId: ${promptId} (type: ${typeof promptId})
      attachment filename: ${attachment?.filename}
      attachment type: ${attachment?.file_type}
      attachment size: ${attachment?.file_size}
      attachment data length: ${attachment?.file_data?.length || 0}
    `);
    
    try {
      // Validate promptId is a valid number
      if (!promptId || typeof promptId !== 'number') {
        console.error(`[ERROR] Invalid prompt ID: ${promptId} (type: ${typeof promptId})`);
        throw new Error('Prompt ID is required and must be a number');
      }
      
      if (!attachment || !attachment.file_data) {
        console.error(`[ERROR] Missing attachment data for file ${attachment?.filename}`);
        throw new Error('Attachment file data is required');
      }
      
      console.log(`[DEBUG] Proceeding to add attachment for prompt ID: ${promptId}`);

      // Use dbService.run which handles the database interaction including prompt check
      console.log(`[DEBUG] Calling dbService.run to insert attachment`);
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
      console.log(`[DEBUG] dbService.run result:`, result);

      if (!result || !result.lastID) {
        console.error(`[ERROR] dbService.run did not return a valid result for attachment insert.`);
        throw new Error('Failed to insert attachment into database.');
      }

      const id = result.lastID;
      console.log(`[DEBUG] Successfully added attachment with ID ${id} to prompt ${promptId}`);
        
      return {
        id,
        prompt_id: promptId,
        filename: attachment.filename,
        file_type: attachment.file_type,
        file_size: attachment.file_size,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[ERROR] Error in addAttachment for prompt ${promptId}:`, error);
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
      console.log(`[DEBUG] createStep called with data:`, {
        journey_id: stepData?.journey_id,
        step_id: stepData?.step_id,
        title: stepData?.title,
        has_prompt: !!stepData?.prompt,
        has_attachments: !!(stepData?.prompt?.attachments?.length),
        attachment_count: stepData?.prompt?.attachments?.length || 0
      });

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
        console.log(`[DEBUG] Adding prompt for step ${stepId} with content length:`, 
          stepData.prompt.content?.length || 0);
        
        try {
          const promptResult = await dbService.run(
            'INSERT INTO prompts (step_id, content) VALUES (?, ?)',
            [stepId, stepData.prompt.content]
          );
          
          promptId = promptResult.lastID;
          console.log(`[DEBUG] Created prompt with ID ${promptId}`);
          
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
            console.log(`[DEBUG] Processing ${stepData.prompt.attachments.length} attachments for prompt ${promptId}`);
            console.log(`[DEBUG] Attachment details:`, stepData.prompt.attachments.map(a => ({
              filename: a.filename,
              type: a.file_type,
              size: a.file_size,
              has_data: !!a.file_data,
              data_length: a.file_data?.length || 0
            })));
            
            // Ensure promptId is a valid number
            if (typeof promptId !== 'number') {
              console.error(`[ERROR] Invalid prompt ID type: ${typeof promptId}, value: ${promptId}`);
              throw new Error('Prompt ID must be a number');
            }
            
            // Modified to be more resilient - process each attachment separately
            const attachmentPromises = stepData.prompt.attachments.map(attachment => 
              this.addAttachment(promptId, attachment)
                .catch(err => {
                  console.error(`[ERROR] Failed to add attachment ${attachment.filename}:`, err);
                  return null; // Return null for failed attachments
                })
            );
            
            // Wait for all attachments to be processed (success or failure)
            const results = await Promise.allSettled(attachmentPromises);
            
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
            
            console.log(`[DEBUG] Attachment processing results: ${successCount} of ${stepData.prompt.attachments.length} succeeded`);
            results.forEach((result, index) => {
              const filename = stepData.prompt.attachments[index]?.filename || 'unknown';
              if (result.status === 'fulfilled' && result.value) {
                console.log(`[DEBUG] Successfully added attachment: ${filename}`);
              } else {
                console.error(`[ERROR] Failed to add attachment: ${filename}`, 
                  result.status === 'rejected' ? result.reason : 'No value returned');
              }
            });
          } else {
            console.log(`[DEBUG] No attachments to process for step ${stepId}`);
          }
        } catch (promptError) {
          console.error(`[ERROR] Error creating prompt for step ${stepId}:`, promptError);
          // Continue even if prompt creation fails
        }
      } else {
        console.log(`[DEBUG] No prompt content provided for step ${stepId}`);
      }
      
      // Return the created step with its prompt and tags
      const createdStep = await this.getStepWithPrompt(stepId);
      console.log('[DEBUG] Step created successfully with details:', {
        id: createdStep.id,
        title: createdStep.title,
        has_prompt: !!createdStep.prompt,
        has_attachments: !!(createdStep.prompt?.attachments?.length),
        attachment_count: createdStep.prompt?.attachments?.length || 0
      });
      return createdStep;
    } catch (error) {
      console.error('[ERROR] Error creating step:', error);
      throw error;
    }
  },
  
  // Update a step
  async updateStep(stepId, stepData) {
    try {
      console.log(`[DEBUG] updateStep called for stepId ${stepId} with data:`, {
        title: stepData?.title,
        has_prompt: !!stepData?.prompt,
        has_attachments: !!(stepData?.prompt?.attachments?.length),
        attachment_count: stepData?.prompt?.attachments?.length || 0,
        attachments: stepData?.prompt?.attachments?.map(a => ({
          filename: a.filename,
          has_id: !!a.id,
          has_data: !!a.file_data,
          data_length: a.file_data?.length || 0
        }))
      });
      
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
          console.log(`[DEBUG] Updating existing prompt ${prompt.id} for step ${stepId}`);
          
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
              console.log(`[DEBUG] Adding ${newAttachments.length} new attachments to prompt ${prompt.id}`);
              console.log(`[DEBUG] New attachment details:`, newAttachments.map(a => ({
                filename: a.filename,
                type: a.file_type,
                size: a.file_size,
                has_data: !!a.file_data,
                data_length: a.file_data?.length || 0
              })));
            
              // Ensure prompt.id is a valid number
              if (typeof prompt.id !== 'number') {
                console.error(`[ERROR] Invalid prompt ID type: ${typeof prompt.id}, value: ${prompt.id}`);
                throw new Error('Prompt ID must be a number');
              }
            
              // Track successfully added attachments
              const addedAttachments = [];
              
              // Add new attachments
              for (const attachment of newAttachments) {
                try {
                  console.log(`[DEBUG] Attempting to add attachment: ${attachment.filename}`);
                  const addedAttachment = await this.addAttachment(prompt.id, attachment);
                  if (addedAttachment) {
                    addedAttachments.push(addedAttachment);
                    console.log(`[DEBUG] Successfully added attachment: ${attachment.filename}`);
                  }
                } catch (attachErr) {
                  console.error(`[ERROR] Failed to add attachment: ${attachment.filename}`, attachErr);
                  // Continue with other attachments instead of failing completely
                }
              }
              
              console.log(`[DEBUG] Successfully added ${addedAttachments.length} of ${newAttachments.length} new attachments`);
            }
          }
        } else {
          console.log(`[DEBUG] Creating new prompt for step ${stepId}`);
          
          // Create new prompt
          const promptResult = await dbService.run(
            'INSERT INTO prompts (step_id, content) VALUES (?, ?)',
            [stepId, stepData.prompt.content]
          );
        
          const promptId = promptResult.lastID;
          console.log(`[DEBUG] Created new prompt with ID ${promptId}`);
          
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
            console.log(`[DEBUG] Adding ${stepData.prompt.attachments.length} attachments for new prompt ${promptId}`);
            console.log(`[DEBUG] Attachment details:`, stepData.prompt.attachments.map(a => ({
              filename: a.filename,
              type: a.file_type,
              size: a.file_size,
              has_data: !!a.file_data,
              data_length: a.file_data?.length || 0
            })));
            
            // Ensure promptId is a valid number
            if (typeof promptId !== 'number') {
              console.error(`[ERROR] Invalid prompt ID type: ${typeof promptId}, value: ${promptId}`);
              throw new Error('Prompt ID must be a number');
            }
            
            // Track successfully added attachments
            const addedAttachments = [];
            
            for (const attachment of stepData.prompt.attachments) {
              try {
                console.log(`[DEBUG] Attempting to add attachment: ${attachment.filename}`);
                const addedAttachment = await this.addAttachment(promptId, attachment);
                if (addedAttachment) {
                  addedAttachments.push(addedAttachment);
                  console.log(`[DEBUG] Successfully added attachment: ${attachment.filename}`);
                }
              } catch (attachErr) {
                console.error(`[ERROR] Failed to add attachment: ${attachment.filename}`, attachErr);
                // Continue with other attachments instead of failing completely
              }
            }
            
            console.log(`[DEBUG] Successfully added ${addedAttachments.length} of ${stepData.prompt.attachments.length} new attachments`);
          }
        }
      }
    
      // Wait a moment to ensure database operations complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Return the updated step with its prompt and tags
      const updatedStep = await this.getStepWithPrompt(stepId);
      console.log('[DEBUG] Step updated successfully with details:', {
        id: updatedStep.id,
        title: updatedStep.title,
        has_prompt: !!updatedStep.prompt,
        has_attachments: !!(updatedStep.prompt?.attachments?.length),
        attachment_count: updatedStep.prompt?.attachments?.length || 0
      });
      return updatedStep;
    } catch (error) {
      console.error(`[ERROR] Error updating step with ID ${stepId}:`, error);
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