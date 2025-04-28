-- Insert default journey
INSERT INTO journeys (name, description, icon)
VALUES ('Software Development', 'End-to-end software development process', 'Code');

-- Get the ID of the inserted journey
INSERT INTO steps (journey_id, step_id, title, description, icon, color, position)
VALUES 
  (1, 'quest', 'The Quest Begins', 'Define what we seek to build', 'Compass', '#E07A5F', 0),
  (1, 'map', 'Mapping the Territory', 'Create the business requirements', 'Map', '#7A8B69', 1),
  (1, 'blueprint', 'The Blueprint', 'Develop product requirements', 'BookOpen', '#9381FF', 2),
  (1, 'crafting', 'Crafting the Vision', 'Design the application', 'Feather', '#C68B59', 3),
  (1, 'tales', 'Tales of the Users', 'Create user stories', 'MessageSquare', '#E07A5F', 4);

-- Insert prompts for each step
INSERT INTO prompts (step_id, content)
VALUES 
  (1, 'I need a detailed specification for this project. Please help me capture the essence of what we''re building by addressing:\n\n1. The core problem we''re solving\n2. Who we''re solving it for\n3. What success looks like\n4. Key features required\n5. Technical constraints to consider'),
  (2, 'Based on our initial specification, please draft a formal Business Requirements Document (BRD) that includes:\n\n1. Project background and business need\n2. Stakeholder identification\n3. Success criteria and metrics\n4. Budget and timeline constraints\n5. Risk assessment'),
  (3, 'Using the business requirements, create a detailed Product Requirements Document (PRD) that includes:\n\n1. Detailed feature specifications\n2. User workflows and journeys\n3. Technical specifications\n4. Integration requirements\n5. Performance criteria\n6. Testing requirements'),
  (4, 'Based on our product requirements document, please help me design this application by providing:\n\n1. User interface mockups for key screens\n2. Information architecture\n3. Design system recommendations\n4. User flow diagrams\n5. Interactive prototype specifications'),
  (5, 'With our design approach established, please convert our requirements into Agile user stories following this format:\n\nAs a [type of user], I want [an action] so that [a benefit/value].\n\nEnsure each story is:\n1. Independent\n2. Negotiable\n3. Valuable\n4. Estimable\n5. Small\n6. Testable');

-- Insert tags
INSERT INTO tags (name) VALUES 
  ('Requirements'),
  ('Planning'),
  ('Design'),
  ('Development'),
  ('Testing'),
  ('Client');

-- Associate tags with prompts
INSERT INTO prompt_tags (prompt_id, tag_id) VALUES 
  (1, 1), -- Quest + Requirements
  (1, 2), -- Quest + Planning
  (1, 6), -- Quest + Client
  (2, 1), -- Map + Requirements
  (2, 2), -- Map + Planning
  (3, 1), -- Blueprint + Requirements
  (3, 2), -- Blueprint + Planning
  (4, 3), -- Crafting + Design
  (5, 4); -- Tales + Development