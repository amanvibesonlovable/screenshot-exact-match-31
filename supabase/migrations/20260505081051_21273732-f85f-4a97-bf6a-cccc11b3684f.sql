-- 1. Canonical survey_definitions table — server-owned source of truth
CREATE TABLE IF NOT EXISTS public.survey_definitions (
  stage survey_stage PRIMARY KEY,
  definition JSONB NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active admins can view survey definitions" ON public.survey_definitions;
CREATE POLICY "Active admins can view survey definitions"
ON public.survey_definitions FOR SELECT
TO authenticated
USING (public.is_active_admin());

-- 2. Seed canonical definitions
INSERT INTO public.survey_definitions(stage, definition) VALUES ('15', '{"stage":15,"questions":[{"id":"q1","kind":"static","type":"single","prompt":"How has your experience in the market been so far?","branch":{"showQuestionId":"q1a","minIndex":2},"options":[{"label":"Enjoying it — learning a lot","points":0,"dimension":"training_effectiveness","criticalFlag":null},{"label":"It''s okay — still adjusting","points":1,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"It''s tougher than I expected","points":3,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Honestly, it''s been really hard","points":5,"dimension":"adjustment_wellbeing","criticalFlag":null}]},{"id":"q1a","kind":"dynamic","type":"multi","prompt":"What''s been the hardest part?","branch":null,"options":[{"label":"The physical demands (heat, travel, long hours)","points":2,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"I don''t understand what I''m supposed to learn from this","points":3,"dimension":"training_effectiveness","criticalFlag":null},{"label":"The people I go with aren''t really teaching me","points":2,"dimension":"support_guidance","criticalFlag":null},{"label":"It''s hard being in a new city / away from home","points":2,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Language barrier in this area","points":1,"dimension":"adjustment_wellbeing","criticalFlag":null}]},{"id":"q2","kind":"static","type":"single","prompt":"Do you feel clear about what the next few months of training will look like?","branch":null,"options":[{"label":"Yes, I have a good picture of the plan","points":0,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Somewhat — I know the broad structure","points":1,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Not really — I''m taking it day by day","points":3,"dimension":"training_effectiveness","criticalFlag":null},{"label":"No one has explained the full training plan to me","points":5,"dimension":"training_effectiveness","criticalFlag":null}]},{"id":"q3","kind":"static","type":"single","prompt":"How''s the guidance you''re getting from the people training you?","branch":{"showQuestionId":"q3a","minIndex":2},"options":[{"label":"Great — they take time to explain and teach","points":0,"dimension":"support_guidance","criticalFlag":null},{"label":"Decent — they help when I ask","points":1,"dimension":"support_guidance","criticalFlag":null},{"label":"Not much — they''re busy with their own work","points":3,"dimension":"support_guidance","criticalFlag":null},{"label":"I''m mostly on my own — figuring things out myself","points":5,"dimension":"support_guidance","criticalFlag":null}]},{"id":"q3a","kind":"dynamic","type":"multi","prompt":"What would help you the most right now?","branch":null,"options":[{"label":"Someone dedicated to answer my daily questions","points":1,"dimension":"support_guidance","criticalFlag":null},{"label":"A more structured daily plan instead of just ''follow the salesman''","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Regular check-ins from my manager","points":2,"dimension":"support_guidance","criticalFlag":null},{"label":"Someone to talk to about how I''m settling in","points":2,"dimension":"adjustment_wellbeing","criticalFlag":null}]},{"id":"q4","kind":"static","type":"single","prompt":"Pick the one word that best describes how you''re feeling about this role right now.","branch":null,"options":[{"label":"Excited","points":0,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Curious","points":0,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Overwhelmed","points":3,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Regretting","points":6,"dimension":"attrition_risk","criticalFlag":"Regretting joining at Day 15"}]},{"id":"q5","kind":"static","type":"single","prompt":"If you could change one thing about your experience so far, what would it be?","branch":null,"options":[{"label":"Better explanation of what I should be learning each day","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"More involvement from the people training me","points":2,"dimension":"support_guidance","criticalFlag":null},{"label":"Better living/accommodation situation","points":1,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Honestly, nothing — it''s been good so far","points":0,"dimension":"none","criticalFlag":null},{"label":"I''d rethink my decision to join","points":5,"dimension":"attrition_risk","criticalFlag":"Reconsidering joining at Day 15"}]}]}'::jsonb)
ON CONFLICT (stage) DO UPDATE SET definition = EXCLUDED.definition, updated_at = now();
INSERT INTO public.survey_definitions(stage, definition) VALUES ('30', '{"stage":30,"questions":[{"id":"q1","kind":"static","type":"single","prompt":"How confident do you feel about your product knowledge so far?","branch":null,"options":[{"label":"Strong — I can explain most products and SKUs","points":0,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Getting there — know the basics","points":1,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Weak — I still get confused between products","points":3,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Very weak — no one has properly taught me this","points":5,"dimension":"training_effectiveness","criticalFlag":null}]},{"id":"q2","kind":"static","type":"single","prompt":"How many sales channels have you been exposed to so far (CFP, Foods, Personal Care, etc.)?","branch":null,"options":[{"label":"All major channels","points":0,"dimension":"training_effectiveness","criticalFlag":null},{"label":"2-3 channels","points":1,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Only 1 channel so far","points":3,"dimension":"training_effectiveness","criticalFlag":null},{"label":"I''m not sure which channels are which honestly","points":5,"dimension":"training_effectiveness","criticalFlag":null}]},{"id":"q3","kind":"static","type":"single","prompt":"Overall, how would you describe the training support you''re getting from people around you?","branch":{"showQuestionId":"q3a","minIndex":2},"options":[{"label":"Excellent — people go out of their way to teach me","points":0,"dimension":"support_guidance","criticalFlag":null},{"label":"Good — I learn when I ask","points":1,"dimension":"support_guidance","criticalFlag":null},{"label":"Average — I''m mostly figuring things out on my own","points":3,"dimension":"support_guidance","criticalFlag":null},{"label":"Poor — I feel like I''m in the way","points":5,"dimension":"support_guidance","criticalFlag":"Feeling like a burden at Day 30"}]},{"id":"q3a","kind":"dynamic","type":"multi","prompt":"What specifically could be better?","branch":null,"options":[{"label":"People training me need to spend more time explaining","points":2,"dimension":"support_guidance","criticalFlag":null},{"label":"I just follow people around — no one explains what they''re doing","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"My manager hasn''t done any review or check-in yet","points":2,"dimension":"support_guidance","criticalFlag":null},{"label":"I don''t have anyone I can ask basic questions to without feeling judged","points":3,"dimension":"support_guidance","criticalFlag":null}]},{"id":"q4","kind":"static","type":"single","prompt":"Compared to Day 1, how motivated are you right now?","branch":{"showQuestionId":"q4a","minIndex":3},"options":[{"label":"More motivated — I''m seeing the bigger picture","points":0,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"About the same — holding steady","points":1,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Dipping — some days are tough","points":3,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Dropping fast — I''m questioning if this is for me","points":5,"dimension":"attrition_risk","criticalFlag":null}]},{"id":"q4a","kind":"dynamic","type":"multi","prompt":"What''s pulling your motivation down?","branch":null,"options":[{"label":"The work feels repetitive — not learning new things","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"I don''t see how this training connects to my future role","points":3,"dimension":"training_effectiveness","criticalFlag":null},{"label":"The culture feels too aggressive for me","points":2,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"I''m hearing about better opportunities outside","points":4,"dimension":"attrition_risk","criticalFlag":"Exploring other opportunities at Day 30"},{"label":"Personal reasons / homesickness","points":1,"dimension":"adjustment_wellbeing","criticalFlag":null}]},{"id":"q5","kind":"static","type":"single","prompt":"Do you stay in touch with others from your batch?","branch":null,"options":[{"label":"Yes — most are doing well, we support each other","points":0,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Yes — but some are struggling too","points":2,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Not much — everyone''s scattered, I feel isolated","points":3,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Some have already left or are planning to leave","points":4,"dimension":"attrition_risk","criticalFlag":null}]},{"id":"q6","kind":"static","type":"single","prompt":"If a junior from your college asked ''should I take this role?'', what would you honestly say?","branch":null,"options":[{"label":"Definitely yes — great learning","points":0,"dimension":"attrition_risk","criticalFlag":null},{"label":"Probably yes — but set your expectations","points":1,"dimension":"attrition_risk","criticalFlag":null},{"label":"I''d hesitate to recommend it","points":4,"dimension":"attrition_risk","criticalFlag":null},{"label":"I''d say avoid it","points":6,"dimension":"attrition_risk","criticalFlag":"Would tell juniors to avoid this role"}]}]}'::jsonb)
ON CONFLICT (stage) DO UPDATE SET definition = EXCLUDED.definition, updated_at = now();
INSERT INTO public.survey_definitions(stage, definition) VALUES ('45', '{"stage":45,"questions":[{"id":"q1","kind":"static","type":"single","prompt":"How smooth has the transition between your different training stints been?","branch":null,"options":[{"label":"Smooth — each phase built on the previous one","points":0,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Okay — some gaps but I adapted","points":1,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Rough — I felt lost between transitions","points":3,"dimension":"training_effectiveness","criticalFlag":null},{"label":"There wasn''t really a structured transition","points":5,"dimension":"training_effectiveness","criticalFlag":null}]},{"id":"q2","kind":"static","type":"single","prompt":"Now that you''re deeper into training, how would you describe the quality of guidance from people around you?","branch":{"showQuestionId":"q2a","minIndex":2},"options":[{"label":"Genuinely investing in teaching me — I''m learning a lot","points":0,"dimension":"support_guidance","criticalFlag":null},{"label":"Professional — they teach when they can","points":1,"dimension":"support_guidance","criticalFlag":null},{"label":"I''m mostly tagging along — not being actively taught","points":4,"dimension":"support_guidance","criticalFlag":null},{"label":"The dynamic is uncomfortable — I don''t feel welcome","points":6,"dimension":"support_guidance","criticalFlag":null}]},{"id":"q2a","kind":"dynamic","type":"multi","prompt":"What best describes the situation?","branch":null,"options":[{"label":"No one explains what they''re doing or why","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"People seem annoyed when I ask questions","points":3,"dimension":"support_guidance","criticalFlag":null},{"label":"I get assigned tasks without any teaching","points":2,"dimension":"support_guidance","criticalFlag":null},{"label":"They''re not bad people, just too busy to train","points":1,"dimension":"support_guidance","criticalFlag":null},{"label":"The environment feels hostile or demeaning","points":5,"dimension":"support_guidance","criticalFlag":"Hostile/demeaning training environment"}]},{"id":"q3","kind":"static","type":"single","prompt":"At this point, how well do you understand beat plans and outlet-level operations?","branch":null,"options":[{"label":"Confident — I could explain it to someone new","points":0,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Mostly understand — a few gaps","points":1,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Shaky — I know the theory but struggle in practice","points":3,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Not confident — this hasn''t been covered properly","points":5,"dimension":"training_effectiveness","criticalFlag":null}]},{"id":"q4","kind":"static","type":"single","prompt":"How are you doing outside of work — settling into the city, the routine, everything?","branch":{"showQuestionId":"q4a","minIndex":2},"options":[{"label":"Well settled — it''s starting to feel normal","points":0,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Managing — mix of good and tough days","points":1,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Struggling — it''s affecting my focus at work","points":4,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Really struggling — I feel isolated","points":5,"dimension":"adjustment_wellbeing","criticalFlag":null}]},{"id":"q4a","kind":"dynamic","type":"multi","prompt":"What''s been hardest to deal with?","branch":null,"options":[{"label":"Living conditions / accommodation","points":1,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Missing family and friends","points":1,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Physical exhaustion from the daily schedule","points":2,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Feeling like I don''t belong here","points":3,"dimension":"attrition_risk","criticalFlag":null},{"label":"I keep thinking about going back home","points":4,"dimension":"attrition_risk","criticalFlag":null}]},{"id":"q5","kind":"static","type":"single","prompt":"You have a training dossier that outlines what you should be doing when. How much of it have you genuinely covered so far?","branch":null,"options":[{"label":"Most of it — meaningfully","points":0,"dimension":"training_effectiveness","criticalFlag":null},{"label":"It''s being followed on paper but real learning is patchy","points":4,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Vaguely aware of it — no one walks me through it","points":3,"dimension":"training_effectiveness","criticalFlag":null},{"label":"What dossier?","points":5,"dimension":"training_effectiveness","criticalFlag":null}]}]}'::jsonb)
ON CONFLICT (stage) DO UPDATE SET definition = EXCLUDED.definition, updated_at = now();
INSERT INTO public.survey_definitions(stage, definition) VALUES ('60', '{"stage":60,"questions":[{"id":"q1","kind":"static","type":"single","prompt":"How confident are you about managing distributor relationships and retailer interactions on your own?","branch":null,"options":[{"label":"Confident — I''ve had good hands-on exposure","points":0,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Somewhat — I get the basics but need more practice","points":1,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Not very — I''ve had limited distributor exposure","points":4,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Not at all — this hasn''t been covered properly","points":5,"dimension":"training_effectiveness","criticalFlag":null}]},{"id":"q2","kind":"static","type":"single","prompt":"In about a month, you''ll be running your own section. How ready do you feel?","branch":{"showQuestionId":"q2a","minIndex":2},"options":[{"label":"Ready — bring it on","points":0,"dimension":"transition_readiness","criticalFlag":null},{"label":"Somewhat — nervous but willing to figure it out","points":1,"dimension":"transition_readiness","criticalFlag":null},{"label":"Not ready — there are big gaps in what I''ve learned","points":4,"dimension":"transition_readiness","criticalFlag":null},{"label":"Scared — I don''t think I''ve been trained enough","points":6,"dimension":"transition_readiness","criticalFlag":null}]},{"id":"q2a","kind":"dynamic","type":"multi","prompt":"What are the biggest gaps you feel right now?","branch":null,"options":[{"label":"Distributor management — haven''t done enough","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Secondary sales and stock management","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"How to handle a team of salesmen independently","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Trade schemes and commercial understanding","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Handling pressure and targets on my own","points":2,"dimension":"transition_readiness","criticalFlag":null},{"label":"Honestly, everything — I don''t feel ready at all","points":4,"dimension":"transition_readiness","criticalFlag":null}]},{"id":"q3","kind":"static","type":"single","prompt":"Your manager is supposed to do periodic reviews. How have those been?","branch":null,"options":[{"label":"Helpful — I got genuine feedback and direction","points":0,"dimension":"support_guidance","criticalFlag":null},{"label":"They happened but felt like a formality","points":2,"dimension":"support_guidance","criticalFlag":null},{"label":"Only happened once, very briefly","points":3,"dimension":"support_guidance","criticalFlag":null},{"label":"Haven''t had any proper review yet","points":5,"dimension":"support_guidance","criticalFlag":null}]},{"id":"q4","kind":"static","type":"single","prompt":"How''s the pressure feeling these days?","branch":{"showQuestionId":"q4a","minIndex":3},"options":[{"label":"Healthy — it pushes me to learn faster","points":0,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Manageable — tough days but I handle it","points":1,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Heavy — it''s starting to affect my motivation","points":3,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Crushing — I don''t know how much longer I can keep this up","points":6,"dimension":"attrition_risk","criticalFlag":null}]},{"id":"q4a","kind":"dynamic","type":"multi","prompt":"What''s weighing on you the most?","branch":null,"options":[{"label":"Fear of not being ready when I get my own section","points":2,"dimension":"transition_readiness","criticalFlag":null},{"label":"The way people talk to me / the culture","points":3,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Nobody seems to care whether I''m actually learning","points":3,"dimension":"support_guidance","criticalFlag":null},{"label":"I''m seriously considering other options","points":5,"dimension":"attrition_risk","criticalFlag":"Considering other options at Day 60"}]},{"id":"q5","kind":"static","type":"single","prompt":"Thinking about the next year — where''s your head at?","branch":null,"options":[{"label":"Committed — I see myself growing here","points":0,"dimension":"attrition_risk","criticalFlag":null},{"label":"Taking it one day at a time","points":2,"dimension":"attrition_risk","criticalFlag":null},{"label":"Depends on how my posting goes","points":3,"dimension":"attrition_risk","criticalFlag":null},{"label":"Keeping my options open honestly","points":5,"dimension":"attrition_risk","criticalFlag":null},{"label":"I''ve already started looking elsewhere","points":8,"dimension":"attrition_risk","criticalFlag":"Already looking at Day 60"}]}]}'::jsonb)
ON CONFLICT (stage) DO UPDATE SET definition = EXCLUDED.definition, updated_at = now();
INSERT INTO public.survey_definitions(stage, definition) VALUES ('90', '{"stage":90,"questions":[{"id":"q1","kind":"static","type":"single","prompt":"Looking back at the full 3-month training, how would you rate it?","branch":{"showQuestionId":"q1a","minIndex":2},"options":[{"label":"Excellent — I feel well-prepared for the real job","points":0,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Good — some gaps but mostly solid","points":1,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Average — a lot was left to self-learning","points":3,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Poor — I don''t feel adequately prepared","points":5,"dimension":"training_effectiveness","criticalFlag":null}]},{"id":"q1a","kind":"dynamic","type":"multi","prompt":"What should training have covered better?","branch":null,"options":[{"label":"More hands-on distributor interactions, not just observation","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Deeper product and scheme knowledge","points":1,"dimension":"training_effectiveness","criticalFlag":null},{"label":"How to actually manage a section day-to-day","points":3,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Better quality of people I was paired with for training","points":2,"dimension":"support_guidance","criticalFlag":null},{"label":"The dossier should be followed with real assessments, not just ticked off","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Soft skills — handling pressure, team management, communication","points":1,"dimension":"training_effectiveness","criticalFlag":null}]},{"id":"q2","kind":"static","type":"single","prompt":"How''s the transition to your own section going?","branch":null,"options":[{"label":"Smooth — proper handover, feeling confident","points":0,"dimension":"transition_readiness","criticalFlag":null},{"label":"Okay — nervous but I''ll figure it out","points":1,"dimension":"transition_readiness","criticalFlag":null},{"label":"Rocky — no handover, thrown into the deep end","points":4,"dimension":"transition_readiness","criticalFlag":null},{"label":"I genuinely don''t feel ready to do this on my own","points":6,"dimension":"transition_readiness","criticalFlag":null}]},{"id":"q3","kind":"static","type":"single","prompt":"Overall, how would you rate the quality of guidance you received during training?","branch":null,"options":[{"label":"Outstanding — people went above and beyond","points":0,"dimension":"support_guidance","criticalFlag":null},{"label":"Good — they did their part","points":1,"dimension":"support_guidance","criticalFlag":null},{"label":"Mediocre — I had to figure most things out alone","points":3,"dimension":"support_guidance","criticalFlag":null},{"label":"Poor — I felt neglected","points":5,"dimension":"support_guidance","criticalFlag":null},{"label":"Harmful — the experience was toxic or demoralizing","points":8,"dimension":"support_guidance","criticalFlag":"Toxic/demoralizing training experience"}]},{"id":"q4","kind":"static","type":"single","prompt":"What''s your honest plan for the next year?","branch":null,"options":[{"label":"Fully committed — want to build my career here","points":0,"dimension":"attrition_risk","criticalFlag":null},{"label":"Will give it a fair shot","points":2,"dimension":"attrition_risk","criticalFlag":null},{"label":"Staying because I don''t have a better option right now","points":5,"dimension":"attrition_risk","criticalFlag":null},{"label":"Actively figuring out my exit","points":9,"dimension":"attrition_risk","criticalFlag":"Planning exit at Day 90"}]},{"id":"q5","kind":"static","type":"single","prompt":"If you could change ONE thing about the training program for the next batch, what would it be?","branch":null,"options":[{"label":"Pair trainees with more available and better-quality trainers","points":0,"dimension":"none","criticalFlag":null},{"label":"Make the training more structured with real assessments","points":0,"dimension":"none","criticalFlag":null},{"label":"Prepare trainees better for the reality of field work","points":0,"dimension":"none","criticalFlag":null},{"label":"Address the aggressive culture — it pushes people out","points":0,"dimension":"none","criticalFlag":null},{"label":"Nothing — the training was solid","points":0,"dimension":"none","criticalFlag":null}]}]}'::jsonb)
ON CONFLICT (stage) DO UPDATE SET definition = EXCLUDED.definition, updated_at = now();
INSERT INTO public.survey_definitions(stage, definition) VALUES ('180', '{"stage":180,"questions":[{"id":"q1","kind":"static","type":"single","prompt":"Now that you''ve been running a section, how well did training actually prepare you for the job?","branch":{"showQuestionId":"q1a","minIndex":2},"options":[{"label":"Very well — I use what I learned every day","points":0,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Decently — but there are things I wish I''d learned","points":1,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Poorly — I''ve had to figure out most things on the job","points":4,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Training barely scratched the surface of what this job needs","points":6,"dimension":"training_effectiveness","criticalFlag":null}]},{"id":"q1a","kind":"dynamic","type":"multi","prompt":"What did you have to learn the hard way?","branch":null,"options":[{"label":"Managing a distributor independently (claims, payments, relationships)","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Handling salesmen and their day-to-day issues","points":2,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Secondary sales planning and forecasting","points":1,"dimension":"training_effectiveness","criticalFlag":null},{"label":"Dealing with target pressure from seniors","points":2,"dimension":"adjustment_wellbeing","criticalFlag":null},{"label":"Internal systems and reporting","points":1,"dimension":"training_effectiveness","criticalFlag":null}]},{"id":"q2","kind":"static","type":"single","prompt":"How supported do you feel in your current role?","branch":null,"options":[{"label":"Well supported — I get regular guidance","points":0,"dimension":"support_guidance","criticalFlag":null},{"label":"Okay — help comes when I escalate","points":1,"dimension":"support_guidance","criticalFlag":null},{"label":"Mostly on my own — I figure things out","points":3,"dimension":"support_guidance","criticalFlag":null},{"label":"On my own with no backup — I''m struggling","points":5,"dimension":"support_guidance","criticalFlag":null}]},{"id":"q3","kind":"static","type":"single","prompt":"Do you feel you''re growing professionally?","branch":null,"options":[{"label":"Absolutely — learning something new every day","points":0,"dimension":"attrition_risk","criticalFlag":null},{"label":"Somewhat — it''s become routine but I''m still growing","points":1,"dimension":"attrition_risk","criticalFlag":null},{"label":"Stagnating — every day feels the same","points":4,"dimension":"attrition_risk","criticalFlag":null},{"label":"Declining — the pressure is wearing me down, not building me up","points":5,"dimension":"attrition_risk","criticalFlag":null}]},{"id":"q4","kind":"static","type":"single","prompt":"Where do you see yourself in the next 1-2 years?","branch":null,"options":[{"label":"Growing here — aiming for AE and beyond","points":0,"dimension":"attrition_risk","criticalFlag":null},{"label":"Here for now — will see how it goes","points":2,"dimension":"attrition_risk","criticalFlag":null},{"label":"Probably moving on within a year","points":5,"dimension":"attrition_risk","criticalFlag":null},{"label":"Already exploring other opportunities","points":8,"dimension":"attrition_risk","criticalFlag":"Exploring exit at Day 180"}]},{"id":"q5","kind":"static","type":"single","prompt":"Knowing everything you know now — would you recommend this role to a junior from your college?","branch":null,"options":[{"label":"Strongly yes","points":0,"dimension":"attrition_risk","criticalFlag":null},{"label":"Yes, with realistic expectations","points":1,"dimension":"attrition_risk","criticalFlag":null},{"label":"Probably not","points":4,"dimension":"attrition_risk","criticalFlag":null},{"label":"Definitely not","points":6,"dimension":"attrition_risk","criticalFlag":"Would not recommend role at Day 180"}]},{"id":"q6","kind":"static","type":"single","prompt":"One thing you''d change about training for the next batch?","branch":null,"options":[{"label":"More real distributor and section management exposure","points":0,"dimension":"none","criticalFlag":null},{"label":"Better quality trainers / more invested people","points":0,"dimension":"none","criticalFlag":null},{"label":"Soften the culture — it''s unnecessarily harsh","points":0,"dimension":"none","criticalFlag":null},{"label":"More structured assessments instead of just ticking boxes","points":0,"dimension":"none","criticalFlag":null},{"label":"Training was good — keep it as is","points":0,"dimension":"none","criticalFlag":null}]}]}'::jsonb)
ON CONFLICT (stage) DO UPDATE SET definition = EXCLUDED.definition, updated_at = now();

-- 3. Fix malformed seeded super admin email
UPDATE public.admins SET email = 'aman@vibesonlovable.com'
WHERE email = 'amanvibesonlovable.com';

-- 4. New tamper-resistant submit RPC. Client only sends raw answers.
DROP FUNCTION IF EXISTS public.submit_survey_response(text, survey_stage, jsonb, text, jsonb, jsonb, boolean, integer, numeric, risk_level);

CREATE OR REPLACE FUNCTION public.submit_survey_response(
  p_token text,
  p_stage survey_stage,
  p_answers jsonb,
  p_free_text text,
  p_completion_time_seconds integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_existing_id uuid;
  v_new_id uuid;
  v_def jsonb;
  v_questions jsonb;
  v_answer jsonb;
  v_qid text;
  v_q jsonb;
  v_sel jsonb;
  v_idx int;
  v_opt jsonb;
  v_total numeric := 0;
  v_pts numeric;
  v_response_records jsonb := '[]'::jsonb;
  v_critical_flags jsonb := '[]'::jsonb;
  v_scores jsonb;
  v_dim_te numeric := 0;
  v_dim_ar numeric := 0;
  v_dim_sg numeric := 0;
  v_dim_aw numeric := 0;
  v_dim_tr numeric := 0;
  v_has_tr boolean := false;
  v_dim text;
  v_label text;
  v_answer_labels text[];
  v_answer_points numeric;
  v_answer_dim text;
  v_static_count int := 0;
  v_static_idx0_count int := 0;
  v_gaming boolean := false;
  v_multiplier numeric;
  v_final numeric;
  v_risk risk_level;
  v_qkind text;
  v_qtype text;
  v_question_text text;
BEGIN
  SELECT id INTO v_employee_id FROM public.employees WHERE token = p_token LIMIT 1;
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'invalid token';
  END IF;

  SELECT id INTO v_existing_id FROM public.survey_responses
    WHERE employee_id = v_employee_id AND stage = p_stage LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'response already submitted';
  END IF;

  SELECT definition INTO v_def FROM public.survey_definitions WHERE stage = p_stage;
  IF v_def IS NULL THEN
    RAISE EXCEPTION 'no canonical survey definition for stage %', p_stage;
  END IF;
  v_questions := v_def->'questions';
  v_has_tr := (p_stage::text IN ('60','90','180'));

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' THEN
    RAISE EXCEPTION 'p_answers must be a json array';
  END IF;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    v_qid := v_answer->>'question_id';
    v_sel := v_answer->'selected';
    IF v_qid IS NULL OR v_sel IS NULL OR jsonb_typeof(v_sel) <> 'array' THEN
      CONTINUE;
    END IF;

    v_q := NULL;
    FOR v_opt IN SELECT * FROM jsonb_array_elements(v_questions) LOOP
      IF v_opt->>'id' = v_qid THEN v_q := v_opt; EXIT; END IF;
    END LOOP;
    IF v_q IS NULL THEN CONTINUE; END IF;

    v_qkind := v_q->>'kind';
    v_qtype := v_q->>'type';
    v_question_text := v_q->>'prompt';

    v_answer_points := 0;
    v_answer_labels := ARRAY[]::text[];
    v_answer_dim := NULL;

    IF v_qtype = 'single' AND jsonb_array_length(v_sel) > 1 THEN
      v_sel := jsonb_build_array(v_sel->0);
    END IF;

    FOR v_idx IN SELECT (value::text)::int FROM jsonb_array_elements(v_sel) LOOP
      v_opt := v_q->'options'->v_idx;
      IF v_opt IS NULL THEN CONTINUE; END IF;
      v_pts := COALESCE((v_opt->>'points')::numeric, 0);
      v_dim := v_opt->>'dimension';
      v_label := v_opt->>'label';

      v_answer_points := v_answer_points + v_pts;
      v_answer_labels := v_answer_labels || v_label;
      IF v_answer_dim IS NULL THEN v_answer_dim := v_dim; END IF;

      IF v_dim = 'training_effectiveness' THEN v_dim_te := v_dim_te + v_pts;
      ELSIF v_dim = 'attrition_risk' THEN v_dim_ar := v_dim_ar + v_pts;
      ELSIF v_dim = 'support_guidance' THEN v_dim_sg := v_dim_sg + v_pts;
      ELSIF v_dim = 'adjustment_wellbeing' THEN v_dim_aw := v_dim_aw + v_pts;
      ELSIF v_dim = 'transition_readiness' THEN v_dim_tr := v_dim_tr + v_pts;
      END IF;

      IF v_opt->>'criticalFlag' IS NOT NULL THEN
        v_critical_flags := v_critical_flags || to_jsonb(v_opt->>'criticalFlag');
      END IF;
    END LOOP;

    IF array_length(v_answer_labels, 1) IS NULL THEN CONTINUE; END IF;

    v_total := v_total + v_answer_points;

    IF v_qkind = 'static' AND v_qtype = 'single' THEN
      v_static_count := v_static_count + 1;
      IF (v_sel->>0)::int = 0 THEN v_static_idx0_count := v_static_idx0_count + 1; END IF;
    END IF;

    v_response_records := v_response_records || jsonb_build_object(
      'question_id', v_qid,
      'question_text', v_question_text,
      'answer_text', array_to_string(v_answer_labels, ' • '),
      'points', v_answer_points,
      'dimension', COALESCE(v_answer_dim, 'none')
    );
  END LOOP;

  v_multiplier := CASE p_stage::text
    WHEN '15' THEN 0.7
    WHEN '30' THEN 0.9
    WHEN '45' THEN 1.0
    WHEN '60' THEN 1.2
    WHEN '90' THEN 1.4
    WHEN '180' THEN 1.5
    ELSE 1.0
  END;

  v_final := round((v_total * v_multiplier) * 10) / 10.0;

  IF jsonb_array_length(v_critical_flags) > 0 OR v_final >= 23 THEN
    v_risk := 'HIGH';
  ELSIF v_final >= 11 THEN
    v_risk := 'MEDIUM';
  ELSE
    v_risk := 'LOW';
  END IF;

  v_gaming := (v_static_count > 0 AND v_static_count = v_static_idx0_count AND COALESCE(p_completion_time_seconds, 0) < 45);

  v_scores := jsonb_build_object(
    'training_effectiveness', v_dim_te,
    'attrition_risk', v_dim_ar,
    'support_guidance', v_dim_sg,
    'adjustment_wellbeing', v_dim_aw,
    'transition_readiness', CASE WHEN v_has_tr THEN to_jsonb(v_dim_tr) ELSE 'null'::jsonb END,
    'composite', v_dim_te + v_dim_ar + v_dim_sg + v_dim_aw + (CASE WHEN v_has_tr THEN v_dim_tr ELSE 0 END),
    'stage_multiplier', v_multiplier,
    'final_score', v_final
  );

  INSERT INTO public.survey_responses (
    employee_id, stage, responses, free_text_response, scores,
    critical_flags, gaming_flag, completion_time_seconds, final_score, risk_level
  ) VALUES (
    v_employee_id, p_stage, v_response_records, p_free_text, v_scores,
    v_critical_flags, v_gaming, COALESCE(p_completion_time_seconds, 0), v_final, v_risk
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_survey_response(text, survey_stage, jsonb, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_survey_response(text, survey_stage, jsonb, text, integer) TO anon, authenticated;