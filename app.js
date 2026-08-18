/**
 * ==========================================================================
 * 12학년 2학기 학생별 시간표 조회 웹 애플리케이션 (app.js)
 * - 모바일: 요일별 카드 타임라인 뷰 지원
 * - 데스크톱: 주간 전체 표 뷰 지원
 * - 뷰 전환 버튼으로 언제든 모드 변경 가능
 * ==========================================================================
 */

// 1. 상태 관리 변수
let allStudents = [];
let filteredStudents = [];
let selectedStudent = null;
let activeGroupFilter = null;
let currentViewMode = 'grid'; // 'grid' | 'tab'
let currentDay = '월';        // 요일별 카드 뷰에서 선택된 요일

const DAYS = ['월', '화', '수', '목', '금'];
const DAY_LABELS = { '월': '월요일', '화': '화요일', '수': '수요일', '목': '목요일', '금': '금요일' };

// 2. DOM 요소
const classSelect       = document.getElementById('classSelect');
const searchInput       = document.getElementById('searchInput');
const clearSearchBtn    = document.getElementById('clearSearchBtn');
const studentList       = document.getElementById('studentList');
const totalStudentsCount = document.getElementById('totalStudentsCount');
const emptyState        = document.getElementById('emptyState');
const timetableContent  = document.getElementById('timetableContent');
const avatarInitial     = document.getElementById('avatarInitial');
const studentName       = document.getElementById('studentName');
const studentClassBadge = document.getElementById('studentClassBadge');
const choicesChips      = document.getElementById('choicesChips');
const timetableBody     = document.getElementById('timetableBody');
const themeToggleBtn    = document.getElementById('themeToggleBtn');
const printBtn          = document.getElementById('printBtn');
const viewGridBtn       = document.getElementById('viewGridBtn');
const viewTabBtn        = document.getElementById('viewTabBtn');
const gridViewWrapper   = document.getElementById('gridViewWrapper');
const tabViewWrapper    = document.getElementById('tabViewWrapper');
const dayTabsContainer  = document.getElementById('dayTabsContainer');

// 3. 초기화
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  detectInitialViewMode(); // 화면 너비에 따라 초기 뷰 모드 자동 결정
  loadStudentData();
  setupEventListeners();
});

/**
 * 화면 너비에 따라 초기 뷰 모드를 자동으로 결정합니다.
 * 모바일(767px 이하)에서는 요일별 카드 뷰를 기본으로 설정합니다.
 */
function detectInitialViewMode() {
  if (window.innerWidth <= 767) {
    setViewMode('tab');
  } else {
    setViewMode('grid');
  }
}

/**
 * 4. 학생 데이터 로드 (window.STUDENTS_DATA 우선, fetch 폴백)
 */
async function loadStudentData() {
  try {
    if (window.STUDENTS_DATA && Array.isArray(window.STUDENTS_DATA) && window.STUDENTS_DATA.length > 0) {
      allStudents = window.STUDENTS_DATA;
    } else {
      const response = await fetch('students_data.json');
      if (!response.ok) throw new Error(`HTTP 에러: ${response.status}`);
      allStudents = await response.json();
    }
    filteredStudents = [...allStudents];
    renderStudentList();
    if (filteredStudents.length > 0) selectStudent(filteredStudents[0]);
  } catch (error) {
    console.error('학생 데이터 로딩 실패:', error);
    studentList.innerHTML = `<li class="student-item" style="color:red; justify-content:center;">데이터 로딩 실패</li>`;
  }
}

/**
 * 5. 이벤트 리스너 설정
 */
