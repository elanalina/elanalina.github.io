/*
 * The résumé "database" behind the SQL console in the hero.
 * Each table has a short description, column names and rows.
 * Edit freely: the console picks up changes automatically.
 */
window.RESUME_DB = {
  engineers: {
    description: 'Who I am, in one row',
    columns: ['handle', 'name', 'role', 'superpower', 'currently'],
    rows: [
      ['elanalina', 'Elanaliina Elanchezhiyan', 'Senior Data Engineer', 'making slow queries fast', 'Accenture'],
    ],
  },

  experience: {
    description: 'Roles, newest first',
    columns: ['title', 'company', 'start_date', 'end_date'],
    rows: [
      ['Data Engineering Senior Analyst', 'Accenture', '2025-05', 'present'],
      ['Data Analyst', 'Accenture', '2021-08', '2025-04'],
      ['Business Analyst Intern', 'Bridgei2i Analytics Solutions', '2021-02', '2021-08'],
    ],
  },

  projects: {
    description: 'Selected case studies (clients kept confidential)',
    columns: ['name', 'client', 'role', 'highlight'],
    rows: [
      ['Global Data Center Supply Chain Analytics', 'MAANG technology company', 'Analytics consultant', 'real-time KPI dashboards with an AI chatbot + AI insights'],
      ['Enterprise Analytics: Functional & QA', 'Global heavy-equipment manufacturer', 'Functional & QA consultant', 'defects resolved across 15 analytics screens'],
      ['Enterprise Data Integration & Migration', 'Fortune Global 100 PC & printing company', 'Data engineer', '100M+ records migrated, ETL 70% faster'],
    ],
  },

  skills: {
    description: 'Tools and techniques',
    columns: ['category', 'skill'],
    rows: [
      ['Languages', 'SQL'],
      ['Languages', 'Python'],
      ['Python', 'pandas'],
      ['Python', 'NumPy'],
      ['Python', 'SQLAlchemy'],
      ['Python', 'pyodbc'],
      ['Python', 'psycopg2'],
      ['Python', 'requests'],
      ['Databases', 'BigQuery'],
      ['Databases', 'PostgreSQL'],
      ['Databases', 'SQL Server'],
      ['Databases', 'MySQL'],
      ['Databases', 'Snowflake'],
      ['Databases', 'Oracle DB'],
      ['SQL', 'Window functions'],
      ['SQL', 'CTEs'],
      ['SQL', 'Indexing'],
      ['SQL', 'Query optimization'],
      ['SQL', 'Stored procedures'],
      ['SQL', 'Views & functions'],
      ['Pipelines', 'ETL workflows'],
      ['Pipelines', 'APIs'],
      ['Pipelines', 'Azure Data Factory'],
      ['Pipelines', 'Azure Data Lake Storage'],
      ['Pipelines', 'Web data extraction'],
      ['Visualization', 'Power BI'],
      ['Visualization', 'Tableau'],
      ['Generative AI', 'AI chatbots'],
      ['Generative AI', 'Prompt engineering'],
      ['Generative AI', 'Reusable prompt templates'],
      ['Generative AI', 'AI chart insights'],
      ['Quality', 'Data quality & integrity'],
      ['Quality', 'Data governance'],
      ['Quality', 'Selenium'],
      ['Quality', 'Robot Framework'],
      ['Quality', 'Azure DevOps'],
    ],
  },

  impact: {
    description: 'Results I am proud of',
    columns: ['metric', 'value', 'context'],
    rows: [
      ['ETL runtime reduction', '70%', '8.5 h -> 2 h via indexing, partitioning & tuning'],
      ['Records migrated', '100M+', 'SQL Server -> PostgreSQL, 100% integrity'],
      ['Pipeline data integrity', '99.9%', 'Azure Data Factory + Data Lake Storage'],
      ['Discrepancies resolved', '95%+', 'large-dataset validation'],
      ['Scripts optimized', '50+', 'reviewed for performance'],
      ['Power BI dashboards', '10+', 'built to client needs'],
      ['Analytics screens QA-ed', '15', 'defects fixed for release readiness'],
      ['Data sources integrated', '5+', 'Adobe, Google & Baidu Analytics, PostgreSQL, SQL Server, Excel'],
    ],
  },

  ai_features: {
    description: 'Generative AI I shipped inside dashboards',
    columns: ['feature', 'what_it_does', 'how'],
    rows: [
      ['AI chatbot', 'answers questions about the data and the dashboard', 'integrated into the dashboard'],
      ['AI chart insights', 'explains what each chart shows', 'one reusable prompt template across many charts'],
    ],
  },

  education: {
    description: 'Degrees',
    columns: ['degree', 'major', 'school', 'years'],
    rows: [
      ['MBA', 'Human Resource Management', 'Alagappa University', '2022-2024'],
      ['B.Tech', 'Computer Science & Engineering', 'SASTRA Deemed University', '2017-2021'],
    ],
  },

  contact: {
    description: 'Where to find me',
    columns: ['channel', 'link'],
    rows: [
      ['email', 'mailto:elanalinae@gmail.com'],
      ['linkedin', 'https://www.linkedin.com/in/ela-naliina-lakshmi/'],
      ['github', 'https://github.com/elanalina'],
    ],
  },
};

/* Friendly aliases, so `SELECT * FROM me;` just works. */
window.RESUME_DB_ALIASES = { me: 'engineers', whoami: 'engineers', jobs: 'experience', work: 'experience', skill: 'skills', ai: 'ai_features' };
