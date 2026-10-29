export interface ActivityPresetSuggestion {
  id: string;
  label: string;
  keywords: string[];
  activityType: string;
  position: string;
  organization: string;
  description: string;
  relatedAddOns: string[];
}

export interface AddOnPhraseSuggestion {
  text: string;
  tag: 'Impact' | 'Leadership' | 'Skill' | 'Outcome' | 'Metric';
}

export interface PolishedVariation {
  angle: string;
  text: string;
}

export interface DynamicDescriptionSuggestionsResult {
  /** Active topic tags detected from the chosen activity + typed description */
  detectedTopics: string[];
  /** Bite-sized related phrases the user can click to append (+ ...) as they type */
  relatedAddOns: AddOnPhraseSuggestion[];
  /** Complete <=150-char polished statements that dynamically weave what the user typed with activity-specific details */
  fullStatements: PolishedVariation[];
  /** Context-aware action verbs that adapt to chosen activity + typed text */
  recommendedVerbs: string[];
}

interface CategoryDomainProfile {
  roles: string[];
  orgSuffixes: string[];
  verbs: string[];
  addOns: AddOnPhraseSuggestion[];
  templates: string[];
}

export const CATEGORY_PROFILES: Record<string, CategoryDomainProfile> = {
  Academic: {
    roles: [
      'Academic Decathlon Captain',
      'Quiz Bowl Varsity Lead',
      'Honor Society President',
      'Peer Study Group Founder',
      'Scholastic Bowl Strategist',
    ],
    orgSuffixes: [
      'Academic Decathlon Team',
      'National Honor Society (NJHS / NHS)',
      'Varsity Quiz Bowl Club',
      'Scholastic Trivia League',
    ],
    verbs: ['Spearheaded', 'Researched', 'Captained', 'Tutored', 'Synthesized', 'Compiled', 'Qualified'],
    addOns: [
      { text: 'led weekly study sessions for 18 peers', tag: 'Leadership' },
      { text: 'compiled 45-page subject study guides', tag: 'Skill' },
      { text: 'placed Top 3 at Regional Finals', tag: 'Outcome' },
      { text: 'mentored 10 middle school novices', tag: 'Impact' },
      { text: 'organized twice-weekly buzzer drills', tag: 'Leadership' },
      { text: 'earned 4 individual subject medals', tag: 'Outcome' },
    ],
    templates: [
      'Captained 8-member Academic Decathlon squad; synthesized 250-page study packets; earned 4 Regional Gold Medals.',
      'Led twice-weekly Quiz Bowl buzzer practices for 22 students; mentored middle school team; qualified for State Finals.',
      'Coordinated NHS peer tutoring desk serving 60+ students; hosted 6 school-wide exam prep nights.',
    ],
  },
  Art: {
    roles: [
      'Lead Student Illustrator',
      'Portfolio Artist & Curator',
      'Ceramics & Sculpture Lead',
      'Community Mural Co-Director',
      'National Art Honor Society Officer',
    ],
    orgSuffixes: [
      'Visual Arts Guild & Studio',
      'National Art Honor Society',
      'Community Youth Art Collective',
      'Ceramics & Printmaking Workshop',
    ],
    verbs: ['Illustrated', 'Sculpted', 'Curated', 'Exhibited', 'Designed', 'Painted', 'Restored'],
    addOns: [
      { text: 'exhibited 12 original pieces at city showcase', tag: 'Outcome' },
      { text: 'co-designed a 24-ft campus hallway mural', tag: 'Impact' },
      { text: 'taught weekend art workshops for 25 kids', tag: 'Leadership' },
      { text: 'explored acrylic, charcoal & digital media', tag: 'Skill' },
      { text: 'curated annual gallery of 80+ student works', tag: 'Leadership' },
      { text: 'designed posters for 10 school clubs', tag: 'Impact' },
    ],
    templates: [
      'Created 16 acrylic, charcoal & digital pieces; selected for Regional Youth Exhibition; co-painted 24-ft library mural.',
      'Curated annual student art gallery featuring 85+ works; led weekly figure-drawing & ceramics studio sessions.',
      'Designed custom posters & illustrations for 10 school clubs; taught weekend watercolor classes to 25 elementary kids.',
    ],
  },
  'Athletics: Club': {
    roles: [
      'Travel Team Co-Captain',
      'Starting Midfielder / Point Guard',
      'Year-Round Competitive Swimmer',
      'Junior Assistant Clinic Coach',
      'Tournament Squad Starter',
    ],
    orgSuffixes: [
      'Premier Travel Soccer Club',
      'Regional Aquatics Swim Club',
      'AAU / Club Basketball Academy',
      'Junior Tennis & Athletics Club',
    ],
    verbs: ['Competed', 'Trained', 'Captained', 'Coached', 'Qualified', 'Paced', 'Conditioned'],
    addOns: [
      { text: 'competed in 30+ regional tournament matches', tag: 'Metric' },
      { text: 'trained 10 hrs/wk year-round across 4 seasons', tag: 'Skill' },
      { text: 'led team warm-ups and agility drills', tag: 'Leadership' },
      { text: 'coached weekend skills clinics for 20 U-12 kids', tag: 'Impact' },
      { text: 'helped squad qualify for State Cup Finals', tag: 'Outcome' },
      { text: 'analyzed game film with 18 teammates', tag: 'Leadership' },
    ],
    templates: [
      'Competed in 35+ regional travel games annually; led pre-game agility drills; helped team win Regional Championship.',
      'Trained 10 hrs/wk year-round; dropped personal best times across 4 events; mentored 12 younger 6th–8th grade athletes.',
      'Served as club team co-captain; organized off-season film review & weekend passing clinics for 20 youth players.',
    ],
  },
  'Athletics: JV/Varsity': {
    roles: [
      'Varsity Team Captain',
      'Varsity Distance Runner',
      'Starting Varsity Player',
      'JV Captain & Freshman Mentor',
      'Scholar-Athlete Letter Winner',
    ],
    orgSuffixes: [
      'High School Varsity Track & Cross Country',
      'Varsity Soccer / Basketball Program',
      'School Athletics Department',
      'JV & Varsity Swim / Tennis Team',
    ],
    verbs: ['Captained', 'Competed', 'Sprinted', 'Conditioned', 'Mentored', 'Anchored', 'Led'],
    addOns: [
      { text: 'led summer conditioning for 30+ teammates', tag: 'Leadership' },
      { text: 'earned Varsity Letter & Scholar-Athlete honors', tag: 'Outcome' },
      { text: 'mentored incoming 9th-grade & middle school players', tag: 'Impact' },
      { text: 'dropped 5K PR by 95 seconds over 3 seasons', tag: 'Metric' },
      { text: 'started all 18 regular & playoff games', tag: 'Metric' },
      { text: 'anchored relay squad to District Finals', tag: 'Outcome' },
    ],
    templates: [
      'Competed in 22 varsity meets/games; led summer conditioning for 28 teammates; earned All-Conference Scholar-Athlete honors.',
      'Started all 18 varsity matches; mentored incoming freshmen & middle school clinic players; reached Regional Semifinals.',
      'Dropped 5K time by 2 minutes over 3 seasons; organized summer pacing groups & team dinners for 35 runners.',
    ],
  },
  'Career Oriented': {
    roles: [
      'DECA / FBLA Chapter President',
      'HOSA Future Health Lead',
      'Student Micro-Business Founder',
      'Mock Business Pitch Finalist',
      'Engineering Explorers Captain',
    ],
    orgSuffixes: [
      'DECA / FBLA Business Chapter',
      'HOSA Future Health Professionals',
      'Youth Entrepreneurship Incubator',
      'Pre-Med & Healthcare Society',
    ],
    verbs: ['Pitched', 'Founded', 'Analyzed', 'Marketed', 'Budgeted', 'Launched', 'Coordinated'],
    addOns: [
      { text: 'wrote 20-page business plan & placed Top 5 at State', tag: 'Outcome' },
      { text: 'hosted 8 career panels with local professionals', tag: 'Leadership' },
      { text: 'mentored 15 novices in financial case studies', tag: 'Impact' },
      { text: 'raised $1,800 for school scholarship fund', tag: 'Metric' },
      { text: 'organized Red Cross blood drive collecting 60 pints', tag: 'Impact' },
      { text: 'practiced clinical first-aid & triage protocols', tag: 'Skill' },
    ],
    templates: [
      'Led 45-member DECA/FBLA chapter; coached 12 teams in marketing & finance case studies; 6 qualified for State Finals.',
      'Trained in clinical emergency skills for HOSA competition; organized campus blood drive collecting 60+ pints.',
      'Founded student custom-apparel venture; managed budgeting & design; donated $1,800 profit to student aid fund.',
    ],
  },
  'Community Service (Volunteer)': {
    roles: [
      'Co-Founder & Lead Volunteer',
      'Peer Math & Reading Tutor',
      'Youth Shift Coordinator',
      'Weekend STEM Kit Designer',
      'Senior Center Music & Tech Companion',
    ],
    orgSuffixes: [
      'Public Library Youth Tutoring Program',
      'Community Food Bank & Mutual Aid Pantry',
      'Local Hospital Junior Auxiliary',
      'Neighborhood Habitat & Literacy Project',
    ],
    verbs: ['Tutored', 'Organized', 'Distributed', 'Mobilized', 'Assembled', 'Spearheaded', 'Mentored'],
    addOns: [
      { text: 'tutored 20+ elementary & middle school kids weekly', tag: 'Impact' },
      { text: 'packed & distributed 3,500+ lbs of groceries', tag: 'Metric' },
      { text: 'recruited & trained 16 teen shift volunteers', tag: 'Leadership' },
      { text: 'designed 30+ hands-on math & reading worksheets', tag: 'Skill' },
      { text: 'logged 140+ verified service hours across 3 grades', tag: 'Metric' },
      { text: 'earned President’s Volunteer Service Award', tag: 'Outcome' },
    ],
    templates: [
      'Tutored 20+ 4th–8th grade students weekly in math & reading; created 35 custom study games across 120+ service hours.',
      'Coordinated monthly food & book drives collecting 2,400+ items; led 18 teen volunteers serving 150 local families.',
      'Designed & led hands-on weekend science experiments for 60+ elementary kids at the local public library branch.',
    ],
  },
  'Computer/Technology': {
    roles: [
      'Lead Full-Stack Developer',
      'Coding Club President',
      'Hackathon Project Captain',
      'AI & Python Workshop Instructor',
      'Cybersecurity Team Lead',
    ],
    orgSuffixes: [
      'Computer Science & Coding Club',
      'Girls Who Code / Hack Club Chapter',
      'Youth Hackathon & App Lab',
      'CyberPatriot Competition Squad',
    ],
    verbs: ['Programmed', 'Engineered', 'Deployed', 'Automated', 'Debugged', 'Prototyped', 'Taught'],
    addOns: [
      { text: 'built & deployed web app for 300+ student users', tag: 'Impact' },
      { text: 'taught weekly Python & JS workshops to 24 peers', tag: 'Leadership' },
      { text: 'won 1st Place at Regional Youth Hackathon', tag: 'Outcome' },
      { text: 'engineered in Python, TypeScript, and React', tag: 'Skill' },
      { text: 'published 5 open-source tools on GitHub', tag: 'Metric' },
      { text: 'hardened Linux/Windows networks in CyberPatriot', tag: 'Skill' },
    ],
    templates: [
      'Built & deployed 3 web apps used by 400+ students; taught weekly Python & web dev lessons to 25 6th–9th graders.',
      'Captained 4-person hackathon squad; engineered accessible study planner app; won 1st Place Regional Innovation Award.',
      'Secured Linux & Windows servers in CyberPatriot rounds; led weekly club workshops on algorithms & digital security.',
    ],
  },
  Cultural: {
    roles: [
      'Cultural Heritage Night Director',
      'Club President & Event Host',
      'Traditional Arts & Culinary Lead',
      'Language Exchange Coordinator',
    ],
    orgSuffixes: [
      'Cultural Student Union & Heritage Club',
      'International Festival Committee',
      'Multicultural Youth Alliance',
    ],
    verbs: ['Organized', 'Celebrated', 'Curated', 'Choreographed', 'Hosted', 'Bridged', 'Showcased'],
    addOns: [
      { text: 'directed Cultural Night for 450+ attendees', tag: 'Outcome' },
      { text: 'coordinated 12 traditional music & food booths', tag: 'Leadership' },
      { text: 'led bi-weekly language exchange for 30 peers', tag: 'Impact' },
      { text: 'raised $1,100 for international relief charity', tag: 'Metric' },
    ],
    templates: [
      'Directed annual Multicultural Assembly for 600+ guests; coordinated 14 cultural performances and charity food bazaar.',
      'Led weekly club discussions on global traditions & history; partnered with 5 student clubs to host Unity Week.',
    ],
  },
  Dance: {
    roles: [
      'Principal Dancer & Choreographer',
      'Dance Team Captain',
      'Ensemble Rehearsal Leader',
      'Junior Dance Class Instructor',
    ],
    orgSuffixes: [
      'Academy of Dance & Performing Arts',
      'School Varsity Dance & Drill Team',
      'Classical & Contemporary Dance Troupe',
    ],
    verbs: ['Choreographed', 'Performed', 'Rehearsed', 'Instructed', 'Staged', 'Synchronized'],
    addOns: [
      { text: 'choreographed 4 original ensemble routines', tag: 'Skill' },
      { text: 'trained 8 hrs/wk in ballet, contemporary & hip-hop', tag: 'Metric' },
      { text: 'taught beginner rhythm classes to 15 younger kids', tag: 'Leadership' },
      { text: 'performed in 8 seasonal stage productions', tag: 'Outcome' },
    ],
    templates: [
      'Trained 9 hrs/wk across 5 grades; performed lead roles in 8 seasonal productions; choreographed 3 student showcase pieces.',
      'Captained 18-member school dance team; led daily warm-ups & pep rally routines; won Regional Precision Award.',
    ],
  },
  'Debate/Speech': {
    roles: [
      'Varsity Public Forum Captain',
      'Model UN Head Delegate',
      'Novice Speech & Debate Coach',
      'Mock Trial Lead Attorney',
      'Original Oratory Finalist',
    ],
    orgSuffixes: [
      'Speech & Debate Team (NSDA)',
      'Model United Nations (MUN) Club',
      'County High School Mock Trial Team',
    ],
    verbs: ['Debated', 'Researched', 'Coached', 'Cross-examined', 'Authored', 'Advocated', 'Finaled'],
    addOns: [
      { text: 'competed in 14 regional & state tournaments', tag: 'Metric' },
      { text: 'coached 16 middle & high school novices weekly', tag: 'Leadership' },
      { text: 'authored 50+ pages of policy & evidence briefs', tag: 'Skill' },
      { text: 'won Best Delegate gavel at 3 MUN conferences', tag: 'Outcome' },
      { text: 'advanced to State Semifinals in Public Forum', tag: 'Outcome' },
    ],
    templates: [
      'Competed in 16 regional & state debate tournaments; coached 14 middle/high school novices weekly; NSDA Honor Society.',
      'Served as Model UN Head Delegate; trained 25 members in parliamentary procedure & resolution writing; won 4 Gavels.',
    ],
  },
  Environmental: {
    roles: [
      'Campus Sustainability Chair',
      'Community Garden Founder',
      'Composting & Recycling Lead',
      'Watershed Restoration Volunteer',
    ],
    orgSuffixes: [
      'Eco-Action & Sustainability Club',
      'Campus Pollinator Garden Project',
      'Youth Climate & Conservation Corps',
    ],
    verbs: ['Cultivated', 'Diverted', 'Restored', 'Tested', 'Planted', 'Campaigned', 'Recycled'],
    addOns: [
      { text: 'diverted 1,500+ lbs of cafeteria food waste', tag: 'Metric' },
      { text: 'planted 80+ native pollinator species on campus', tag: 'Impact' },
      { text: 'harvested 200+ lbs of produce for local shelter', tag: 'Outcome' },
      { text: 'tested creek water quality monthly with sensors', tag: 'Skill' },
      { text: 'led 20 student volunteers in trail cleanups', tag: 'Leadership' },
    ],
    templates: [
      'Launched school-wide composting & recycling initiative diverting 1,800 lbs of waste; led 20 student eco-ambassadors.',
      'Built & maintained 6 raised garden beds; harvested 200+ lbs of fresh produce donated to local family food pantry.',
    ],
  },
  'Family Responsibilities': {
    roles: [
      'After-School Sibling Caregiver',
      'Family Bilingual Translator',
      'Household & Meal Prep Coordinator',
      'Grandparent Care Assistant',
    ],
    orgSuffixes: [
      'Family Household Responsibilities',
      'Home & Extended Family Care',
    ],
    verbs: ['Cared', 'Translated', 'Prepared', 'Tutored', 'Managed', 'Supported', 'Coordinated'],
    addOns: [
      { text: 'cared for 2 younger siblings 10 hrs/wk after school', tag: 'Metric' },
      { text: 'helped daily with homework, dinner & bedtime routines', tag: 'Impact' },
      { text: 'translated medical & school documents for parents', tag: 'Skill' },
      { text: 'assisted grandparents with weekly errands & tech', tag: 'Impact' },
    ],
    templates: [
      'Supervised 2 younger siblings (10 hrs/wk) while parents worked evening shifts; cooked dinner & tutored daily homework.',
      'Served as primary bilingual translator for family appointments & forms; assisted grandparents with weekly groceries.',
    ],
  },
  'Foreign Exchange': {
    roles: [
      'Youth Cultural Exchange Ambassador',
      'Host Family Student Liaison',
      'Summer Language Immersion Scholar',
    ],
    orgSuffixes: [
      'International Student Exchange Program',
      'Sister City Youth Delegation',
    ],
    verbs: ['Immersed', 'Bridged', 'Hosted', 'Translated', 'Presented', 'Collaborated'],
    addOns: [
      { text: 'conversed daily in host language with family', tag: 'Skill' },
      { text: 'delivered 6 cultural exchange presentations', tag: 'Impact' },
      { text: 'guided 8 visiting exchange students on campus', tag: 'Leadership' },
    ],
    templates: [
      'Completed intensive language & cultural immersion with host family; delivered 5 presentations comparing school systems.',
    ],
  },
  Internship: {
    roles: [
      'Summer Engineering Intern',
      'Student Research & Data Intern',
      'Community Non-Profit Intern',
      'Product Design & QA Intern',
    ],
    orgSuffixes: [
      'Local Tech / Engineering Firm',
      'University Summer Mentorship Lab',
      'Civic Innovation & Design Studio',
    ],
    verbs: ['Prototyped', 'Analyzed', 'Automated', 'Shadowed', 'Documented', 'Tested', 'Presented'],
    addOns: [
      { text: 'automated data scripts saving team 5 hrs/wk', tag: 'Impact' },
      { text: 'shadowed senior engineers across 8-week sprint', tag: 'Skill' },
      { text: 'presented final capstone project to 20 staff', tag: 'Outcome' },
    ],
    templates: [
      'Collaborated with engineering mentor to test product prototypes; built automated QA dashboard; presented to 20 staff.',
    ],
  },
  'Journalism/Publication': {
    roles: [
      'Editor-in-Chief',
      'Science & Data Columnist',
      'Yearbook Layout & Photo Editor',
      'Literary Magazine Curator',
      'School Podcast Host & Producer',
    ],
    orgSuffixes: [
      'The Student Chronicle Newspaper',
      'School Yearbook & Media Staff',
      'Inkwell Literary & Arts Magazine',
    ],
    verbs: ['Authored', 'Edited', 'Interviewed', 'Published', 'Photographed', 'Designed', 'Produced'],
    addOns: [
      { text: 'published 16 articles reaching 1,400+ readers', tag: 'Metric' },
      { text: 'edited page layouts for 8 print & digital issues', tag: 'Skill' },
      { text: 'interviewed 30+ students, teachers & community leads', tag: 'Impact' },
      { text: 'mentored 8 middle & freshman staff writers', tag: 'Leadership' },
    ],
    templates: [
      'Authored 18 feature articles on campus policy, STEM & athletics; edited 6 junior writers’ drafts for monthly paper.',
      'Managed 220-page yearbook layout & photo schedule; led 12 student photographers covering 60+ school events.',
    ],
  },
  'Junior R.O.T.C.': {
    roles: [
      'Cadet Platoon Commander',
      'Color Guard & Drill Team Lead',
      'Cadet Logistics Officer',
      'Raider Fitness Team Captain',
    ],
    orgSuffixes: [
      'High School JROTC Battalion',
      'Civil Air Patrol / Sea Cadets Squadron',
    ],
    verbs: ['Commanded', 'Drilled', 'Instructed', 'Organized', 'Inspected', 'Mentored'],
    addOns: [
      { text: 'led 28 cadets in weekly precision drill & PT', tag: 'Leadership' },
      { text: 'presented Color Guard at 15 civic events', tag: 'Impact' },
      { text: 'coordinated 120+ battalion community service hrs', tag: 'Metric' },
    ],
    templates: [
      'Instructed 30 cadets in leadership, land navigation & drill precision; coordinated 120+ battalion service hours.',
    ],
  },
  LGBT: {
    roles: [
      'Club President & Peer Facilitator',
      'Safe Space Workshop Organizer',
      'Inclusion Week Coordinator',
    ],
    orgSuffixes: [
      'Gender & Sexuality Alliance (GSA)',
      'Student Inclusion & Kindness Coalition',
    ],
    verbs: ['Facilitated', 'Organized', 'Advocated', 'Hosted', 'Educated', 'Supported'],
    addOns: [
      { text: 'facilitated weekly peer support discussions for 25 students', tag: 'Leadership' },
      { text: 'organized 4 campus kindness & inclusion panels', tag: 'Impact' },
    ],
    templates: [
      'Led weekly GSA meetings for 30+ students; partnered with counselors to host 4 campus inclusion & anti-bullying panels.',
    ],
  },
  'Music: Instrumental': {
    roles: [
      'First Chair Musician & Section Leader',
      'Solo Pianist & Accompanist',
      'Chamber Quartet Coordinator',
      'Marching Band Section Captain',
    ],
    orgSuffixes: [
      'School Symphony Orchestra & Wind Ensemble',
      'Regional Youth Philharmonic',
      'Community Music Conservatory',
    ],
    verbs: ['Performed', 'Practiced', 'Arranged', 'Accompanied', 'Conducted', 'Mentored', 'Auditioned'],
    addOns: [
      { text: 'led weekly sectionals for 12 instrument peers', tag: 'Leadership' },
      { text: 'performed in 10+ school & community concerts/yr', tag: 'Metric' },
      { text: 'arranged quartet music for 6 senior living centers', tag: 'Impact' },
      { text: 'earned Superior (Level 1) rating at State Solo Fest', tag: 'Outcome' },
      { text: 'practiced 6 hrs/wk across grades 6–12', tag: 'Skill' },
      { text: 'mentored 8 middle school beginning musicians', tag: 'Leadership' },
    ],
    templates: [
      'First chair musician; led 14-member section rehearsals; performed 12 annual concerts; selected for Regional Honor Orchestra.',
      'Practiced classical & jazz piano 6 hrs/wk across 6 grades; accompanied school choir; played monthly at senior centers.',
    ],
  },
  'Music: Vocal': {
    roles: [
      'Choir Section Leader',
      'A Cappella Ensemble Director',
      'Chamber Choir Soloist',
      'Regional Honor Choir Vocalist',
    ],
    orgSuffixes: [
      'Varsity Concert & Chamber Choir',
      'Student A Cappella Ensemble',
      'Regional Youth Chorus',
    ],
    verbs: ['Harmonized', 'Directed', 'Arranged', 'Performed', 'Soloed', 'Rehearsed'],
    addOns: [
      { text: 'arranged 5 vocal harmonies for 16-singer group', tag: 'Skill' },
      { text: 'led sight-reading & warm-up rehearsals weekly', tag: 'Leadership' },
      { text: 'performed at 12 school & civic seasonal concerts', tag: 'Metric' },
      { text: 'selected for All-State / Regional Honor Choir', tag: 'Outcome' },
    ],
    templates: [
      'Led 15-member vocal section in sight-reading & rehearsals; performed 10 annual concerts; earned State Solo Gold rating.',
    ],
  },
  Religious: {
    roles: [
      'Youth Group Service Leader',
      'Weekend Youth Teacher Assistant',
      'Retreat & Music Coordinator',
    ],
    orgSuffixes: [
      'Faith Community Youth Fellowship',
      'Interfaith Youth Service Council',
      'Weekend Heritage & Youth School',
    ],
    verbs: ['Coordinated', 'Taught', 'Volunteered', 'Facilitated', 'Prepared', 'Mentored'],
    addOns: [
      { text: 'co-taught weekly classes for 18 elementary kids', tag: 'Leadership' },
      { text: 'organized monthly soup-kitchen meal prep shifts', tag: 'Impact' },
      { text: 'collected 200+ winter coats for local families', tag: 'Metric' },
    ],
    templates: [
      'Assisted teaching 20 3rd–5th grade students weekly; coordinated holiday food & coat drives serving 100+ local families.',
    ],
  },
  Research: {
    roles: [
      'Student Lab Researcher',
      'Independent Science Fair Investigator',
      'Bioinformatics & Data Assistant',
    ],
    orgSuffixes: [
      'High School / University Summer Research Lab',
      'Regional Science & Engineering Fair (ISEF) Track',
    ],
    verbs: ['Investigated', 'Synthesized', 'Modeled', 'Assayed', 'Quantified', 'Co-authored', 'Presented'],
    addOns: [
      { text: 'analyzed 1,200+ data samples in Python/R', tag: 'Skill' },
      { text: 'designed 8-week controlled filtration experiment', tag: 'Skill' },
      { text: 'won 1st Place at Regional Science & Eng Fair', tag: 'Outcome' },
      { text: 'presented research poster to 15 university judges', tag: 'Impact' },
    ],
    templates: [
      'Conducted 150-hr independent study on water microplastics; built low-cost optical sensor; won 1st Place Regional Science Fair.',
    ],
  },
  Robotics: {
    roles: [
      'Lead Autonomous Programmer',
      'Mechanical Build & CAD Captain',
      'Middle School Robotics Mentor',
      'Drive Team Strategist',
      'Electrical & Sensor Integration Lead',
    ],
    orgSuffixes: [
      'VEX / FIRST Robotics Competition Team',
      'Middle & High School Robotics Lab',
      'FIRST Tech Challenge (FTC) Squad',
    ],
    verbs: ['Engineered', 'Programmed', 'Prototyped', 'Machined', 'CAD-modeled', 'Mentored', 'Calibrated'],
    addOns: [
      { text: 'programmed C++/Python PID autonomous routines', tag: 'Skill' },
      { text: 'mentored 15 6th–8th grade robotics rookies', tag: 'Leadership' },
      { text: 'CAD-modeled & 3D-printed custom intake claw', tag: 'Skill' },
      { text: 'boosted match autonomous scoring by 40%', tag: 'Metric' },
      { text: 'qualified for State Championship 2x', tag: 'Outcome' },
      { text: 'hosted 6 robot demos at local elementary schools', tag: 'Impact' },
    ],
    templates: [
      'Programmed C++ vision-sensor autonomous routines; mentored 18 6th–8th grade rookies; qualified for State Championship 2x.',
      'Led 10-member mechanical & CAD subteam; designed custom aluminum drivetrain; won Regional Engineering Design Award.',
      'Started in 6th grade Lego League; advanced to FTC/VEX lead builder; hosted 8 hands-on robot demos for elementary kids.',
    ],
  },
  'School Spirit': {
    roles: [
      'Pep Club / Cheer Captain',
      'Freshman & 6th Grade Orientation Mentor',
      'Rally & Spirit Week Coordinator',
    ],
    orgSuffixes: [
      'Varsity Cheer & Spirit Squad',
      'Link Crew / WEB Peer Mentors',
      'Campus Student Spirit Council',
    ],
    verbs: ['Energized', 'Welcomed', 'Choreographed', 'Mentored', 'Coordinated', 'Hosted'],
    addOns: [
      { text: 'mentored 15 incoming 6th/9th grade students all year', tag: 'Leadership' },
      { text: 'planned 6 pep rallies for 1,200+ students', tag: 'Impact' },
    ],
    templates: [
      'Selected as Link Crew / WEB peer mentor; guided 18 incoming students through orientation, study habits, and club fairs.',
    ],
  },
  'Science/Math': {
    roles: [
      'Science Olympiad Team Captain',
      'MathCounts / AMC Peer Coach',
      'Chemistry & Physics Club Lead',
      'STEM Bowl Varsity Competitor',
    ],
    orgSuffixes: [
      'Science Olympiad Varsity Team',
      'Math Circle & AMC Competition Club',
      'Junior Academy of Science',
    ],
    verbs: ['Calculated', 'Experimented', 'Calibrated', 'Coached', 'Competed', 'Constructed', 'Solved'],
    addOns: [
      { text: 'competed in 4 lab/build events & won 3 Regional medals', tag: 'Outcome' },
      { text: 'coached 16 middle school MathCounts students weekly', tag: 'Leadership' },
      { text: 'built balsa wood bridges & calibrated optics devices', tag: 'Skill' },
      { text: 'qualified for AMC 10/12 Honor Roll distinction', tag: 'Outcome' },
    ],
    templates: [
      'Captained 15-member Science Olympiad team; built balsa bridges & calibrated optics devices; placed Top 4 at Regionals.',
      'Qualified for AMC 10/12 Honor Roll; coached 14 6th–8th grade MathCounts students weekly in combinatorics & geometry.',
    ],
  },
  'Social Justice': {
    roles: [
      'Youth Civic Action Organizer',
      'Peer Restorative Justice Mediator',
      'Community Book Drive Founder',
    ],
    orgSuffixes: [
      'Youth Civic Engagement Coalition',
      'Student Restorative Justice Board',
      'Books & Equity Project',
    ],
    verbs: ['Advocated', 'Mediated', 'Mobilized', 'Organized', 'Facilitated', 'Presented'],
    addOns: [
      { text: 'collected 900+ diverse books for elementary classrooms', tag: 'Metric' },
      { text: 'facilitated 10 student town halls on campus climate', tag: 'Leadership' },
    ],
    templates: [
      'Organized youth civic literacy workshops for 200+ students; collected 900+ children’s books for Title I elementary schools.',
    ],
  },
  'Student Govt./Politics': {
    roles: [
      'Class President',
      'ASB Student Body Treasurer',
      'Elected Grade Representative',
      'Student Senate Committee Chair',
      'Middle School Council Officer',
    ],
    orgSuffixes: [
      'Associated Student Body (ASB) Council',
      'Student Senate & Class Cabinet',
      'District Youth Advisory Board',
    ],
    verbs: ['Elected', 'Represented', 'Budgeted', 'Chaired', 'Spearheaded', 'Legislated', 'Organized'],
    addOns: [
      { text: 'represented 350+ classmates in policy meetings', tag: 'Leadership' },
      { text: 'managed $3,200 club grant & event budget', tag: 'Metric' },
      { text: 'organized charity carnival raising $2,800', tag: 'Outcome' },
      { text: 'surveyed 400+ students to expand library hours', tag: 'Impact' },
    ],
    templates: [
      'Elected Grade Representative 3x; surveyed 400+ students on campus improvements; organized charity carnival raising $2,800.',
    ],
  },
  'Theater/Drama': {
    roles: [
      'Lead Stage Manager',
      'Principal / Ensemble Actor',
      'Lighting & Sound Tech Lead',
      'Costume & Set Construction Captain',
    ],
    orgSuffixes: [
      'High School Drama Guild & Thespian Troupe',
      'Community Youth Musical Theater',
      'Stagecraft & Technical Crew',
    ],
    verbs: ['Performed', 'Directed', 'Cued', 'Constructed', 'Stage-managed', 'Rehearsed', 'Designed'],
    addOns: [
      { text: 'called 180+ lighting & sound cues across 8 shows', tag: 'Skill' },
      { text: 'performed for 1,600+ total community audience members', tag: 'Metric' },
      { text: 'coordinated 35 cast & crew members backstage', tag: 'Leadership' },
      { text: 'led after-school improv games for 20 middle schoolers', tag: 'Impact' },
    ],
    templates: [
      'Stage-managed 4 mainstage productions; coordinated 35 cast/crew members & 180+ lighting cues for 1,500+ audience guests.',
      'Performed lead & ensemble roles in 6 musicals/plays across grades 6–11; led improv warm-ups for 20 younger drama students.',
    ],
  },
  'Work (Paid)': {
    roles: [
      'Part-Time Math & Coding Instructor',
      'Certified Youth Soccer Referee',
      'Lifeguard & Swim Instructor',
      'Barista / Customer Service Associate',
    ],
    orgSuffixes: [
      'Mathnasium / Kumon Learning Center',
      'City Parks & Recreation Aquatics',
      'Youth Sports Referee Association',
      'Local Neighborhood Cafe & Bakery',
    ],
    verbs: ['Instructed', 'Officiated', 'Supervised', 'Managed', 'Trained', 'Served', 'Balanced'],
    addOns: [
      { text: 'worked 10 hrs/wk during school year while keeping 4.0 GPA', tag: 'Metric' },
      { text: 'trained 5 new teenage staff members on shift routines', tag: 'Leadership' },
      { text: 'taught water safety & swim strokes to 45+ kids', tag: 'Impact' },
      { text: 'officiated 60+ youth matches with calm sportsmanship', tag: 'Metric' },
    ],
    templates: [
      'Officiated 60+ youth soccer matches; enforced safety & sportsmanship rules; mentored 8 first-year middle school referees.',
      'Worked 10 hrs/wk tutoring K–8 students in math while maintaining full honors courseload; promoted to Lead Instructor.',
    ],
  },
  'Other Club/Activity': {
    roles: [
      'Chess Club President',
      'Culinary & Baking Club Founder',
      'Board Game & Strategy Lead',
      'MakerSpace & Origami Club Lead',
    ],
    orgSuffixes: [
      'School Chess & Strategy Club',
      'Baking for Good Charity Club',
      'MakerSpace & Creative Hobbies Guild',
    ],
    verbs: ['Founded', 'Organized', 'Taught', 'Hosted', 'Built', 'Shared', 'Coordinated'],
    addOns: [
      { text: 'grew club membership from 8 to 32 students', tag: 'Metric' },
      { text: 'hosted monthly tournaments & beginner lessons', tag: 'Leadership' },
      { text: 'organized 4 seasonal bake sales for local shelter', tag: 'Impact' },
    ],
    templates: [
      'Founded club with 28 members; organized weekly hands-on workshops and 4 seasonal charity fundraisers for local shelters.',
    ],
  },
};