function setupEventListeners() {
  classSelect.addEventListener('change', filterStudents);

  searchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
    filterStudents();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    filterStudents();
    searchInput.focus();
  });

  themeToggleBtn.addEventListener('click', toggleTheme);
  printBtn.addEventListener('click', downloadTimetableImage);

  // 뷰 전환 버튼
  viewGridBtn.addEventListener('click', () => setViewMode('grid'));
  viewTabBtn.addEventListener('click', () => setViewMode('tab'));

  // 요일 탭 버튼들
  document.querySelectorAll('.day-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDay = btn.dataset.day;
      document.querySelectorAll('.day-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (selectedStudent) renderTabView(selectedStudent.timetable);
    });
  });

  // 화면 크기 변경 시 뷰 모드 자동 조정 (창 크기 변경 대응)
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 767 && currentViewMode === 'grid') {
      setViewMode('tab');
    }
  });
}

/**
 * 6. 뷰 모드 전환 (주간 표 <-> 요일별 카드)
 */
function setViewMode(mode) {
  currentViewMode = mode;

  if (mode === 'grid') {
    gridViewWrapper.style.display = 'block';
    tabViewWrapper.style.display = 'none';
    dayTabsContainer.style.display = 'none';
    viewGridBtn.classList.add('active');
    viewTabBtn.classList.remove('active');
  } else {
    gridViewWrapper.style.display = 'none';
    tabViewWrapper.style.display = 'flex';
    dayTabsContainer.style.display = 'flex';
    viewTabBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    if (selectedStudent) renderTabView(selectedStudent.timetable);
  }
}

/**
 * 6-1. 선택된 학생의 시간표를 이미지(PNG) 파일로 다운로드합니다.
 * - html2canvas로 프로필 카드 + 주간 시간표 영역만 캡처합니다.
 * - 캡처 시에는 항상 '주간 전체표' 뷰로 강제 전환하고, 뷰 전환 버튼/안내 문구 등
 *   불필요한 UI는 잠시 숨겼다가 캡처가 끝나면 원래 상태로 복원합니다.
 */
async function downloadTimetableImage() {
  if (!selectedStudent) {
    alert('먼저 학생을 선택해주세요.');
    return;
  }
  if (typeof html2canvas === 'undefined') {
    alert('이미지 저장 기능을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요.');
    return;
  }

  const originalBtnHTML = printBtn.innerHTML;
  const originalViewMode = currentViewMode;

  printBtn.disabled = true;
  printBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>저장 중...</span>';

  // 캡처 전용 스타일 적용 (뷰 전환 버튼/안내 문구 숨김) + 주간 전체표 뷰로 고정
  document.body.classList.add('capturing-image');
  if (originalViewMode !== 'grid') setViewMode('grid');

  try {
    // 브라우저가 뷰 전환/스타일 변경을 실제로 반영할 시간을 살짝 확보
    await new Promise(resolve => setTimeout(resolve, 50));

    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-surface').trim() || '#ffffff';

    const canvas = await html2canvas(timetableContent, {
      backgroundColor: bgColor,
      scale: 2,
      useCORS: true
    });

    const safeName = selectedStudent.name.replace(/\s+/g, '');
    const fileName = `${safeName}_12학년${selectedStudent.classNum}반${selectedStudent.studentNum}번_시간표.png`;

    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('시간표 이미지 저장 실패:', error);
    alert('이미지를 저장하는 중 문제가 발생했습니다. 다시 시도해주세요.');
  } finally {
    document.body.classList.remove('capturing-image');
    if (originalViewMode !== 'grid') setViewMode(originalViewMode);
    printBtn.disabled = false;
    printBtn.innerHTML = originalBtnHTML;
  }
}

/**
 * 7. 학생 필터링
 */
function filterStudents() {
  const selectedClass = classSelect.value;
  const searchTerm = searchInput.value.trim().toLowerCase();

  filteredStudents = allStudents.filter(student => {
    const matchesClass = selectedClass === 'all' || student.classNum.toString() === selectedClass;
    const nameMatch = student.name.toLowerCase().includes(searchTerm);
    const classMatch = `${student.classNum}반`.includes(searchTerm);
    const numMatch = `${student.studentNum}번`.includes(searchTerm);
    const matchesSearch = !searchTerm || nameMatch || classMatch || numMatch;
    return matchesClass && matchesSearch;
  });

  renderStudentList();
}

