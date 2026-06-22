#!/usr/bin/env node
/**
 * 이과 데모 fixture 생성 — raw TSV + 프로필 → planner-demo-fixture-sci.json
 * 일일 모달용 timeline_slots·mark 는 문과 데모와 동일 규칙(오전 영어·오후 수학 배치).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TSV = path.join(ROOT, 'demo/raw/science-may-todos.tsv');
const OUT = path.join(ROOT, 'demo/planner-demo-fixture-sci.json');

function slotRange(hour, subStart, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const sub = subStart + i;
    if (sub >= 6) break;
    out.push(`${hour}_${sub}`);
  }
  return out;
}

function slotsJson(arr) {
  return JSON.stringify(arr);
}

function parseTrace(raw) {
  const s = String(raw || '').trim();
  if (!s || s === '[]') return '[]';
  try {
    const o = JSON.parse(s);
    return JSON.stringify(Array.isArray(o) ? o : []);
  } catch {
    return '[]';
  }
}

function parseFixedSlots(raw) {
  const s = String(raw || '').trim();
  if (!s || s === '[]') return '[]';
  try {
    const o = JSON.parse(s);
    return JSON.stringify(Array.isArray(o) ? o : []);
  } catch {
    return '[]';
  }
}

function inferMark(row, idx) {
  if (row.category === 'event' || row.category === 'fixed') return 'none';
  if (row.mark && row.mark !== 'none') return row.mark;
  if (row.category === 'memo') return 'none';
  const h = row.task_id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return h % 5 === 0 || idx % 7 === 3 ? 'triangle' : 'circle';
}

function assignTimelineSlots(row) {
  const cat = row.category;
  const title = row.title;
  if (cat === 'fixed') return parseFixedSlots(row.timeline_slots);
  if (cat === 'event' || cat === 'memo') return '[]';
  if (cat === 'misc') {
    if (/솔루틴/.test(title)) return slotsJson(slotRange(7, 0, 3));
    if (/적분집중/.test(title)) return slotsJson(slotRange(20, 0, 4));
    return slotsJson(slotRange(8, 0, 2));
  }
  if (cat === 'read') return slotsJson(slotRange(9, 0, 9));
  if (cat === 'grammar') return slotsJson(slotRange(13, 0, 9));
  if (cat === 'math') return slotsJson(slotRange(16, 0, 12));
  return '[]';
}

function courseIdForLecture(lectureId, category, title) {
  const lid = Number(lectureId);
  if (!isFinite(lid)) return null;
  if (category === 'misc') {
    if (/솔루틴/.test(title)) return 9;
    if (/적분집중/.test(title)) return 10;
    return 11;
  }
  if (category === 'grammar') return 17;
  if (category === 'read') {
    if (/로직트리|CHAPTER 0[12]/.test(title)) return 56;
    return 55;
  }
  if (category === 'math') {
    if (/weekly|OT/.test(title)) return 20;
    return 21;
  }
  return 12;
}

function lectureNoFromTitle(title) {
  const m = String(title).match(/\[(\d+)강\]/);
  if (m) return Number(m[1]);
  const d = String(title).match(/DAY(\d+)/i);
  if (d) return Number(d[1]);
  const no = String(title).match(/No\.(\d+)/);
  if (no) return Number(no[1]);
  return 1;
}

const lines = fs.readFileSync(TSV, 'utf8').trim().split('\n');
const header = lines[0].split('\t');
const rows = lines.slice(1).map((line) => {
  const parts = line.split('\t');
  /** @type {Record<string, string>} */
  const o = {};
  header.forEach((h, i) => {
    o[h] = parts[i] != null ? parts[i] : '';
  });
  return o;
});