/**
 * Fine-grained Topic & Sub-Activity Graph:
 * Matches specific activities (chess, violin, soccer, python, cad, tutoring, baking, swimming, etc.)
 * AND specific actions typed in the description (built, taught, won, coded, designed, practiced, raised, etc.)
 */
interface TopicTriggerNode {
  topicName: string;
  matchWords: string[];
  suggestedCategory?: string;
  roles: string[];
  orgs: string[];
  verbs: string[];
  addOns: AddOnPhraseSuggestion[];
  descriptions: string[];
}

const TOPIC_KNOWLEDGE_GRAPH: TopicTriggerNode[] = [
  {
    topicName: 'Autonomous & Sensors',
    matchWords: ['autonomous', 'sensor', 'pid', 'vision', 'camera', 'odometry', 'auto', 'lidar', 'ultrasonic', 'calibrate'],
    suggestedCategory: 'Robotics',
    roles: ['Lead Autonomous & Sensor Programmer', 'Controls & Vision Software Lead'],
    orgs: ['VEX / FIRST Robotics Competition Team', 'Autonomous Robotics Lab'],
    verbs: ['Programmed', 'Calibrated', 'Engineered', 'Optimized', 'Debugged'],
    addOns: [
      { text: 'coded C++/Python PID control loops for 15-sec auto period', tag: 'Skill' },
      { text: 'integrated optical & inertial sensors for 95% path accuracy', tag: 'Metric' },
      { text: 'boosted autonomous match scoring by 40% at Regionals', tag: 'Outcome' },
      { text: 'taught sensor logic to 10 middle school rookie coders', tag: 'Leadership' },
    ],
    descriptions: [
      'Engineered C++/Python PID vision routines for 15-sec autonomous period; boosted scoring accuracy 40%; State Finalist.',
      'Calibrated optical & inertial sensors across 24 qualification matches; taught autonomous coding to 12 middle schoolers.',
    ],
  },
  {
    topicName: 'CAD & Mechanical Build',
    matchWords: ['cad', '3d', 'solidworks', 'onshape', 'fusion', 'drivetrain', 'chassis', 'intake', 'flywheel', 'gear', 'claw', 'arm', 'mechanical', 'build', 'built', 'machined'],
    suggestedCategory: 'Robotics',
    roles: ['Mechanical Build & CAD Captain', 'Lead Hardware & Prototyping Engineer'],
    orgs: ['VEX / FIRST Robotics Build Team', 'School MakerSpace & Fabrication Lab'],
    verbs: ['CAD-modeled', 'Prototyped', 'Machined', 'Engineered', 'Fabricated', 'Tested'],
    addOns: [
      { text: 'CAD-modeled custom drivetrain in Onshape/Fusion 360', tag: 'Skill' },
      { text: '3D-printed 14 rapid prototype iterations for intake claw', tag: 'Metric' },
      { text: 'reduced robot cycle time by 3.5 seconds in matches', tag: 'Outcome' },
      { text: 'trained 12 younger teammates in safe tool & gear assembly', tag: 'Leadership' },
    ],
    descriptions: [
      'CAD-modeled & 3D-printed 14 intake prototypes in Onshape; led 8-student build crew; won Regional Engineering Design Award.',
      'Engineered high-torque gear drivetrain & pneumatic claw; mentored 15 6th–8th grade builders in Saturday robotics lab.',
    ],
  },
  {
    topicName: 'Coding & App Development',
    matchWords: ['code', 'coding', 'coded', 'python', 'javascript', 'typescript', 'react', 'app', 'website', 'web', 'game', 'software', 'algorithm', 'ai', 'machine learning', 'github', 'hack', 'hackathon'],
    suggestedCategory: 'Computer/Technology',
    roles: ['Lead App Developer & Club Instructor', 'Hackathon Team Captain', 'Full-Stack Student Developer'],
    orgs: ['School Coding & AI Club', 'Regional Youth Hackathon & App Lab', 'Girls Who Code / Hack Club'],
    verbs: ['Programmed', 'Deployed', 'Architected', 'Automated', 'Debugged', 'Launched'],
    addOns: [
      { text: 'deployed full-stack web app serving 300+ students', tag: 'Impact' },
      { text: 'built interactive tools in Python, React & TypeScript', tag: 'Skill' },
      { text: 'taught weekly beginner coding lessons to 22 middle schoolers', tag: 'Leadership' },
      { text: 'won Best Impact Project among 35 hackathon teams', tag: 'Outcome' },
      { text: 'open-sourced 4 repositories with documentation on GitHub', tag: 'Metric' },
    ],
    descriptions: [
      'Developed & launched web/mobile apps used by 300+ students; taught weekly beginner Python & React workshops to 22 peers.',
      'Captained 4-person hackathon team; coded AI-assisted study tool in Python/TypeScript; won 1st Place Regional Design Award.',
    ],
  },
  {
    topicName: 'Tutoring & Teaching Kids',
    matchWords: ['tutor', 'tutored', 'tutoring', 'teach', 'taught', 'teaching', 'mentor', 'mentored', 'kids', 'elementary', 'middle school', 'rookies', 'younger', 'homework', 'worksheets', 'fractions', 'reading'],
    roles: ['Lead Peer Tutor & Curriculum Designer', 'Youth Mentorship Coordinator', 'After-School STEM & Literacy Coach'],
    orgs: ['Public Library Youth Tutoring Center', 'Peer-to-Peer Academic Support Club', 'Middle School Bridge Mentors'],
    verbs: ['Tutored', 'Mentored', 'Guided', 'Designed', 'Instructed', 'Encouraged'],
    addOns: [
      { text: 'tutored 18 elementary & middle school kids weekly', tag: 'Impact' },
      { text: 'created 30+ custom visual worksheets & study games', tag: 'Skill' },
      { text: 'helped students boost quiz scores by a full letter grade', tag: 'Outcome' },
      { text: 'logged 110+ one-on-one mentoring hours across 3 grades', tag: 'Metric' },
    ],
    descriptions: [
      'Tutored 18 elementary & middle school students weekly in math & reading; designed 30+ visual study games across 110+ hrs.',
      'Mentored 14 6th–8th grade students one-on-one; broke down complex concepts into hands-on demos; boosted test confidence.',
    ],
  },
  {
    topicName: 'Basketball (School & AAU / Club)',
    matchWords: ['basketball', 'hoops', 'aau', 'point guard', 'shooting guard', 'power forward', 'small forward', 'rebound', 'rebounds', 'free throw', 'three-pointer', 'dribble', 'dribbling', 'varsity basketball', 'jv basketball', 'layup'],
    suggestedCategory: 'Athletics: JV/Varsity',
    roles: [
      'Varsity / JV Basketball Player (Guard / Forward)',
      'Starting Point Guard / Shooting Guard',
      'AAU / Club Travel Basketball Player',
      'Middle School Basketball Team Player',
      'Team Player & Youth Camp Helper',
    ],
    orgs: [
      'High School JV / Varsity Basketball Team',
      'Middle School Basketball Team',
      'Regional AAU / Club Basketball Academy',
      'City Youth Basketball League',
    ],
    verbs: ['Competed', 'Practiced', 'Scored', 'Defended', 'Assisted', 'Hustled', 'Supported'],
    addOns: [
      { text: 'played in 22+ regular season & tournament games', tag: 'Metric' },
      { text: 'practiced 10 hrs/wk on shooting, defense & conditioning', tag: 'Skill' },
      { text: 'contributed key rebounds, steals & assists off the bench', tag: 'Impact' },
      { text: 'helped coach weekend dribbling clinics for younger kids', tag: 'Leadership' },
      { text: 'maintained 3.9+ GPA as a Scholar-Athlete during season', tag: 'Outcome' },
      { text: 'built team chemistry & encouraged teammates in tight games', tag: 'Leadership' },
    ],
    descriptions: [
      'Played Guard/Forward across 22 season games; practiced 10 hrs/wk on defense & shooting; helped squad reach District Playoffs.',
      'Dedicated team player on school & AAU basketball rosters; hustled on defense, supported teammates & helped at youth hoops camp.',
    ],
  },
  {
    topicName: 'Soccer, Volleyball & Team Sports',
    matchWords: ['soccer', 'volleyball', 'baseball', 'softball', 'football', 'lacrosse', 'hockey', 'badminton', 'tennis', 'cricket', 'midfielder', 'striker', 'goalie', 'varsity', 'jv', 'playoffs', 'teammate', 'athletics'],
    suggestedCategory: 'Athletics: JV/Varsity',
    roles: [
      'Varsity / JV Team Player & Starter',
      'Club Travel Team Player',
      'Starting Midfielder / Court Player',
      'Varsity Team Captain & Starter',
      'Team Member & Youth Clinic Helper',
    ],
    orgs: ['School Varsity & JV Athletics Team', 'Premier Regional Travel Sports Club'],
    verbs: ['Competed', 'Trained', 'Assisted', 'Defended', 'Conditioned', 'Supported'],
    addOns: [
      { text: 'competed in 20+ regular season & tournament games', tag: 'Metric' },
      { text: 'trained 8–10 hrs/wk on drills, conditioning & film study', tag: 'Skill' },
      { text: 'helped coach weekend youth clinics for 20 younger kids', tag: 'Impact' },
      { text: 'earned All-Conference Scholar-Athlete honors', tag: 'Outcome' },
    ],
    descriptions: [
      'Competed in 20+ season matches as active roster player; trained 10 hrs/wk in drills & conditioning; reached Regional Playoffs.',
      'Played 3 seasons on school & club teams; fostered strong sportsmanship, supported teammates & assisted at youth clinics.',
    ],
  },
  {
    topicName: 'Running, Track & Swimming',
    matchWords: ['run', 'running', 'runner', 'track', 'cross country', '5k', '1600m', '800m', 'relay', 'marathon', 'sprint', 'swim', 'swimming', 'swimmer', 'freestyle', 'butterfly', 'pool', 'lifeguard', 'pace', 'pacing'],
    suggestedCategory: 'Athletics: JV/Varsity',
    roles: ['Varsity Distance / Relay Captain', 'Year-Round Competitive Swimmer & Pacer', 'Lifeguard & Junior Swim Coach'],
    orgs: ['Varsity Track & Cross Country Team', 'Regional Aquatics Swim Club'],
    verbs: ['Paced', 'Anchored', 'Dropped', 'Trained', 'Qualified', 'Conditioned'],
    addOns: [
      { text: 'dropped personal best time by 90+ seconds over 3 seasons', tag: 'Metric' },
      { text: 'led summer 7 AM conditioning workouts for 28 teammates', tag: 'Leadership' },
      { text: 'anchored 4x400m / medley relay to Regional Finals', tag: 'Outcome' },
      { text: 'mentored incoming 6th–9th grade runners on pacing & grit', tag: 'Impact' },
    ],
    descriptions: [
      'Trained 10 hrs/wk year-round; dropped 5K/event PR by 95 seconds; led summer conditioning for 28 middle & high school peers.',
      'Competed in 18 varsity invitationals; anchored relay squad to Regional Finals; earned Scholar-Athlete distinction.',
    ],
  },
  {
    topicName: 'Strings, Piano, Band & Orchestra',
    matchWords: ['piano', 'violin', 'cello', 'viola', 'flute', 'clarinet', 'saxophone', 'trumpet', 'trombone', 'drum', 'percussion', 'guitar', 'orchestra', 'band', 'symphony', 'quartet', 'recital', 'concert', 'sonata', 'ensemble', 'accompany'],
    suggestedCategory: 'Music: Instrumental',
    roles: ['First Chair & Section Leader', 'Chamber Quartet Coordinator', 'Solo Pianist & Choir Accompanist'],
    orgs: ['School Symphony Orchestra & Wind Ensemble', 'Regional Youth Philharmonic', 'Community Music Conservatory'],
    verbs: ['Performed', 'Arranged', 'Accompanied', 'Conducted', 'Practiced', 'Auditioned'],
    addOns: [
      { text: 'led weekly sectionals for 14 orchestra/band peers', tag: 'Leadership' },
      { text: 'performed 12 seasonal concerts & senior-home recitals', tag: 'Impact' },
      { text: 'earned Superior (Level 1) rating at State Solo Festival', tag: 'Outcome' },
      { text: 'arranged film & classical scores for student quartet', tag: 'Skill' },
      { text: 'practiced 6+ hrs/wk consistently from 6th to 12th grade', tag: 'Metric' },
    ],
    descriptions: [
      'First chair musician; led 14-member section rehearsals; performed 12 annual concerts; selected for Regional Honor Orchestra.',
      'Performed solo & chamber repertoire across 5 grades; arranged quartet music for 6 senior living centers (50+ service hrs).',
    ],
  },
  {
    topicName: 'Chess & Strategy Games',
    matchWords: ['chess', 'board 1', 'elo', 'checkmate', 'blitz', 'tactics', 'endgame', 'opening', 'uscf'],
    suggestedCategory: 'Other Club/Activity',
    roles: ['Chess Club President & Tournament Director', 'Varsity Board 1 Player & Tactics Coach'],
    orgs: ['School Chess Club & Scholastic League', 'Community Youth Chess Academy'],
    verbs: ['Strategized', 'Directed', 'Coached', 'Competed', 'Analyzed', 'Organized'],
    addOns: [
      { text: 'directed 6 school-wide rated Swiss chess tournaments', tag: 'Leadership' },
      { text: 'taught opening & endgame tactics to 15 middle schoolers', tag: 'Impact' },
      { text: 'competed on Varsity Board 1 at Regional Championships', tag: 'Outcome' },
      { text: 'grew club attendance from 10 to 36 weekly players', tag: 'Metric' },
    ],
    descriptions: [
      'Organized weekly rated chess ladders for 35 students; taught opening & endgame tactics to 15 middle school beginners.',
      'Competed on Board 1 at Regional Scholastic Chess Championships; hosted charity blitz tournament raising $650.',
    ],
  },
  {
    topicName: 'Food Bank, Charity & Community Drives',
    matchWords: ['food', 'pantry', 'shelter', 'kitchen', 'meal', 'donate', 'donated', 'drive', 'fundraiser', 'raised', 'charity', 'hospital', 'blanket', 'kits', 'packs', 'groceries', 'homeless'],
    suggestedCategory: 'Community Service (Volunteer)',
    roles: ['Community Drive Founder & Organizer', 'Youth Volunteer Shift Lead', 'Mutual Aid Coordinator'],
    orgs: ['Community Food Bank & Pantry', 'Local Family Shelter & Mutual Aid', 'Red Cross / Hospital Youth Corps'],
    verbs: ['Mobilized', 'Distributed', 'Assembled', 'Raised', 'Coordinated', 'Packaged'],
    addOns: [
      { text: 'packed & distributed 3,200+ lbs of food for 140 families', tag: 'Metric' },
      { text: 'assembled 500+ hygiene & STEM kits with 16 volunteers', tag: 'Impact' },
      { text: 'raised $1,600 through seasonal student fundraisers', tag: 'Outcome' },
      { text: 'coordinated monthly weekend shifts across 120+ hours', tag: 'Leadership' },
    ],
    descriptions: [
      'Organized seasonal community drives collecting 3,000+ lbs of food/supplies for 140 families; led 16 student volunteers.',
      'Assembled & distributed 500+ care/STEM kits to local youth programs; logged 130+ weekend volunteer hours across 4 grades.',
    ],
  },
  {
    topicName: 'Debate, Model UN & Public Speaking',
    matchWords: ['debate', 'debated', 'speech', 'mun', 'model un', 'delegate', 'gavel', 'mock trial', 'attorney', 'witness', 'policy', 'oratory', 'extemp', 'nsda', 'resolution'],
    suggestedCategory: 'Debate/Speech',
    roles: ['Varsity Debate Captain', 'Model UN Head Delegate', 'Mock Trial Lead Attorney & Coach'],
    orgs: ['Speech & Debate Team (NSDA)', 'Model United Nations (MUN)', 'County Mock Trial Program'],
    verbs: ['Debated', 'Cross-examined', 'Authored', 'Advocated', 'Coached', 'Chaired'],
    addOns: [
      { text: 'authored 50+ pages of policy & case briefs', tag: 'Skill' },
      { text: 'coached 15 middle & freshman novices in speaking drills', tag: 'Leadership' },
      { text: 'won Best Delegate / Top Speaker at 4 regional invitationals', tag: 'Outcome' },
      { text: 'qualified for State Semifinals among 120+ competitors', tag: 'Outcome' },
    ],
    descriptions: [
      'Competed in 15 regional & state debate tournaments; coached 14 middle school novices weekly; earned NSDA Honor distinction.',
      'Served as Model UN Head Delegate; trained 25 peers in resolution drafting & public speaking; won 4 Best Delegate gavels.',
    ],
  },
  {
    topicName: 'Science Olympiad, Math & Lab Research',
    matchWords: ['science', 'olympiad', 'math', 'mathcounts', 'amc', 'aime', 'chemistry', 'biology', 'physics', 'lab', 'experiment', 'microplastics', 'water', 'data', 'research', 'bridge', 'forensics'],
    suggestedCategory: 'Science/Math',
    roles: ['Science Olympiad Captain', 'MathCounts / AMC Peer Coach', 'Student Lab Researcher'],
    orgs: ['Science Olympiad Varsity Team', 'Math Circle & AMC Club', 'Summer STEM Research Lab'],
    verbs: ['Experimented', 'Calculated', 'Modeled', 'Calibrated', 'Coached', 'Investigated'],
    addOns: [
      { text: 'earned 3 Regional Gold/Silver Medals across 4 lab events', tag: 'Outcome' },
      { text: 'coached 14 6th–8th grade MathCounts students weekly', tag: 'Leadership' },
      { text: 'analyzed 1,000+ experimental data points in Python', tag: 'Skill' },
      { text: 'qualified for AMC 10/12 Honor Roll & AIME', tag: 'Outcome' },
    ],
    descriptions: [
      'Captained 15-member Science Olympiad squad; built balsa structures & calibrated lab optics; won 3 Regional Medals.',
      'Coached 14 middle school MathCounts students weekly in geometry & combinatorics; qualified for AMC Honor Roll.',
    ],
  },
  {
    topicName: 'Art, Design, Murals & Photography',
    matchWords: ['art', 'paint', 'painted', 'painting', 'draw', 'drawing', 'sketch', 'mural', 'ceramics', 'pottery', 'sculpture', 'digital art', 'poster', 'graphic', 'photo', 'photography', 'film', 'video', 'gallery'],
    suggestedCategory: 'Art',
    roles: ['Lead Muralist & Portfolio Artist', 'Club Graphic Designer & Curator', 'Ceramics Studio Assistant'],
    orgs: ['National Art Honor Society & Studio', 'Community Youth Mural Project', 'Visual Arts & Media Guild'],
    verbs: ['Illustrated', 'Curated', 'Designed', 'Sculpted', 'Exhibited', 'Painted'],
    addOns: [
      { text: 'co-designed & painted a 24-ft school community mural', tag: 'Impact' },
      { text: 'exhibited 14 original works at Regional Youth Gallery', tag: 'Outcome' },
      { text: 'designed 30+ event posters & logos for student clubs', tag: 'Metric' },
      { text: 'taught after-school sketching & clay classes to 20 kids', tag: 'Leadership' },
    ],
    descriptions: [
      'Created 16 acrylic, ceramic & digital works; exhibited at City Youth Showcase; co-designed 24-ft school library mural.',
      'Designed branding & posters for 12 campus clubs; led weekly open-studio sketching workshops for 20 middle school artists.',
    ],
  },
  {
    topicName: 'Theater, Drama, Stage Tech & Dance',
    matchWords: ['theater', 'theatre', 'drama', 'actor', 'acting', 'musical', 'stage', 'lighting', 'sound', 'costume', 'set', 'prop', 'improv', 'dance', 'dancer', 'ballet', 'choreograph', 'hip-hop', 'rehearsal'],
    suggestedCategory: 'Theater/Drama',
    roles: ['Lead Stage Manager', 'Principal Actor & Dance Captain', 'Lighting & Sound Crew Lead'],
    orgs: ['School Drama Guild & Thespian Troupe', 'Academy of Dance & Musical Theater'],
    verbs: ['Stage-managed', 'Choreographed', 'Performed', 'Cued', 'Constructed', 'Directed'],
    addOns: [
      { text: 'called 180+ lighting & sound cues across 8 sold-out shows', tag: 'Skill' },
      { text: 'performed for 1,600+ total community audience members', tag: 'Metric' },
      { text: 'choreographed 3 ensemble numbers for spring musical', tag: 'Leadership' },
      { text: 'led weekly improv & stagecraft workshops for 18 rookies', tag: 'Impact' },
    ],
    descriptions: [
      'Stage-managed 4 productions; coordinated 35 cast/crew members & 180+ lighting/sound cues for 1,600+ audience attendees.',
      'Performed lead & ensemble roles in 6 musicals; choreographed 3 routines & taught beginner workshops for middle schoolers.',
    ],
  },
  {
    topicName: 'Journalism, Newspaper, Yearbook & Podcast',
    matchWords: ['newspaper', 'article', 'articles', 'wrote', 'write', 'writing', 'editor', 'journalism', 'yearbook', 'interview', 'interviewed', 'podcast', 'magazine', 'column', 'publish', 'published'],
    suggestedCategory: 'Journalism/Publication',
    roles: ['Editor-in-Chief', 'Feature Writer & Data Columnist', 'Yearbook Layout & Photo Editor'],
    orgs: ['The Student Chronicle Newspaper', 'School Yearbook & Podcast Studio', 'Literary & Arts Magazine'],
    verbs: ['Authored', 'Edited', 'Interviewed', 'Published', 'Produced', 'Designed'],
    addOns: [
      { text: 'published 16 investigative & feature articles (1,500+ readers)', tag: 'Metric' },
      { text: 'interviewed 30+ students, teachers & local civic leaders', tag: 'Skill' },
      { text: 'edited drafts & InDesign layouts for 8 print/web issues', tag: 'Leadership' },
    ],
    descriptions: [
      'Authored 16 feature articles on campus policy, STEM & sports; edited 8 junior writers’ drafts reaching 1,500+ readers.',
      'Produced 14-episode school podcast & edited 200-page yearbook layout; led 10 student photographers and reporters.',
    ],
  },
  {
    topicName: 'Environment, Garden & Sustainability',
    matchWords: ['garden', 'plant', 'planted', 'compost', 'composting', 'recycle', 'recycling', 'climate', 'eco', 'environment', 'solar', 'water', 'trail', 'trees', 'pollinator', 'waste'],
    suggestedCategory: 'Environmental',
    roles: ['Campus Sustainability Chair', 'Community Garden Founder', 'Eco-Action Team Lead'],
    orgs: ['Eco-Action & Sustainability Club', 'Campus Pollinator & Food Garden', 'Youth Conservation Corps'],
    verbs: ['Cultivated', 'Diverted', 'Restored', 'Planted', 'Campaigned', 'Tested'],
    addOns: [
      { text: 'diverted 1,600+ lbs of cafeteria waste via student composting', tag: 'Metric' },
      { text: 'harvested 200+ lbs of garden produce for local food bank', tag: 'Impact' },
      { text: 'planted 85 native pollinator species across campus', tag: 'Outcome' },
    ],
    descriptions: [
      'Launched cafeteria composting initiative diverting 1,600+ lbs of waste; led 20 student volunteers in weekly audits.',
      'Built 6 raised beds in campus garden; harvested 200+ lbs of fresh produce donated to neighborhood family pantry.',
    ],
  },
];

