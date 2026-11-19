-- Local synthetic tenants only. Do not use these credentials in hosted environments.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000000a2',
    'authenticated',
    'authenticated',
    'owner-a@blueprint.test',
    extensions.crypt('blueprint-local-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000000b2',
    'authenticated',
    'authenticated',
    'owner-b@blueprint.test',
    extensions.crypt('blueprint-local-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000000a3',
    'authenticated',
    'authenticated',
    'manager-a@blueprint.test',
    extensions.crypt('blueprint-local-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000000a4',
    'authenticated',
    'authenticated',
    'inactive-a@blueprint.test',
    extensions.crypt('blueprint-local-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000000aa',
    'authenticated',
    'authenticated',
    'platform-admin@blueprint.test',
    extensions.crypt('blueprint-local-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into auth.identities (
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values
  (
    '00000000-0000-4000-8000-0000000000a2',
    '00000000-0000-4000-8000-0000000000a2',
    jsonb_build_object(
      'sub', '00000000-0000-4000-8000-0000000000a2',
      'email', 'owner-a@blueprint.test',
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-0000000000b2',
    '00000000-0000-4000-8000-0000000000b2',
    jsonb_build_object(
      'sub', '00000000-0000-4000-8000-0000000000b2',
      'email', 'owner-b@blueprint.test',
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-0000000000a3',
    '00000000-0000-4000-8000-0000000000a3',
    jsonb_build_object(
      'sub', '00000000-0000-4000-8000-0000000000a3',
      'email', 'manager-a@blueprint.test',
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-0000000000a4',
    '00000000-0000-4000-8000-0000000000a4',
    jsonb_build_object(
      'sub', '00000000-0000-4000-8000-0000000000a4',
      'email', 'inactive-a@blueprint.test',
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-0000000000aa',
    '00000000-0000-4000-8000-0000000000aa',
    jsonb_build_object(
      'sub', '00000000-0000-4000-8000-0000000000aa',
      'email', 'platform-admin@blueprint.test',
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  );

insert into public.companies (id, name) values
  ('00000000-0000-4000-8000-0000000000a1', 'Company A'),
  ('00000000-0000-4000-8000-0000000000b1', 'Company B');

insert into public.blueprint_guided_companies (company_id) values
  ('00000000-0000-4000-8000-0000000000a1');

insert into public.company_memberships (company_id, user_id, role, status) values
  (
    '00000000-0000-4000-8000-0000000000a1',
    '00000000-0000-4000-8000-0000000000a2',
    'owner_admin',
    'active'
  ),
  (
    '00000000-0000-4000-8000-0000000000b1',
    '00000000-0000-4000-8000-0000000000b2',
    'owner_admin',
    'active'
  ),
  (
    '00000000-0000-4000-8000-0000000000a1',
    '00000000-0000-4000-8000-0000000000a3',
    'manager',
    'active'
  ),
  (
    '00000000-0000-4000-8000-0000000000a1',
    '00000000-0000-4000-8000-0000000000a4',
    'dj_trainee',
    'inactive'
  );

insert into public.training_platform_admins (user_id) values
  ('00000000-0000-4000-8000-0000000000aa');

insert into public.training_master_courses (
  id, title, visibility, legacy_source_id, legacy_content_version
) values
  (
    '00000000-0000-4000-8000-0000000000d1',
    'Legacy Beatmixing (import)',
    'private',
    'beatmixing-basics',
    'learndash-2026-08-03'
  ),
  (
    '00000000-0000-4000-8000-0000000000d2',
    'MC Foundations',
    'private',
    null,
    null
  ),
  (
    '00000000-0000-4000-8000-0000000000d3',
    'Old Photo Booth',
    'private',
    null,
    null
  );

insert into public.training_master_course_versions (
  id, course_id, version, status, content, published_by, published_at
) values
  (
    '00000000-0000-4000-8000-0000000000e1',
    '00000000-0000-4000-8000-0000000000d1',
    1,
    'published',
    '{
      "title": "Legacy Beatmixing (import)",
      "description": "Imported placeholder. Private until a platform administrator approves it for the Starter Library.",
      "category": "mixing",
      "intendedRole": "DJ",
      "experienceLevel": "beginner",
      "estimatedDurationMinutes": 45,
      "progression": { "lessonAccess": "sequential", "requireCompletionBeforeAdvance": true },
      "assessment": {
        "quizGrading": "objective",
        "writtenFeedback": "none",
        "assignmentApproval": "human",
        "submissionMode": "online",
        "retryLimit": 3,
        "retryWaitHours": 24,
        "certificationRequirement": "none"
      },
      "lessons": [
        {
          "id": "00000000-0000-4000-8000-0000000000f1",
          "title": "Phrase matching",
          "description": "Hear two phrases and match them.",
          "completion": { "requireAllBlocks": true, "requiredBlockIds": [] },
          "progression": { "lockedUntilPreviousComplete": true },
          "blocks": [
            {
              "id": "00000000-0000-4000-8000-0000000000f2",
              "type": "text",
              "body": "Listen for the phrase, then match the incoming track."
            }
          ],
          "legacy": { "sourceId": "ld-lesson-phrase-matching", "contentVersion": "learndash-2026-08-03" }
        }
      ],
      "extensions": {
        "ai": { "courseCreation": false, "legacyMigration": false, "modernization": false },
        "marketplace": { "sharing": "none", "creatorOwnership": null, "license": null }
      },
      "legacy": { "sourceId": "beatmixing-basics", "contentVersion": "learndash-2026-08-03" }
    }'::jsonb,
    '00000000-0000-4000-8000-0000000000aa',
    now()
  ),
  (
    '00000000-0000-4000-8000-0000000000e2',
    '00000000-0000-4000-8000-0000000000d2',
    1,
    'published',
    '{
      "title": "MC Foundations",
      "description": "Learn the first announcements a wedding DJ makes.",
      "category": "mc",
      "intendedRole": "Wedding DJ",
      "experienceLevel": "beginner",
      "estimatedDurationMinutes": 60,
      "progression": { "lessonAccess": "sequential", "requireCompletionBeforeAdvance": true },
      "assessment": {
        "quizGrading": "objective",
        "writtenFeedback": "none",
        "assignmentApproval": "human",
        "submissionMode": "online",
        "retryLimit": 3,
        "retryWaitHours": 0,
        "certificationRequirement": "none"
      },
      "lessons": [
        {
          "id": "00000000-0000-4000-8000-0000000000f3",
          "title": "Welcome",
          "description": "Set the tone for the night.",
          "completion": { "requireAllBlocks": true, "requiredBlockIds": [] },
          "progression": { "lockedUntilPreviousComplete": true },
          "blocks": [
            {
              "id": "00000000-0000-4000-8000-0000000000f4",
              "type": "text",
              "body": "A clear welcome tells guests who you are and what happens next."
            },
            {
              "id": "00000000-0000-4000-8000-0000000000f5",
              "type": "video",
              "url": "https://vimeo.com/0",
              "caption": "Sample welcome announcement"
            }
          ],
          "legacy": { "sourceId": null, "contentVersion": null }
        },
        {
          "id": "00000000-0000-4000-8000-0000000000f6",
          "title": "Microphone check",
          "description": "A short knowledge check.",
          "completion": { "requireAllBlocks": true, "requiredBlockIds": [] },
          "progression": { "lockedUntilPreviousComplete": true },
          "blocks": [
            {
              "id": "00000000-0000-4000-8000-0000000000f7",
              "type": "image",
              "url": "https://example.com/mic.jpg",
              "alt": "Handheld microphone"
            },
            {
              "id": "00000000-0000-4000-8000-0000000000f8",
              "type": "resource",
              "url": "https://example.com/mic-checklist.pdf",
              "label": "Mic checklist"
            },
            {
              "id": "00000000-0000-4000-8000-0000000000f9",
              "type": "quiz",
              "title": "Mic check",
              "questions": [
                {
                  "id": "00000000-0000-4000-8000-0000000000fa",
                  "prompt": "When should you test the microphone?",
                  "kind": "single_choice",
                  "options": [
                    { "id": "00000000-0000-4000-8000-0000000000fb", "label": "Before guests arrive", "correct": true },
                    { "id": "00000000-0000-4000-8000-0000000000fc", "label": "During the first dance", "correct": false }
                  ],
                  "writtenFeedback": "none"
                }
              ],
              "config": {
                "grading": "objective",
                "retryLimit": 3,
                "retryWaitHours": 0,
                "passingScorePercent": 80
              }
            }
          ],
          "legacy": { "sourceId": null, "contentVersion": null }
        },
        {
          "id": "00000000-0000-4000-8000-0000000000fd",
          "title": "First announcements",
          "description": "Practice the welcome.",
          "completion": { "requireAllBlocks": true, "requiredBlockIds": [] },
          "progression": { "lockedUntilPreviousComplete": true },
          "blocks": [
            {
              "id": "00000000-0000-4000-8000-0000000000fe",
              "type": "assignment",
              "title": "Record a welcome",
              "instructions": "Record a 30-second welcome for cocktail hour.",
              "verification": "online",
              "requiresHumanApproval": true,
              "retryLimit": null
            }
          ],
          "legacy": { "sourceId": null, "contentVersion": null }
        }
      ],
      "extensions": {
        "ai": { "courseCreation": false, "legacyMigration": false, "modernization": false },
        "marketplace": { "sharing": "none", "creatorOwnership": null, "license": null }
      },
      "legacy": { "sourceId": null, "contentVersion": null }
    }'::jsonb,
    '00000000-0000-4000-8000-0000000000aa',
    now()
  ),
  (
    '00000000-0000-4000-8000-0000000000e3',
    '00000000-0000-4000-8000-0000000000d3',
    1,
    'published',
    '{
      "title": "Old Photo Booth",
      "description": "Archived and unavailable for new adoption.",
      "category": "general",
      "intendedRole": "DJ",
      "experienceLevel": "custom",
      "estimatedDurationMinutes": 20,
      "progression": { "lessonAccess": "open", "requireCompletionBeforeAdvance": false },
      "assessment": {
        "quizGrading": "objective",
        "writtenFeedback": "none",
        "assignmentApproval": "none",
        "submissionMode": "either",
        "retryLimit": null,
        "retryWaitHours": null,
        "certificationRequirement": "none"
      },
      "lessons": [],
      "extensions": {
        "ai": { "courseCreation": false, "legacyMigration": false, "modernization": false },
        "marketplace": { "sharing": "none", "creatorOwnership": null, "license": null }
      },
      "legacy": { "sourceId": null, "contentVersion": null }
    }'::jsonb,
    '00000000-0000-4000-8000-0000000000aa',
    now()
  );

update public.training_master_courses
set visibility = 'starter'
where id = '00000000-0000-4000-8000-0000000000d2';

update public.training_master_courses
set visibility = 'archived'
where id = '00000000-0000-4000-8000-0000000000d3';
