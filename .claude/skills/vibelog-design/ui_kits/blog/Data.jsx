import React from 'react';
export const PROJECTS = [
  { slug: 'vibelog', name: 'vibelog', status: 'building', description: '바이브 코딩 프로젝트 제작기를 자동으로 쓰는 블로그. 이 사이트 자체입니다.', stack: ['next.js', 'vercel'], commits: 23, lastActive: '오늘', day: 6 },
  { slug: 'job-board', name: 'job-board', status: 'live', description: '채용 공고 모아서 매일 아침 브리핑해주는 개인용 보드.', stack: ['python'], url: '#', commits: 4, lastActive: '3일 전', day: 41 },
  { slug: 'wallet-notes', name: 'wallet-notes', status: 'paused', description: '가계부 메모를 음성으로 남기면 정리해주는 실험.', stack: ['swift'], commits: 0, lastActive: '6주 전', day: 12 },
];
export const DEVLOGS = [
  { id: 'vibelog-2026-09-14', repo: 'vibelog', date: '2026-09-14', dow: 'SUN', title: 'GitHub 액션으로 데브로그 자동 생성', summary: 'topic이 vibelog인 레포를 밤 11시에 훑어서 하루치 글을 씁니다. 이 글이 첫 자동 생성 글입니다.', commits: 4, prs: 1, fails: 0, short: true,
    body: { did: 'scripts/collect.ts가 GitHub API로 topic vibelog 레포를 찾고, state.json 체크포인트 이후의 커밋·PR·devlog/*.md를 모읍니다. generate.ts가 그걸 Claude API에 넘겨 하루치 글을 존댓말로 쓰고 영어 번역을 붙입니다.', why: '프로젝트 레포에 훅이나 워크플로를 설치하고 싶지 않았습니다. 새 프로젝트 등록이 topic 하나 달기로 끝나야 손품이 안 늡니다.', fail: 'GH_PAT 없이 public API만 쓰다가 rate limit에 걸렸습니다. fine-grained PAT(Contents: read)로 해결.', next: '쇼츠 파이프라인. ElevenLabs 보이스 클론 등록부터.' },
    shas: [['e7b330', 'collect.ts: topic vibelog 레포 수집'], ['f12a9e', 'devlog.yml cron 23:00 KST'], ['0a1c77', 'generate.ts: KR 원본 + EN 번역'], ['b3d0e2', 'state.json 체크포인트']] },
  { id: 'vibelog-2026-09-13', repo: 'vibelog', date: '2026-09-13', dow: 'SAT', title: '블로그 뼈대 배포. 카드 + 타임라인까지', summary: 'Next.js 앱 라우터에 MDX 붙이고 Vercel에 올렸습니다. 프로젝트 카드는 레포 메타데이터로 자동 생성합니다.', commits: 7, prs: 0, fails: 1, short: false,
    body: { did: 'Next.js App Router + MDX 셋업, projects.json → 카드 그리드, devlog/*.md → 프로젝트 상세 타임라인. Vercel 배포.', why: '이 블로그가 첫 바이브 코딩 프로젝트여야 했습니다. 만드는 과정 자체가 첫 데브로그가 됩니다.', fail: 'AI가 쓴 첫 글이 밍밍했습니다. 커밋 메시지가 "fix layout"뿐이라 "왜"가 없었기 때문. CLAUDE.md에 규칙 하나를 넣었습니다 — 커밋 본문엔 꼭 이유 쓰기.', next: '수집·생성 파이프라인을 GitHub Action으로.' },
    shas: [['a41f2c', '프로젝트 카드 그리드 추가'], ['c09d81', '데브로그 타임라인 페이지'], ['5e77aa', '카드 높이 통일 — 왜: 설명 길이가 달라 그리드가 들쭉날쭉']] },
  { id: 'job-board-2026-09-11', repo: 'job-board', date: '2026-09-11', dow: 'THU', title: '아침 브리핑 발송 시각을 07:30으로', summary: '08:00은 출근 준비 중이라 못 봅니다. 30분 앞당겼습니다.', commits: 1, prs: 0, fails: 0, short: false,
    body: { did: '스케줄러 cron을 07:30 KST로 변경.', why: '08:00 알림은 매번 놓쳤습니다.', fail: '', next: '주말은 건너뛰기.' }, shas: [['3c9e10', 'cron 07:30 — 왜: 08:00은 출근 준비 중']] },
];
export const RUN = [{ cmd: true, text: 'gh workflow run devlog.yml' }, { text: 'collect  · 3 repos, 1 active' }, { text: 'generate · vibelog/2026-09-14.md (ko, en)' }, { text: 'commit   · "devlog: vibelog 2026-09-14"' }, { text: 'deploy   · vercel · 41s' }];
const MANY_NAMES = [['recipe-radar','live','냉장고 사진 찍으면 저녁 메뉴 추천.','python',2,'어제',18],['kanban-lite','building','칸반 보드 딱 한 화면. 로그인 없음.','next.js',11,'오늘',9],['subway-alarm','live','환승 두 정거장 전에 진동.','swift',0,'2주 전',30],['pdf-diet','paused','스캔 PDF 용량 1/10로.','python',0,'8주 전',5],['tone-check','building','슬랙 메시지 톤 미리 점검.','typescript',6,'오늘',3],['dotfiles-ui','idea','dotfiles를 웹에서 편집.','—',0,'—',1],['gym-log','live','운동 기록 음성 입력.','swift',3,'5일 전',44],['ko-en-lint','paused','한영 혼용 문서 린터.','typescript',0,'11주 전',7],['plant-cam','building','베란다 식물 타임랩스.','python',4,'2일 전',12],['expense-ocr','idea','영수증 OCR → 가계부.','—',0,'—',0]];
export const MANY_PROJECTS = [...PROJECTS, ...MANY_NAMES.map(([slug, status, description, stack, commits, lastActive, day]) => ({ slug, name: slug, status, description, stack: stack === '—' ? [] : [stack], commits, lastActive, day, url: status === 'live' ? '#' : undefined }))];
export const DOW = { SUN: '일', MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토' };
export const fmtShort = d => d.slice(5).replace('-', '.');