/**
 * 8. 학생 목록 렌더링
 */
function renderStudentList() {
  totalStudentsCount.textContent = filteredStudents.length;
  studentList.innerHTML = '';

  if (filteredStudents.length === 0) {
    studentList.innerHTML = `<li style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.83rem;">검색 결과가 없습니다.</li>`;
    return;
  }

  filteredStudents.forEach(student => {
    const li = document.createElement('li');
    li.className = 'student-item';
    if (selectedStudent && selectedStudent.id === student.id) li.classList.add('active');
    li.innerHTML = `
      <span class="student-name-text">${student.name}</span>
      <span class="student-class">12학년 ${student.classNum}반 ${student.studentNum}번</span>
    `;
    li.addEventListener('click', () => selectStudent(student));
    studentList.appendChild(li);
  });
}

/**
 * 9. 학생 선택 및 시간표 뷰 업데이트
 */
function selectStudent(student) {
  selectedStudent = student;
  activeGroupFilter = null;

  document.querySelectorAll('.student-item').forEach(item => item.classList.remove('active'));
  const activeItem = Array.from(studentList.children).find(li =>
    li.querySelector('.student-name-text')?.textContent === student.name
  );
  if (activeItem) {
    activeItem.classList.add('active');
    // 목록에서 선택된 항목이 보이도록 스크롤
    activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  emptyState.style.display = 'none';
  timetableContent.style.display = 'block';

  studentName.textContent = student.name;
  avatarInitial.textContent = student.name.charAt(0);
  studentClassBadge.textContent = `12학년 ${student.classNum}반 ${student.studentNum}번`;

  renderChoiceChips(student);
  renderTimetableGrid(student.timetable);  // 주간 표 렌더링
  if (currentViewMode === 'tab') {
    renderTabView(student.timetable);       // 요일별 카드 렌더링
  }
}

/**
 * 10. 선택 과목 칩 렌더링
 */
function renderChoiceChips(student) {
  choicesChips.innerHTML = '';
  const groupCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  groupCodes.forEach(code => {
    const subjectName = student.choices[code] || '미선택';
    const teachersSet = new Set();
    let mainRoom = '';

    for (let day of DAYS) {
      for (let p = 1; p <= 7; p++) {
        const entries = student.timetable[day]?.[p.toString()] || [];
        const match = entries.find(e => e.group === code);
        if (match) {
          if (match.teacher) teachersSet.add(match.teacher);
          if (match.room) mainRoom = match.room;
        }
      }
    }

    const teacherText = teachersSet.size ? ` (${[...teachersSet].join(', ')})` : '';
    const roomText = mainRoom ? ` [📍${mainRoom}]` : '';

    const chip = document.createElement('div');
    chip.className = `choice-chip group-${code}`;
    chip.dataset.group = code;
    chip.innerHTML = `<span class="group-badge">${code}군</span><span>${subjectName}${teacherText}${roomText}</span>`;

    chip.addEventListener('click', () => {
      activeGroupFilter = activeGroupFilter === code ? null : code;
      document.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active-highlight'));
      if (activeGroupFilter) chip.classList.add('active-highlight');
      updateTimetableHighlights();
    });

    choicesChips.appendChild(chip);
  });
}

/**
 * 11. 주간 전체 표 그리드 렌더링 (데스크톱 뷰)
 */
function renderTimetableGrid(timetable) {
  timetableBody.innerHTML = '';

  for (let period = 1; period <= 7; period++) {
    const tr = document.createElement('tr');

    const periodTd = document.createElement('td');
    periodTd.className = 'period-cell';
    periodTd.textContent = `${period}교시`;
    tr.appendChild(periodTd);

    DAYS.forEach(day => {
      const td = document.createElement('td');
      const entries = timetable[day]?.[period.toString()] || [];

      if (entries.length > 0) {
        entries.forEach(entry => {
          td.appendChild(buildSubjectCell(entry));
        });
      } else {
        td.innerHTML = `<span style="color:var(--text-muted);font-size:0.72rem;">-</span>`;
      }
      tr.appendChild(td);
    });

    timetableBody.appendChild(tr);
  }
}

/**
 * 12. 요일별 카드 타임라인 렌더링 (모바일 뷰)
 */
function renderTabView(timetable) {
  tabViewWrapper.innerHTML = '';

  for (let period = 1; period <= 7; period++) {
    const entries = timetable[currentDay]?.[period.toString()] || [];

    const item = document.createElement('div');
    item.className = 'timeline-item';

    // 교시 라벨
    const label = document.createElement('div');
    label.className = 'timeline-period-label';
    label.innerHTML = `<strong>${period}</strong><span style="font-size:0.65rem;font-weight:500;">교시</span>`;
    item.appendChild(label);

    // 과목 카드 (수업 있음 / 없음 분기)
    if (entries.length > 0) {
      entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = `timeline-subject-card group-${entry.group}`;
        card.dataset.group = entry.group;

        const badgeText = entry.group === 'SDG' ? '학급 과목' : `선택 ${entry.group}`;
        const teacherHtml = entry.teacher
          ? `<span class="teacher-name"><i class="fa-solid fa-chalkboard-user"></i> ${entry.teacher}</span>` : '';
        const roomHtml = entry.room
          ? `<span class="room-location"><i class="fa-solid fa-location-dot"></i> ${entry.room}</span>` : '';

        card.innerHTML = `
          <span class="subject-name">${entry.subject}</span>
          <div class="info-row">${teacherHtml}${roomHtml}</div>
          <span class="group-badge">${badgeText}</span>
        `;

        // 하이라이트 적용
        if (activeGroupFilter && entry.group === activeGroupFilter) {
          card.style.boxShadow = `0 0 0 3px var(--primary-color)`;
        }

        item.appendChild(card);
      });
    } else {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'timeline-subject-card empty-period';
      emptyCard.innerHTML = `<span style="color:var(--text-muted);font-size:0.8rem;">자습 / 공강</span>`;
      item.appendChild(emptyCard);
    }

    tabViewWrapper.appendChild(item);
  }
}

