export const ko = {
  header: {
    analyzer: 'Spring Boot Analyzer',
    mvp: 'MVP',
  },
  title: 'Spring 레포지토리 분석',
  subtitle: 'Controller → Service → Repository 호출 흐름을 시각화합니다',
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
  app: {
    reset: '다시 분석하기',
  },
  lang: {
    select: '언어',
    ko: '한국어',
    en: 'English',
  },
}

export type Translations = typeof ko