export const ACTIVITY_PRESETS: ActivityPresetSuggestion[] = [
  {
    id: 'preset_robotics_auto',
    label: 'Robotics — Coding & Sensors',
    keywords: ['robotics', 'vex', 'first', 'lego', 'fll', 'ftc', 'robot', 'autonomous', 'sensor', 'c++'],
    activityType: 'Robotics',
    position: 'Lead Autonomous Programmer & Mentor',
    organization: 'School VEX / FIRST Robotics Team',
    description: 'Programmed C++/Python vision autonomous routines; mentored 15 6th–8th grade rookies; qualified for State Finals 2x.',
    relatedAddOns: [
      'calibrated optical & inertial sensors for 95% auto accuracy',
      'designed 3D-printed intake claw in Onshape CAD',
      'hosted 6 hands-on robot demos at elementary schools',
      'won Regional Think / Engineering Design Award',
    ],
  },
  {
    id: 'preset_robotics_mech',
    label: 'Robotics — CAD & Mechanical Build',
    keywords: ['robotics', 'cad', '3d', 'build', 'mechanical', 'drivetrain', 'vex', 'ftc'],
    activityType: 'Robotics',
    position: 'Mechanical Build & CAD Captain',
    organization: 'VEX / FIRST Tech Challenge Robotics Squad',
    description: 'CAD-modeled custom drivetrain & intake in Onshape; 3D-printed 14 rapid prototypes; led 8-student build crew to Regionals.',
    relatedAddOns: [
      'reduced match scoring cycle time by 3.5 seconds',
      'trained 12 middle school rookies in gear ratios & safety',
      'documented 60-page engineering notebook for judges',
    ],
  },
  {
    id: 'preset_math_olympiad_captain',
    label: 'Math Olympiad — AMC / MathCounts Competitor & Captain',
    keywords: ['math', 'math olympiad', 'amc', 'aime', 'mathcounts', 'algebra', 'combinatorics', 'geometry', 'number theory', 'olympiad'],
    activityType: 'Science/Math',
    position: 'Math Olympiad Captain & AMC 10/12 Qualifier',
    organization: 'School Math Olympiad & Mu Alpha Theta Chapter',
    description: 'Captained 18-member Math Olympiad team; qualified for AMC 10/12 Honor Roll; wrote weekly number theory & geometry problem sets.',
    relatedAddOns: [
      'coached 15 middle school MathCounts students weekly',
      'placed Top 3 at Regional Mathematics League Finals',
      'led proof-writing workshops in combinatorics & algebra',
      'qualified for AIME / AMC Honor Roll distinction',
    ],
  },
  {
    id: 'preset_math_olympiad_mentor',
    label: 'Math Olympiad — Middle School MathCounts Coach',
    keywords: ['math', 'math olympiad', 'mathcounts', 'amc 8', 'circle', 'coaching', 'problem solving'],
    activityType: 'Science/Math',
    position: 'Varsity Mathlete & Peer MathCounts Coach',
    organization: 'District Math Circle & Competition Club',
    description: 'Competed in 10+ regional math meets; coached 16 6th–8th grade students in sprint & target rounds; helped team advance to State.',
    relatedAddOns: [
      'created 30+ custom competition practice handouts',
      'hosted monthly mock countdown-round scrimmages',
      'boosted rookie team average scores by 28%',
    ],
  },
  {
    id: 'preset_science_olympiad_captain',
    label: 'Science Olympiad — Team Captain & Lab Lead',
    keywords: ['science olympiad', 'scioly', 'science', 'olympiad', 'chemistry', 'physics', 'biology', 'anatomy', 'optics', 'forensics'],
    activityType: 'Science/Math',
    position: 'Science Olympiad Team Captain & Event Lead',
    organization: 'School Varsity Science Olympiad Team',
    description: 'Captained 15-member Science Olympiad squad across 23 events; won 3 Regional Gold/Silver medals in Lab & Engineering events.',
    relatedAddOns: [
      'built balsa wood bridges & calibrated laser optics rigs',
      'compiled 120-page shared study binders for 4 lab events',
      'mentored 12 Division B middle school Science Olympiad peers',
      'helped school squad qualify for State Tournament',
    ],
  },
  {
    id: 'preset_science_olympiad_builder',
    label: 'Science Olympiad — Engineering Build & Detector Specialist',
    keywords: ['science olympiad', 'scioly', 'build', 'bridge', 'flight', 'glider', 'scrambler', 'detector', 'engineering', 'science'],
    activityType: 'Science/Math',
    position: 'Lead Engineering Builder & Lab Competitor',
    organization: 'Science Olympiad Division B / C Team',
    description: 'Engineered & tested balsa structures, elastic gliders & sensor devices for Science Olympiad; earned 4 Invitational & Regional medals.',
    relatedAddOns: [
      'logged 40+ test flights & load-to-weight ratio trials',
      'co-authored lab protocols for Chemistry Lab & Forensics',
      'organized Saturday invitational build workshops for 18 peers',
    ],
  },
  {
    id: 'preset_basketball_player',
    label: 'Basketball — Varsity / JV Player (School or AAU)',
    keywords: ['basketball', 'hoops', 'aau', 'guard', 'forward', 'center', 'player', 'varsity', 'jv', 'athletics'],
    activityType: 'Athletics: JV/Varsity',
    position: 'Varsity / JV Point & Shooting Guard',
    organization: 'School Varsity Basketball & AAU Travel Team',
    description: 'Competed in 24+ season & tournament games; practiced 10 hrs/wk on shooting, defense & footwork; helped team reach Regional Playoffs.',
    relatedAddOns: [
      'contributed 12+ pts/assists per game & led perimeter defense',
      'coached weekend youth basketball skills clinic for 20 kids',
      'earned Academic All-District Scholar-Athlete honors',
      'led summer open-gym conditioning & film study for 16 players',
    ],
  },
  {
    id: 'preset_basketball_captain',
    label: 'Basketball — Team Captain & Youth Camp Coach',
    keywords: ['basketball', 'captain', 'hoops', 'coach', 'clinic', 'varsity', 'aau', 'athletics'],
    activityType: 'Athletics: JV/Varsity',
    position: 'Team Co-Captain & Youth Clinic Coach',
    organization: 'High School Basketball Program & Youth Hoops Camp',
    description: 'Elected team co-captain; led daily defensive drills & summer conditioning for 22 players; coached 30 6th–8th graders at summer camp.',
    relatedAddOns: [
      'organized pre-game film breakdowns with coaching staff',
      'mentored incoming freshmen on team playbook & study habits',
      'started all 22 regular season and district playoff games',
    ],
  },
  {
    id: 'preset_volunteer_foodbank',
    label: 'Volunteering — Community Food Bank & Mutual Aid',
    keywords: ['volunteer', 'volunteering', 'community service', 'food bank', 'pantry', 'shelter', 'charity', 'drives'],
    activityType: 'Community Service (Volunteer)',
    position: 'Youth Shift Coordinator & Lead Volunteer',
    organization: 'Regional Community Food Bank & Family Pantry',
    description: 'Coordinated weekend teen volunteer shifts; packed & distributed 4,200+ lbs of groceries serving 180+ local families across 140 hrs.',
    relatedAddOns: [
      'organized campus canned-food drive collecting 1,500+ items',
      'trained 16 new student volunteers on sorting & inventory',
      'earned President’s Volunteer Service Award (Gold)',
    ],
  },
  {
    id: 'preset_volunteer_stem_hospital',
    label: 'Volunteering — Hospital / Library & STEM Kit Outreach',
    keywords: ['volunteer', 'volunteering', 'community service', 'hospital', 'library', 'stem kits', 'senior center', 'outreach'],
    activityType: 'Community Service (Volunteer)',
    position: 'Founder & Youth Outreach Coordinator',
    organization: 'Community Library STEM Outreach & Junior Auxiliary',
    description: 'Assembled 250+ hands-on science & math kits for Title I elementary students; led 24 weekend workshops across 120+ volunteer hours.',
    relatedAddOns: [
      'recruited 14 high school volunteers to co-teach experiments',
      'assisted patients & visitors 4 hrs/wk at local hospital desk',
      'hosted digital literacy sessions for 35 senior citizens',
    ],
  },
  {
    id: 'preset_soccer_varsity',
    label: 'Soccer / Team Sports — Player & Starter',
    keywords: ['soccer', 'football', 'volleyball', 'striker', 'midfielder', 'varsity', 'sport'],
    activityType: 'Athletics: JV/Varsity',
    position: 'Varsity Starting Midfielder & Team Player',
    organization: 'School Varsity Soccer & Regional Travel Club',
    description: 'Competed in 20+ matches; trained daily in passing & conditioning drills with 24 teammates; volunteered at youth clinics.',
    relatedAddOns: [
      'earned All-District Scholar-Athlete distinction (4.0 GPA)',
      'led team in assists and helped squad reach Regional Playoffs',
      'welcomed & mentored incoming 9th-grade players',
    ],
  },
  {
    id: 'preset_track_xc',
    label: 'Track, Cross Country & Swimming',
    keywords: ['track', 'cross country', 'running', 'runner', 'swim', 'swimming', 'distance', '5k'],
    activityType: 'Athletics: JV/Varsity',
    position: 'Varsity Distance Runner & Pacing Captain',
    organization: 'School Cross Country & Track and Field Team',
    description: 'Competed in 1600m & 5K varsity meets; mentored 6th–8th grade runners in pacing drills; dropped personal PR by 95 seconds.',
    relatedAddOns: [
      'led 7 AM summer conditioning runs for 30+ teammates',
      'anchored 4x400m relay squad at District Championships',
      'trained 10 hrs/wk year-round across 4 grade levels',
    ],
  },
  {
    id: 'preset_music_strings',
    label: 'Orchestra, Band & Piano',
    keywords: ['piano', 'violin', 'cello', 'orchestra', 'band', 'flute', 'clarinet', 'music', 'quartet'],
    activityType: 'Music: Instrumental',
    position: 'First Chair Musician & Section Leader',
    organization: 'School Symphony Orchestra & Youth Philharmonic',
    description: 'Led 14-member instrument section rehearsals; performed 12 annual concerts; arranged quartet music for 6 senior centers.',
    relatedAddOns: [
      'earned Superior (Level 1) rating at State Solo Festival',
      'practiced 6 hrs/wk consistently from 6th to 12th grade',
      'mentored 8 middle school beginning string/band players',
    ],
  },
  {
    id: 'preset_volunteer_tutor',
    label: 'Peer Tutoring & Youth Mentoring',
    keywords: ['tutor', 'tutoring', 'volunteer', 'library', 'math', 'reading', 'kids', 'mentor'],
    activityType: 'Community Service (Volunteer)',
    position: 'Lead Peer Tutor & Workshop Creator',
    organization: 'Public Library Youth Literacy & Math Help Desk',
    description: 'Tutored 20+ elementary & middle school kids weekly in math and reading; created 35 visual study games across 120+ hrs.',
    relatedAddOns: [
      'helped students raise quiz scores by a full letter grade',
      'recruited & trained 12 teen volunteer tutors',
      'earned President’s Volunteer Service Gold Medal',
    ],
  },
  {
    id: 'preset_coding_app',
    label: 'Coding, AI & Hackathons',
    keywords: ['coding', 'computer', 'programming', 'hackathon', 'app', 'python', 'ai', 'web', 'react'],
    activityType: 'Computer/Technology',
    position: 'Founder & Lead App Developer',
    organization: 'Computer Science & Coding Club',
    description: 'Built & deployed 3 web apps in Python & TypeScript for 350+ students; taught weekly coding workshops to 24 middle schoolers.',
    relatedAddOns: [
      'won 1st Place Innovation Award at Regional Hackathon',
      'published 4 open-source study tools on GitHub',
      'mentored 15 beginners in debugging & algorithm logic',
    ],
  },
  {
    id: 'preset_debate_mun',
    label: 'Speech, Debate & Model UN',
    keywords: ['debate', 'speech', 'model un', 'mun', 'mock trial', 'gavel', 'public speaking'],
    activityType: 'Debate/Speech',
    position: 'Varsity Debate Captain & Novice Coach',
    organization: 'Speech & Debate Team / Model United Nations',
    description: 'Competed in 15 regional tournaments & authored 50+ pages of policy briefs; coached 14 middle school novices in speaking.',
    relatedAddOns: [
      'won Best Delegate gavel at 3 Model UN conferences',
      'advanced to State Semifinals in Public Forum Debate',
      'earned National Speech & Debate Honor Society distinction',
    ],
  },
  {
    id: 'preset_art_mural',
    label: 'Visual Art, Murals & Design',
    keywords: ['art', 'painting', 'drawing', 'design', 'ceramics', 'mural', 'digital', 'illustration'],
    activityType: 'Art',
    position: 'Lead Student Artist & Mural Co-Director',
    organization: 'National Art Honor Society & Visual Arts Guild',
    description: 'Created 18 acrylic & digital works; co-designed a 24-ft campus mural; taught weekend art classes for 25 elementary kids.',
    relatedAddOns: [
      'exhibited 12 pieces at Annual City Youth Art Showcase',
      'designed custom posters & logos for 10 school clubs',
      'curated school gallery night for 300+ visitors',
    ],
  },
  {
    id: 'preset_science_math',
    label: 'Science Olympiad & MathCounts',
    keywords: ['science', 'math', 'olympiad', 'amc', 'mathcounts', 'stem', 'lab', 'chemistry'],
    activityType: 'Science/Math',
    position: 'Team Captain & Lab Event Lead',
    organization: 'Science Olympiad & MathCounts / Math Circle',
    description: 'Captained 15-member Science Olympiad squad; built balsa bridges & calibrated optics; coached 14 middle school math peers.',
    relatedAddOns: [
      'earned 3 Regional Gold & Silver Medals across 4 events',
      'qualified for AMC 10/12 Honor Roll distinction',
      'designed weekly problem-solving packets in combinatorics',
    ],
  },
  {
    id: 'preset_theater_stage',
    label: 'Theater, Acting & Stage Crew',
    keywords: ['theater', 'drama', 'acting', 'musical', 'stage', 'lighting', 'crew'],
    activityType: 'Theater/Drama',
    position: 'Lead Stage Manager & Ensemble Actor',
    organization: 'School Drama Guild & Community Youth Theater',
    description: 'Stage-managed 4 productions; called 180+ lighting/sound cues & coordinated 35 cast/crew members for 1,600+ attendees.',
    relatedAddOns: [
      'led weekly after-school improv games for 20 middle schoolers',
      'constructed & painted modular stage sets across 6 shows',
      'rehearsed 10 hrs/wk during fall and spring show seasons',
    ],
  },
  {
    id: 'preset_student_gov',
    label: 'Student Council & Leadership',
    keywords: ['student council', 'asb', 'government', 'president', 'leadership', 'senate'],
    activityType: 'Student Govt./Politics',
    position: 'Elected Grade Representative & Event Chair',
    organization: 'Associated Student Body (ASB) Student Council',
    description: 'Represented 350 classmates in campus policy meetings; managed $2,800 budget; organized charity carnival raising $3,100.',
    relatedAddOns: [
      'surveyed 400+ students to expand library & study hours',
      'welcomed incoming 6th/9th grade students at orientation',
      'coordinated 12 school-wide spirit & service drives',
    ],
  },
  {
    id: 'preset_journalism',
    label: 'School Newspaper, Yearbook & Podcast',
    keywords: ['newspaper', 'journalism', 'yearbook', 'writing', 'editor', 'podcast', 'article'],
    activityType: 'Journalism/Publication',
    position: 'Section Editor & Feature Columnist',
    organization: 'The Student Chronicle & Yearbook Staff',
    description: 'Authored 16 investigative & student-life articles reaching 1,400 readers; edited layouts for 8 print and digital issues.',
    relatedAddOns: [
      'interviewed 30+ teachers, coaches & local community leads',
      'mentored 8 middle school & freshman staff writers',
      'produced 10-episode student life audio podcast',
    ],
  },
  {
    id: 'preset_env_garden',
    label: 'Environmental Club & Campus Garden',
    keywords: ['environment', 'garden', 'compost', 'climate', 'recycling', 'eco', 'sustainability'],
    activityType: 'Environmental',
    position: 'Co-Founder & Campus Garden Coordinator',
    organization: 'Eco-Action & School Sustainability Club',
    description: 'Launched cafeteria composting diverting 1,600+ lbs of waste; harvested 200+ lbs of garden produce for local food pantry.',
    relatedAddOns: [
      'planted 80+ native pollinator species with 18 volunteers',
      'tested local creek water quality monthly with digital sensors',
      'presented student waste-reduction audit to school board',
    ],
  },
  {
    id: 'preset_chess_club',
    label: 'Chess & Strategy Club',
    keywords: ['chess', 'board', 'strategy', 'tournament', 'club'],
    activityType: 'Other Club/Activity',
    position: 'Chess Club President & Tactics Coach',
    organization: 'School Chess & Strategy Club',
    description: 'Directed weekly rated chess ladders for 34 students; taught opening & endgame tactics to 15 middle school beginners.',
    relatedAddOns: [
      'competed on Varsity Board 1 at Regional Championships',
      'hosted charity blitz tournament raising $600 for library',
      'grew club membership from 10 to 34 active players',
    ],
  },
];