/** 일일 모달 학생 메모 — 문과 데모와 같은 날짜·톤, 내용은 이과 TSV 일정만 반영 */
const memos = [
  {
    task_id: '__sp_memo_2026-05-01',
    title:
      '4월 월말고사 날이라 집중이 잘 안 됐어요. 솔루틴·적분 DAY10은 했는데 문법은 반만 한 느낌 △. 시험 끝나고 내일부터 다시 루틴 맞출게요.',
    date: '2026-05-01',
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: '2026-06-22',
    updated_date: '2026-06-22'
  },
  {
    task_id: '__sp_memo_2026-05-04',
    title:
      '5월 첫 제대로 된 루틴 날. 학교 끝나고 문법 13·14강(동명사·부정사)이랑 단문 CH08까지 했어요. 저녁 적분 DAY11도 끝냈습니다.',
    date: '2026-05-04',
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: '2026-06-22',
    updated_date: '2026-06-22'
  },
  {
    task_id: '__sp_memo_2026-05-06',
    title:
      '월말고사 성적 확인했어요. 수학은 괜찮았는데 영어 문법이 조금 밀렸어요. 학교 끝나고 적분 DAY13은 했고, 내일 문법 2강 채울게요.',
    date: '2026-05-06',
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: '2026-06-22',
    updated_date: '2026-06-22'
  },
  {
    task_id: '__sp_memo_2026-05-10',
    title:
      '일요일이라 영어는 쉬고 선대 28~29강만 마무리했어요. 다음 주부터 학교·영어·수학 다시 병행해야 해서 오늘은 수학 정리만 했습니다.',
    date: '2026-05-10',
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: '2026-06-22',
    updated_date: '2026-06-22'
  },
  {
    task_id: '__sp_memo_2026-05-12',
    title:
      '학교 수업이 길어서 솔루틴이랑 적분 DAY17만 했어요. 문법·독해는 밀렸는데 △, 목요일에 비교 파트부터 다시 채울 예정이에요.',
    date: '2026-05-12',
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: '2026-06-22',
    updated_date: '2026-06-22'
  },
  {
    task_id: '__sp_memo_2026-05-14',
    title:
      '문법 비교①②랑 단문 부연 ①② 봤어요. 학교 끝나고 시간이 빠듯했는데 적분 DAY19까지는 끝냈습니다. 솔루틴 No.09도 유지했어요.',
    date: '2026-05-14',
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: '2026-06-22',
    updated_date: '2026-06-22'
  },
  {
    task_id: '__sp_memo_2026-05-16',
    title:
      '김영 상위권 모의고사 치르고 왔어요. 오전 문법·독해, 오후 적분 weekly 6회까지 했는데 체력이 빠졌네요. 일요일엔 선대만 가볍게.',
    date: '2026-05-16',
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: '2026-06-22',
    updated_date: '2026-06-22'
  },
  {
    task_id: '__sp_memo_2026-05-21',
    title:
      '이번 주 밀렸던 문법·독해 정리하는 날. 관사·대명사 2강이랑 단문독해 전체 복습, 적분 DAY24까지 채웠어요. 내일도 이어갈게요.',
    date: '2026-05-21',
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: '2026-06-22',
    updated_date: '2026-06-22'
  },
  {
    task_id: '__sp_memo_2026-05-25',
    title:
      '문법 전체 테스트·학습 현황 보고 날. 201·301 N회독 속도가 걱정돼서 OT부터 다시 맞춰봤어요. 로직트리 1~2강은 짧게만 봤습니다 △.',
    date: '2026-05-25',
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: '2026-06-22',
    updated_date: '2026-06-22'
  },
  {
    task_id: '__sp_memo_2026-05-29',
    title:
      '5월 월말고사 시작. 시험 기간이라 영어는 솔루틴만 하고 수학은 적분 DAY30 위주로 했어요 △. 고사 끝나면 로직트리 진도 다시 올릴게요.',
    date: '2026-05-29',
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: '2026-06-22',
    updated_date: '2026-06-22'
  },
  {
    task_id: '__sp_memo_2026-05-30',
    title:
      '월말고사 다음 날. 독해 4강 몰아서 들었고 적분 weekly 8회까지 했어요. 5월 마지막 주라 주차 캡처 인증도 올려뒀습니다.',
    date: '2026-05-30',
    category: 'memo',
    lecture_id: '',
    timeline_slots: '[]',
    sort_key: -800,
    mark: 'none',
    trace_dates: '[]',
    created_date: '2026-06-22',
    updated_date: '2026-06-22'
  }
];

/** @type {object[]} */
const personal = memos.slice();
rows.forEach((r, idx) => {
  personal.push({
    task_id: r.task_id,
    title: r.title,
    date: r.date,
    category: r.category,
    lecture_id: r.lecture_id || '',
    timeline_slots: assignTimelineSlots(r),
    sort_key: Number(r.sort_key) || 0,
    mark: inferMark(r, idx),
    trace_dates: parseTrace(r.trace_dates),
    created_date: r.created_date || '2026-06-22',
    updated_date: r.updated_date || '2026-06-22'
  });
});

personal.sort((a, b) => {
  const d = String(a.date).localeCompare(String(b.date));
  if (d !== 0) return d;
  return (Number(a.sort_key) || 0) - (Number(b.sort_key) || 0);
});

