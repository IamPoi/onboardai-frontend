import type { Translations } from './ko'

export const en: Translations = {
  header: {
    analyzer: 'Spring Boot Analyzer',
    mvp: 'MVP',
  },
  title: 'Spring Repository Analyzer',
  subtitle: 'Visualize the Controller → Service → Repository call flow',
  form: {
    placeholder: 'https://github.com/spring-projects/spring-petclinic',
    submit: 'Analyze',
    analyzing: 'Analyzing...',
    errors: {
      emptyUrl: 'Please enter a URL',
      invalidUrl: 'Only github.com or gitlab.com URLs are supported',
    },
  },
  status: {
    pending: 'Waiting for analysis...',
    running: 'Parsing AST...',
    complete: 'Analysis complete',
    failed: 'Analysis failed',
    statsClasses: (n: number) => `${n} classes`,
    statsEdges: (n: number) => `${n} calls`,
  },
  errors: {
    INVALID_URL: 'Only GitHub or GitLab HTTPS URLs are supported.',
    CLONE_FAILED: 'Failed to fetch the repository. Please check the URL.',
    CLONE_TIMEOUT: 'Repository download timed out.',
    REPO_TOO_LARGE: 'Repository size exceeds 30MB.',
    TOO_MANY_FILES: 'Too many Java files (max 300).',
    PARSE_FAILED: 'An error occurred while analyzing the code.',
    SERVER_CAPACITY: 'Server is busy. Please try again later.',
    JOB_NOT_FOUND: 'Job not found.',
    unknown: 'Unknown error',
  },
  graph: {
    filterLabel: 'Feature filter',
    filterAll: 'All',
    nodeCount: (n: number) => `${n} nodes`,
    edgeCount: (n: number) => `${n} connections`,
    moreItems: (n: number) => `+${n} more`,
  },
  legend: {
    controller: 'Controller',
    service: 'Service',
    repository: 'Repository',
  },
  app: {
    reset: 'Analyze again',
  },
  lang: {
    select: 'Language',
    ko: '한국어',
    en: 'English',
  },
}