export interface PopularActivityTopicPill {
  id: string;
  label: string;
  query: string;
  category: string;
}

export const POPULAR_ACTIVITY_TOPICS: PopularActivityTopicPill[] = [
  {
    id: 'topic_math_olympiad',
    label: 'Math Olympiad & AMC',
    query: 'math olympiad',
    category: 'Science/Math',
  },
  {
    id: 'topic_science_olympiad',
    label: 'Science Olympiad',
    query: 'science olympiad',
    category: 'Science/Math',
  },
  {
    id: 'topic_basketball',
    label: 'Basketball (Varsity/JV/AAU)',
    query: 'basketball',
    category: 'Athletics: JV/Varsity',
  },
  {
    id: 'topic_volunteering',
    label: 'Volunteering & Service',
    query: 'volunteer',
    category: 'Community Service (Volunteer)',
  },
  {
    id: 'topic_robotics',
    label: 'Robotics (VEX / FIRST)',
    query: 'robotics',
    category: 'Robotics',
  },
  {
    id: 'topic_coding',
    label: 'Coding, AI & Hackathons',
    query: 'coding',
    category: 'Computer/Technology',
  },
  {
    id: 'topic_debate',
    label: 'Speech, Debate & Model UN',
    query: 'debate',
    category: 'Debate/Speech',
  },
  {
    id: 'topic_music',
    label: 'Music, Piano & Orchestra',
    query: 'music',
    category: 'Music: Instrumental',
  },
  {
    id: 'topic_soccer_track',
    label: 'Soccer, Track & Swimming',
    query: 'soccer track',
    category: 'Athletics: JV/Varsity',
  },
  {
    id: 'topic_chess',
    label: 'Chess & Strategy Club',
    query: 'chess',
    category: 'Other Club/Activity',
  },
  {
    id: 'topic_student_gov',
    label: 'Student Council & ASB',
    query: 'student council',
    category: 'Student Govt./Politics',
  },
];