/** @type {Map<number, object>} */
const lectureMap = new Map();
personal.forEach((row) => {
  const lid = String(row.lecture_id || '').trim();
  if (!lid.length) return;
  const n = Number(lid);
  if (!isFinite(n)) return;
  const cid = courseIdForLecture(n, row.category, row.title);
  lectureMap.set(n, {
    lecture_id: n,
    course_id: cid,
    lecture_no: lectureNoFromTitle(row.title),
    lecture_name: row.title,
    duration: row.category === 'math' ? 75 : row.category === 'grammar' ? 70 : 60
  });
});

const courses = [
  {
    course_id: 9,
    subject: 'misc',
    course_name: '5월 솔루틴 매일학습지',
    link_url: 'https://www.solpath.co.kr/daily_worksheets',
    instructor: '솔루션편입'
  },
  {
    course_id: 10,
    subject: 'misc',
    course_name: '적분집중연습',
    link_url: '',
    instructor: '솔루션편입'
  },
  {
    course_id: 17,
    subject: 'grammar',
    course_name: '정병권 문법 201+301',
    link_url: 'https://www.solpath.co.kr/shop_view/?idx=89',
    instructor: '정병권'
  },
  {
    course_id: 55,
    subject: 'read',
    course_name: '단문독해',
    link_url: '',
    instructor: '솔루션편입'
  },
  {
    course_id: 56,
    subject: 'read',
    course_name: '로직트리 독해',
    link_url: '',
    instructor: '솔루션편입'
  },
  {
    course_id: 20,
    subject: 'math',
    course_name: '미분·적분 Weekly',
    link_url: '',
    instructor: '솔루션편입'
  },
  {
    course_id: 21,
    subject: 'math',
    course_name: '선형대수학',
    link_url: '',
    instructor: '솔루션편입'
  }
];