/**
 * 13. 과목 셀 DOM 생성 헬퍼 (주간 표용)
 */
function buildSubjectCell(entry) {
  const cellContent = document.createElement('div');
  cellContent.className = `subject-cell-content group-${entry.group}`;
  cellContent.dataset.group = entry.group;

  const badgeText = entry.group === 'SDG' ? '학급 과목' : `선택 ${entry.group}`;
  const teacherHtml = entry.teacher
    ? `<span class="teacher-name"><i class="fa-solid fa-chalkboard-user"></i> ${entry.teacher}</span>` : '';
  const roomHtml = entry.room
    ? `<span class="room-location"><i class="fa-solid fa-location-dot"></i> ${entry.room}</span>` : '';

  cellContent.innerHTML = `
    <span class="subject-name">${entry.subject}</span>
    <div class="info-row">${teacherHtml}${roomHtml}</div>
    <span class="group-badge">${badgeText}</span>
  `;
  return cellContent;
}

/**
 * 14. 시간표 하이라이트 업데이트
 */
function updateTimetableHighlights() {
  // 주간 표 하이라이트
  timetableBody.querySelectorAll('.subject-cell-content').forEach(cell => {
    if (activeGroupFilter && cell.dataset.group === activeGroupFilter) {
      cell.classList.add('highlight-period');
    } else {
      cell.classList.remove('highlight-period');
    }
  });

  // 요일별 카드 뷰 하이라이트 (재렌더링으로 반영)
  if (currentViewMode === 'tab' && selectedStudent) {
    renderTabView(selectedStudent.timetable);
  }
}

/**
 * 15. 테마 초기화 & 토글
 */
function initTheme() {
  const savedTheme = localStorage.getItem('timetable_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('timetable_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = themeToggleBtn.querySelector('i');
  icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  themeToggleBtn.title = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
}