function getProfileForCategory(category: string): CategoryDomainProfile {
  return CATEGORY_PROFILES[category] || CATEGORY_PROFILES['Other Club/Activity'];
}

function hasWholeWordMatch(text: string, word: string): boolean {
  if (!text || !word) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^a-z0-9])${escaped}(s|es)?([^a-z0-9]|$)`, 'i');
  return re.test(text);
}

function areCategoriesCompatible(
  selectedCategory: string,
  nodeCategory?: string
): boolean {
  if (!nodeCategory || !selectedCategory) return true;
  if (selectedCategory === 'Other Club/Activity') return true;
  if (selectedCategory === nodeCategory) return true;

  // Group closely related Common App categories
  const musicArts = ['Music: Instrumental', 'Music: Vocal', 'Art', 'Theater/Drama', 'Dance'];
  const athletics = ['Athletics: JV/Varsity', 'Athletics: Club'];
  const stem = ['Robotics', 'Computer/Technology', 'Science/Math', 'Research', 'Academic'];
  const service = ['Community Service (Volunteer)', 'Environmental', 'Social Justice', 'Cultural', 'Religious'];

  if (musicArts.includes(selectedCategory) && musicArts.includes(nodeCategory)) {
    // Keep Music distinct from Visual Art unless explicitly typed, but never allow Athletics to bleed into Music
    return selectedCategory.startsWith('Music') === nodeCategory.startsWith('Music');
  }
  if (athletics.includes(selectedCategory) && athletics.includes(nodeCategory)) {
    return true;
  }
  if (stem.includes(selectedCategory) && stem.includes(nodeCategory)) {
    return true;
  }
  if (service.includes(selectedCategory) && service.includes(nodeCategory)) {
    return true;
  }
  return false;
}

/**
 * Scores and finds matching TopicTriggerNodes prioritizing the user's chosen `category`,
 * `typedPosition`, `typedOrg`, and `quickSearch` so adding a phrase to `typedDescription`
 * never switches a Piano/Music entry to Basketball or another unrelated domain.
 */
function findRankedTopicNodes(
  typedDescription: string,
  typedPosition: string,
  typedOrg: string,
  category: string,
  quickSearch = ''
): TopicTriggerNode[] {
  const descLower = typedDescription.toLowerCase();
  const posLower = typedPosition.toLowerCase();
  const orgLower = typedOrg.toLowerCase();
  const searchLower = quickSearch.toLowerCase();

  const scored = TOPIC_KNOWLEDGE_GRAPH.map((node) => {
    let identityScore = 0; // Matches in quickSearch, position, organization, or selected category
    let descScore = 0; // Matches in description text

    for (const w of node.matchWords) {
      if (hasWholeWordMatch(searchLower, w)) identityScore += 10;
      if (hasWholeWordMatch(posLower, w)) identityScore += 8;
      if (hasWholeWordMatch(orgLower, w)) identityScore += 6;
      if (hasWholeWordMatch(descLower, w)) descScore += 4;
    }

    if (node.suggestedCategory === category) {
      identityScore += 12;
    }

    const compatible = areCategoriesCompatible(category, node.suggestedCategory);

    // If a node belongs to an incompatible category (e.g. Athletics while category is Music: Instrumental),
    // ignore description-only word overlaps so appended phrases never hijack the topic!
    if (!compatible && identityScore === 0) {
      return { node, score: 0 };
    }

    const totalScore = compatible
      ? identityScore + descScore
      : identityScore >= 10
        ? identityScore
        : 0;

    return { node, score: totalScore };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.node);
}

/**
 * Dynamically filters and synthesizes Starter Activity Templates based on:
 * - Quick Search input
 * - Chosen Category
 * - Typed Description, Role, and Organization!
 */
export function getFilteredPresets(
  queryText: string,
  category: string,
  typedDescription = '',
  typedPosition = '',
  typedOrg = ''
): ActivityPresetSuggestion[] {
  const combinedQuery = `${queryText} ${typedDescription} ${typedPosition} ${typedOrg}`
    .trim()
    .toLowerCase();
  const profile = getProfileForCategory(category);

  // Build category-native presets so every single one of the 29 categories has rich starter cards
  const categoryGeneratedPresets: ActivityPresetSuggestion[] = profile.templates.map(
    (tpl, idx) => ({
      id: `cat_${category}_${idx}`,
      label: `${category} — ${profile.roles[idx % profile.roles.length].split('&')[0].trim()}`,
      keywords: [category.toLowerCase()],
      activityType: category,
      position: profile.roles[idx % profile.roles.length],
      organization: profile.orgSuffixes[idx % profile.orgSuffixes.length],
      description: tpl,
      relatedAddOns: profile.addOns.map((a) => a.text),
    })
  );

  const allPool = [...ACTIVITY_PRESETS, ...categoryGeneratedPresets];

  // Score every preset against the chosen category AND what the user is typing in any field
  const tokens = combinedQuery
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length >= 3);

  const scored = allPool.map((preset) => {
    let score = 0;
    if (preset.activityType === category) score += 10;
    if (queryText.trim()) {
      const q = queryText.trim().toLowerCase();
      if (
        preset.label.toLowerCase().includes(q) ||
        preset.keywords.some((k) => k.includes(q) || q.includes(k)) ||
        preset.description.toLowerCase().includes(q) ||
        preset.position.toLowerCase().includes(q)
      ) {
        score += 25;
      }
    }
    for (const tok of tokens) {
      if (preset.keywords.some((k) => k.includes(tok))) score += 5;
      if (preset.description.toLowerCase().includes(tok)) score += 3;
      if (preset.position.toLowerCase().includes(tok)) score += 3;
    }
    return { preset, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const unique: ActivityPresetSuggestion[] = [];
  const seenDesc = new Set<string>();
  for (const item of scored) {
    if (!seenDesc.has(item.preset.description)) {
      seenDesc.add(item.preset.description);
      unique.push(item.preset);
    }
    if (unique.length >= 6) break;
  }

  // If the user typed a specific custom keyword in quickSearch that isn't in presets, synthesize one live at the top!
  const rawSearch = queryText.trim();
  if (rawSearch.length >= 3) {
    const capTopic = rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1);
    const hasExactMatch = unique.some(
      (u) =>
        u.label.toLowerCase().includes(rawSearch.toLowerCase()) ||
        u.position.toLowerCase().includes(rawSearch.toLowerCase())
    );
    if (!hasExactMatch) {
      unique.unshift({
        id: `custom_${rawSearch}`,
        label: `${capTopic} — Custom Starter`,
        keywords: [rawSearch.toLowerCase()],
        activityType: category,
        position: `${capTopic} Lead & Peer Mentor`.slice(0, 50),
        organization: `School & Community ${capTopic} Club`.slice(0, 100),
        description: `Organized weekly ${rawSearch} sessions for 18+ peers; mentored younger 6th–8th grade members & led seasonal showcases.`.slice(
          0,
          150
        ),
        relatedAddOns: profile.addOns.map((a) => a.text),
      });
    }
  }

  return unique.slice(0, 6);
}

export function getPositionAutoSuggestions(
  typed: string,
  category: string,
  descriptionText = '',
  organizationText = ''
): string[] {
  const profile = getProfileForCategory(category);
  const rankedNodes = findRankedTopicNodes(
    descriptionText,
    typed,
    organizationText,
    category
  );
  const nodeRoles = rankedNodes.flatMap((n) => n.roles);

  // Extract specific subject/noun from description if user typed one (e.g. "violin", "chess", "python", "soccer")
  const descWords = descriptionText
    .trim()
    .split(/[^a-zA-Z0-9+#-]+/)
    .filter((w) => w.length >= 4);
  const dynamicFromDesc: string[] = [];
  const interestingKeyword = descWords.find((w) =>
    [
      'violin',
      'piano',
      'cello',
      'flute',
      'guitar',
      'chess',
      'python',
      'robotics',
      'soccer',
      'tennis',
      'swim',
      'debate',
      'mural',
      'ceramics',
      'podcast',
      'garden',
      'compost',
      'math',
      'tutor',
    ].includes(w.toLowerCase())
  );
  if (interestingKeyword) {
    const capKw =
      interestingKeyword.charAt(0).toUpperCase() +
      interestingKeyword.slice(1).toLowerCase();
    dynamicFromDesc.push(`Lead ${capKw} Mentor & Coordinator`.slice(0, 50));
    dynamicFromDesc.push(`${capKw} Section / Team Lead`.slice(0, 50));
  }

  const basePool = Array.from(
    new Set([...dynamicFromDesc, ...nodeRoles, ...profile.roles])
  );
  const raw = typed.trim();
  const q = raw.toLowerCase();

  if (!q) return basePool.slice(0, 5);

  const filtered = basePool.filter(
    (r) => r.toLowerCase().includes(q) && r.toLowerCase() !== q
  );

  return Array.from(new Set([...filtered, ...basePool]))
    .filter((r) => r.toLowerCase() !== q)
    .slice(0, 5);
}

export function getOrganizationAutoSuggestions(
  typed: string,
  category: string,
  positionText = '',
  descriptionText = ''
): string[] {
  const profile = getProfileForCategory(category);
  const rankedNodes = findRankedTopicNodes(
    descriptionText,
    positionText,
    typed,
    category
  );
  const nodeOrgs = rankedNodes.flatMap((n) => n.orgs);
  const cleanSuffixes = profile.orgSuffixes.map((s) =>
    s.replace(/^(School|High School)\s+/i, '').trim()
  );
  const basePool = Array.from(
    new Set([...nodeOrgs, ...cleanSuffixes, ...profile.orgSuffixes])
  );

  const raw = typed.trim();
  const q = raw.toLowerCase();
  if (!q) return basePool.slice(0, 4);

  const directMatches = basePool.filter(
    (o) => o.toLowerCase().includes(q) && o.toLowerCase() !== q
  );

  return Array.from(new Set([...directMatches, ...basePool]))
    .filter((o) => o.toLowerCase() !== q)
    .slice(0, 4);
}

/**
 * Converts hardcoded numbers or unverified award claims in add-on phrases into
 * honest fill-in-the-blank templates ("[#]") so students fill in their real numbers.
 */
function toFillInTemplatePhrase(text: string): string {
  return text
    .replace(
      /\bearned Superior(?:\s*\(Level 1\))?\s+rating at State Solo(?: Fest| Festival)?\b/gi,
      'prepared solo repertoire for [Festival / Recital]'
    )
    .replace(
      /\bwon 1st Place at Regional (?:Youth Hackathon|Science & Eng Fair)\b/gi,
      'presented project at [Competition / Showcase]'
    )
    .replace(
      /\b(?:\$?\d[\d,.]*\+?(?:–\d[\d,.]*\+?)?)(?!\s*(?:st|nd|rd|th)\b)/g,
      '[#]'
    );
}

/**
 * Helper to smartly join two clauses so they NEVER exceed 150 chars or cut off mid-word.
 */
function smartJoinUnder150(primaryClause: string, secondaryClause: string, fallbackClause?: string): string {
  const cleanPrimary = primaryClause.trim().replace(/[;,.]+$/, '');
  const cleanSecondary = secondaryClause.trim().replace(/^[;,.]+\s*/, '');

  const combined = `${cleanPrimary}; ${cleanSecondary}`;
  if (combined.length <= 150) {
    return combined;
  }

  if (fallbackClause) {
    const cleanFallback = fallbackClause.trim().replace(/^[;,.]+\s*/, '');
    const withFallback = `${cleanPrimary}; ${cleanFallback}`;
    if (withFallback.length <= 150) {
      return withFallback;
    }
  }

  // Gracefully trim at word boundary before 150 chars without leaving dangling prepositions
  const maxAllowed = 148;
  if (combined.length > maxAllowed) {
    const sliced = combined.slice(0, maxAllowed);
    const lastSpace = sliced.lastIndexOf(' ');
    if (lastSpace > cleanPrimary.length + 5) {
      const cleanedCut = sliced
        .slice(0, lastSpace)
        .replace(
          /\s+(?:&|and|or|with|for|to|of|in|at|by|on|as|from|the|a|an|across|into|younger|fellow|local|weekly)\s*$/i,
          ''
        )
        .replace(/[,;:\-&/\s]+$/, '');
      return `${cleanedCut}.`;
    }
    return `${cleanPrimary.slice(0, 148).replace(/[,;:\-&/\s]+$/, '')}.`;
  }
  return combined;
}

export function getDynamicDescriptionSuggestions(
  typed: string,
  category: string,
  position: string,
  organization: string,
  quickSearch = ''
): DynamicDescriptionSuggestionsResult {
  const profile = getProfileForCategory(category);
  const rankedNodes = findRankedTopicNodes(
    typed,
    position,
    organization,
    category,
    quickSearch
  );

  const rawTyped = typed.trim();
  const typedLower = rawTyped.toLowerCase();
  const cleanPos = position.trim();
  const cleanOrg = organization.trim();

  // 1. Detected Topic Labels
  const detectedTopics = Array.from(
    new Set([
      category,
      ...rankedNodes.slice(0, 3).map((n) => n.topicName),
    ])
  );

  // 2. Build dynamic pool of bite-sized Related Add-On Phrases (`+ ...`) using [#] fill-in templates
  const rawAddOnPool: AddOnPhraseSuggestion[] = [
    ...rankedNodes.flatMap((n) => n.addOns),
    ...profile.addOns,
  ].map((item) => ({
    ...item,
    text: toFillInTemplatePhrase(item.text),
  }));

  // Synthesize live contextual add-on chips using fill-in templates ("[#]") instead of fabricated numbers
  const contextualAddOns: AddOnPhraseSuggestion[] = [];
  if (rawTyped.length >= 3) {
    if (/\b(taught|tutored|mentored|helped|coached|kids|students|rookies)\b/i.test(rawTyped)) {
      contextualAddOns.push(
        { text: 'across [#] weekly after-school sessions', tag: 'Metric' },
        { text: 'created [#] hands-on practice guides', tag: 'Skill' },
        { text: 'helped [#] peers build subject confidence', tag: 'Outcome' }
      );
    }
    if (/\b(built|designed|coded|programmed|engineered|created|made|developed|app|robot|website)\b/i.test(rawTyped)) {
      contextualAddOns.push(
        { text: 'tested [#] prototype iterations with teammates', tag: 'Skill' },
        { text: 'deployed for [#] student & community users', tag: 'Impact' },
        { text: 'documented testing metrics & engineering design', tag: 'Outcome' }
      );
    }
    if (/\b(played|performed|practiced|rehearsed|concert|music|violin|piano|cello|flute|band|orchestra|choir|sing|recital|lessons)\b/i.test(rawTyped)) {
      contextualAddOns.push(
        { text: 'performed at [#] recitals & seasonal concerts', tag: 'Impact' },
        { text: 'practiced [#] hrs/wk on repertoire & technique', tag: 'Skill' },
        { text: 'rehearsed weekly with [#] fellow musicians', tag: 'Leadership' },
        { text: 'prepared solo pieces for [Festival / Recital]', tag: 'Outcome' }
      );
    }
    if (
      category.startsWith('Athletics') &&
      /\b(won|competed|qualified|tournament|match|varsity|game|meet|race|ran|swam)\b/i.test(
        rawTyped
      )
    ) {
      contextualAddOns.push(
        { text: 'competed in [#] regular season & tournament games', tag: 'Metric' },
        { text: 'trained [#] hrs/wk on drills & conditioning', tag: 'Skill' },
        { text: 'supported [#] teammates in practice & film review', tag: 'Leadership' }
      );
    }
    if (/\b(raised|donated|collected|food|volunteer|volunteered|organized|hosted|club)\b/i.test(rawTyped)) {
      contextualAddOns.push(
        { text: 'collaborated with [#] student volunteers on weekends', tag: 'Leadership' },
        { text: 'served [#] local families in our community', tag: 'Impact' },
        { text: 'logged [#] verified service hours', tag: 'Metric' }
      );
    }
  }

  // Filter out any add-on whose key words are ALREADY in `typedLower` so suggestions never repeat existing clauses
  const seenAddOnText = new Set<string>();
  const relatedAddOns: AddOnPhraseSuggestion[] = [];

  for (const item of [...contextualAddOns, ...rawAddOnPool]) {
    const norm = item.text.toLowerCase();
    if (seenAddOnText.has(norm)) continue;

    // Check if the user already typed the core action/noun (e.g. "performed" + "recital")
    const hasRecitalOverlap =
      /\brecital/i.test(norm) && /\brecital/i.test(typedLower);
    if (hasRecitalOverlap && norm.startsWith('performed')) {
      // Offer a fill-in replacement or skip duplicate "performed at [#] recitals" when "recitals" is already typed
      const upgradeRecitalChip = 'performed [#] solo & ensemble pieces at [#] recitals';
      if (!seenAddOnText.has(upgradeRecitalChip) && !typedLower.includes('[#]')) {
        seenAddOnText.add(upgradeRecitalChip);
        relatedAddOns.push({
          text: upgradeRecitalChip,
          tag: 'Metric',
        });
      }
      continue;
    }

    const words = norm
      .replace(/\[#\]/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 5);
    const overlapCount = words.filter((w) => typedLower.includes(w)).length;
    if (words.length > 0 && overlapCount >= Math.ceil(words.length * 0.6)) {
      continue;
    }

    seenAddOnText.add(norm);
    relatedAddOns.push(item);
    if (relatedAddOns.length >= 6) break;
  }

  // 3. Build 4 Complete Polished <=150-Char Statements using fill-in templates
  const fullStatements: PolishedVariation[] = [];
  const topNode = rankedNodes[0];
  const activeAddOns =
    relatedAddOns.length >= 3
      ? relatedAddOns
      : profile.addOns.map((a) => ({
          ...a,
          text: toFillInTemplatePhrase(a.text),
        }));
  const activeVerbs = Array.from(
    new Set([...rankedNodes.flatMap((n) => n.verbs), ...profile.verbs])
  ).slice(0, 7);

  if (rawTyped.length >= 3) {
    const cleanedUserText = rawTyped
      .replace(/^(i\s+was\s+|i\s+am\s+|i\s+|we\s+|my\s+job\s+was\s+to\s+|in\s+this\s+activity\s+i\s+)/i, '')
      .replace(/\ba\s+few\b/gi, '[#]')
      .replace(/\bseveral\b/gi, '[#]')
      .replace(/[;,.]+$/, '')
      .trim();

    const capUserText =
      cleanedUserText.charAt(0).toUpperCase() + cleanedUserText.slice(1);
    const lowerUserText =
      cleanedUserText.charAt(0).toLowerCase() + cleanedUserText.slice(1);

    const leadAddOn =
      activeAddOns.find((a) => a.tag === 'Skill' || a.tag === 'Leadership')?.text ||
      activeAddOns[0]?.text ||
      'practiced [#] hrs/wk';
    const outcomeAddOn =
      activeAddOns.find((a) => a.tag === 'Outcome' || a.tag === 'Metric')?.text ||
      activeAddOns[1]?.text ||
      'participated in [#] seasonal events';
    const impactAddOn =
      activeAddOns.find((a) => a.tag === 'Impact')?.text ||
      activeAddOns[2]?.text ||
      'logged [#] total hours';

    fullStatements.push({
      angle: 'Your Words + Fill-In Metrics',
      text: smartJoinUnder150(
        capUserText,
        `${leadAddOn}; ${outcomeAddOn}`,
        leadAddOn
      ),
    });

    const chosenVerb = activeVerbs[0] || 'Practiced';
    const startsWithVerb = activeVerbs.some((v) =>
      capUserText.toLowerCase().startsWith(v.toLowerCase().slice(0, 5))
    );
    const verbUpgradedStart = startsWithVerb
      ? capUserText
      : `${chosenVerb} ${lowerUserText}`;

    fullStatements.push({
      angle: `${chosenVerb} Action + Measurable Scale`,
      text: smartJoinUnder150(
        verbUpgradedStart,
        `${impactAddOn}; ${outcomeAddOn}`,
        impactAddOn
      ),
    });

    if (cleanPos || cleanOrg) {
      const roleLabel = cleanPos || profile.roles[0];
      fullStatements.push({
        angle: 'Role + Your Accomplishment',
        text: smartJoinUnder150(
          `As ${roleLabel}, ${lowerUserText}`,
          leadAddOn,
          outcomeAddOn
        ),
      });
    } else if (topNode && topNode.descriptions[0]) {
      fullStatements.push({
        angle: `Related ${topNode.topicName} Template`,
        text: toFillInTemplatePhrase(topNode.descriptions[0]).slice(0, 150),
      });
    }
  }

  const templateCandidates: { angle: string; text: string }[] = [
    ...rankedNodes.flatMap((n) =>
      n.descriptions.map((d) => ({
        angle: `${n.topicName} Fill-In Template`,
        text: toFillInTemplatePhrase(d).slice(0, 150),
      }))
    ),
    ...profile.templates.map((t, idx) => ({
      angle: `${category} Template #${idx + 1}`,
      text: toFillInTemplatePhrase(t).slice(0, 150),
    })),
  ];

  const seenFull = new Set<string>(
    fullStatements.map((s) => s.text.toLowerCase())
  );
  for (const cand of templateCandidates) {
    if (
      !seenFull.has(cand.text.toLowerCase()) &&
      cand.text.toLowerCase() !== typedLower
    ) {
      seenFull.add(cand.text.toLowerCase());
      fullStatements.push(cand);
    }
    if (fullStatements.length >= 4) break;
  }

  return {
    detectedTopics,
    relatedAddOns,
    fullStatements: fullStatements.slice(0, 4),
    recommendedVerbs: activeVerbs,
  };
}