const fixture = {
  role: 'member',
  common: [],
  personal,
  student_profile: {
    display_name: '솔루션(이과)',
    track: '자연',
    admission_type: '학사',
    prev_university: '명지대학교',
    prev_major_gpa: '수학 · 평점 3.01 / 4.5',
    goal_university: '성균관대·한양대·중앙대·경희대·외대·시립대',
    goal_department: '컴퓨터공학과',
    study_status:
      '【상반기】\n어휘　　　　: 일 150개 암기(1월) / 101+301 암기(2월) / 101 appendix page별 복습, 201+301 진행(3월)\n문법　　　　: 기초이론 완성, 101 이론(1월) / 101 암기(2월) / 201+301 각 24강 진행(3월) / 201+301 N회독, 202+302 진행(4월)\n논리　　　　: 연계 101(2월) / 연계 201(3월) / 단독 진도에 맞춰 복습(4월) / 301 및 201 이어서 진행(5월)\n단문독해　　: 단문독해 시작(1월) / 단독 완성(2월) / 논리 201 완강 후 시작 예정(3월) / 301 진행(5월)\n장문독해　　: 장독 시작 및 완성(2월) / 단독 완강 후 시작 예정(4월) / 201 진행(5월)\n수학　　　　: 기초수학 8강, 미분학 24강 중 22강 완성(1월) / 적분학 22강 완성(2월) / 선형대수학 토·일 촬영 진행(3/8~4/26) / 미분 Level Up, 미분 Weekly 진행(4월) / 적분 Level Up, 적분 Weekly 진행(5월)\n학습루틴　　: 화·목·토 수업 수강, 월·수·금 전일 내용 복습\n특이사항　　: 1학기 기준 월별 목표에 맞춰 어휘·문법·논리·독해·수학을 병행하며, 3월 이후부터는 심화 진도와 복습 회독을 함께 진행함.',
    plan_features:
      '⏹️ 학습 목표\n1. 문법 : 정병권 선생님 커리큘럼을 초반부터 탄 친구들은 중후반부에 이론 빵꾸나서, 문법 점수가 안나오는 경우가 많았음. (→ 해결 : 초기에 빠른 이론정리 및 암기 후 수업 들어도 늦지 않음)\n2. 개괄적인 학습 배치 : 오전(영어), 단어시험 + 매일학습 / 오후(수학), DT → (01.11.일 수정) 1월 한 달간 9AM-6PM 영어 / 저녁 이후 수학\n3. 밥 먹는 시간, 이동 시간 등 짬나는 시간 활용하여 단어암기 + 수학 공식 암기 / 하루 2시간은 무조건 어휘 암기\n4. 중간고사/기말고사 기간 제외 얼마나 할 것인지\n\n1. 수강기간 : 26.05.01(월) ~ 05.31(일) (1개월)\n2. 월말고사 : 4/29(금) ~ 5/1(일)\n3. 5월부터 일일학습 인증 방법이 다소 수정됩니다.\n어휘 일정표를 캡쳐해서, 인증날짜에 맞는 범위 학습 여부 체크해서 올리는 것처럼 하시면 되는데요!\n해당 주차 일정을 캡쳐한 후, 학습여부 체크(동그라미 또는 형광펜 등)하여 업로드하시면 됩니다 😃\n4. 5월중 대면상담 1회 예정 - 필수는 아니니, 원치 않을 경우 말씀해주세요! (그간 학습한 내용 구두 TEST + 모의고사 오답한 내용 점검으로 실력 파악 예정)',
    subject_guides_json: {
      '[어휘]':
        '1. 기존에 외우던 101~301을 그대로 진행합니다. 이것만 해서는 사실 너무 부족합니다 ㅠ 이과라 할지라도 이 단어들은 기본 베이스로 하고, 더 많은 어휘를 외워줘야 영어점수가 탄탄하게 나옵니다.\n2. 본격적으로 기출문제를 풀게되면 나올 대학별 어휘정리, 별도로 어휘를 더 외워야 상위권 합격할 수 있습니다. 꼭 기억하세요. 상위권 친구들은 수학뿐만 아니라, 영어도 잘합니다.',
      '[문법]':
        '1. 201+301은 N회독 시리즈가 있어서, 일단 1회독 얼른 돌리고, N회독 진도 나가면서 복습하는 걸로 해야합니다.\n2. 강의 제목에 파트가 적혀있으므로, 해당파트 문제를 풀 때는 101 시리즈에서 배웠던 이론들을 다시한 번 복습해주세요!\n3. 수학 학습시간이 늘어난 관계로, 영어 진도가 많이 밀렸지만, 더 늘릴 수도 없습니다ㅠ 이 속도대로라면 6월까지 201+301 N회독이 아슬아슬하게 끝날 예정입니다. (문과는 202+302까지 끝남)',
      '[논리/단독/장독]':
        '1. 화요일 학교수업 끝나고, 학교수업을 복습하거나, 또는 시험기간 이전까지 공부했던 영어범위를 복습하는 시간을 가지시길 바랍니다.\n2. 101, 201 시리즈가 탄탄해야 앞으로가 편합니다. 특히, 단문독해 진도나가면서 논리파트도 함께 복습해주는 원칙만 잘 지켜주신다면, 문제 없을 겁니다.\n3. 장문독해부터는 진도를 조금 따라잡아야 해서, 4강씩 수강하도록 진도 짰습니다. 이 부분은 하실 수 있는지 여부를 피드백 주세요! 만약 시간이 안 난다면 조금 진도가 늦어지더라도 2강씩으로 수정하겠습니다.',
      '[수학]':
        '1. 선대는 그간 많이 학습하셔서, 정규진도는 문제 없을 것 같습니다 : )\n2. 미분 WEEKLY TEST도 그간 하고 있었는지 확인 부탁드립니다.\n- 5월 적분 WEEKLY TEST는 매주 토요일에 배치하였습니다. (NEW)'
    },
    monthly_plan_notices_json: {
      '2026-05':
        '🔶 5월 학습계획표 주요 안내\n1. 영어+수학 병행 : 오전 영어(어휘·문법·독해), 오후·저녁 수학(선대·Weekly·적분집중) 비율을 유지합니다.\n2. 문법 201+301 N회독을 6월까지 마무리하는 것이 목표입니다. 수학 시간이 늘어난 만큼 영어 진도는 밀릴 수 있으니, 주차별 캡처 인증으로 빠진 범위를 꼭 확인해 주세요.\n3. 5월부터 일일학습 인증은 「해당 주차 일정 캡처 + 학습 여부 체크」 방식입니다. 솔루틴·적분 DAY·강의 회차가 맞는지 함께 올려 주세요.\n4. 적분 WEEKLY TEST는 매주 토요일입니다. 김영 모의고사(5/16·5/23)와 솔루션 5월 월말고사(5/29) 일정을 달력에서 확인하세요.\n5. 5월 중 대면상담 1회 예정(선택) — 구두 TEST·모의고사 오답 점검으로 실력 파악합니다. 원치 않으시면 말씀해 주세요.'
    },
    phone_display: '000-0000-0001'
  },
  curriculum: {
    courses,
    lectures: Array.from(lectureMap.values()).sort((a, b) => a.lecture_id - b.lecture_id)
  }
};

fs.writeFileSync(OUT, JSON.stringify(fixture, null, 2) + '\n', 'utf8');
console.log('Wrote', OUT, '— personal:', personal.length, 'lectures:', lectureMap.size);
