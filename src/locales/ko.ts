export const ko = {
  header: {
    mvp: 'MVP',
  },
  title: 'CodeLens',
  subtitle: '코드 구조를 분석해 레이어 간 호출 흐름을 시각화합니다',
  form: {
    placeholder: 'https://github.com/spring-projects/spring-petclinic',
    submit: '분석하기',
    analyzing: '분석 중...',
    errors: {
      emptyUrl: 'URL을 입력해주세요',
      invalidUrl: 'github.com 또는 gitlab.com URL만 지원합니다',
    },
  },
  status: {
    pending: '분석 대기 중...',
    running: 'AST 파싱 중...',
    complete: '분석 완료',
    failed: '분석 실패',
    statsClasses: (n: number) => `${n}개 클래스`,
    statsEdges: (n: number) => `${n}개 호출`,
  },
  errors: {
    INVALID_URL: 'GitHub 또는 GitLab HTTPS URL만 지원합니다.',
    CLONE_FAILED: '저장소를 가져오지 못했습니다. URL을 확인해주세요.',
    CLONE_TIMEOUT: '저장소 다운로드 시간이 초과됐습니다.',
    REPO_TOO_LARGE: '저장소 크기가 30MB를 초과합니다.',
    TOO_MANY_FILES: 'Java 파일이 너무 많습니다 (최대 300개).',
    PARSE_FAILED: '코드 분석 중 오류가 발생했습니다.',
    SERVER_CAPACITY: '서버가 바쁩니다. 잠시 후 다시 시도해주세요.',
    JOB_NOT_FOUND: '작업을 찾을 수 없습니다.',
    unknown: '알 수 없는 오류',
  },
  graph: {
    filterLabel: '기능 필터',
    filterAll: '전체',
    nodeCount: (n: number) => `${n}개 노드`,
    edgeCount: (n: number) => `${n}개 연결`,
    moreItems: (n: number) => `+${n}개 더`,
  },
  legend: {
    controller: 'Controller',
    service: 'Service',
    repository: 'Repository',
  },
  frameworks: {
    spring: 'Spring Boot',
    nestjs: 'NestJS',
    django: 'Django',
    fastapi: 'FastAPI',
    detected: '감지된 프레임워크',
  },
  layerNames: {
    spring: { controller: 'Controller', service: 'Service', repository: 'Repository' },
    nestjs: { controller: 'Controller', service: 'Service', repository: 'Repository' },
    django: { controller: 'View', service: 'Service', repository: 'Model' },
    fastapi: { controller: 'Router', service: 'Service', repository: 'Model' },
  } as Record<string, { controller: string; service: string; repository: string }>,
  app: {
    reset: '다시 분석하기',
  },
  lang: {
    select: '언어',
    ko: '한국어',
    en: 'English',
  },
  auth: {
    login: '로그인',
    register: '회원가입',
    logout: '로그아웃',
    email: '이메일',
    password: '비밀번호',
    emailPlaceholder: '이메일을 입력하세요',
    passwordPlaceholder: '비밀번호 (8자 이상)',
    loggingIn: '로그인 중...',
    registering: '가입 중...',
    errors: {
      emailRequired: '이메일을 입력해주세요',
      passwordRequired: '비밀번호를 입력해주세요',
      passwordTooShort: '비밀번호는 8자 이상이어야 합니다',
      duplicateEmail: '이미 사용 중인 이메일입니다',
      invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다',
      unknown: '오류가 발생했습니다. 다시 시도해주세요',
    },
  },
}

export type Translations = typeof ko
