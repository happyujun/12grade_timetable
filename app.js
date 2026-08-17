/**
 * ==========================================================================
 * 12학년 2학기 학생별 시간표 조회 웹 애플리케이션 (app.js)
 * ==========================================================================
 * - students_data.js (window.STUDENTS_DATA) 또는 fetch를 통해 학생 목록 및 주간 시간표를 렌더링합니다.
 * - 학급 필터링, 이름/번호 검색, 선택과목 수강교시 하이라이트, 담당 교사 & 수업 위치(교실) 표기, 테마 전환 및 인쇄 기능을 제공합니다.
 */

// 1. 상태(State) 관리 변수
let allStudents = [];       // 전체 학생 데이터 목록
let filteredStudents = [];  // 필터링된 학생 데이터 목록
let selectedStudent = null; // 현재 선택된 학생 객체
let activeGroupFilter = null; // 현재 강조 표시할 선택과목 그룹 (예: 'A', 'B' ...)

// 요일 목록 정의
const DAYS = ['월', '화', '수', '목', '금'];

// 2. DOM 요소 참조
const classSelect = document.getElementById('classSelect');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const studentList = document.getElementById('studentList');
const totalStudentsCount = document.getElementById('totalStudentsCount');

const emptyState = document.getElementById('emptyState');
const timetableContent = document.getElementById('timetableContent');

const avatarInitial = document.getElementById('avatarInitial');
const studentName = document.getElementById('studentName');
const studentClassBadge = document.getElementById('studentClassBadge');
const choicesChips = document.getElementById('choicesChips');
const timetableBody = document.getElementById('timetableBody');

const themeToggleBtn = document.getElementById('themeToggleBtn');
const printBtn = document.getElementById('printBtn');

// 3. 애플리케이션 초기화 (DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
  initTheme();       // 저장된 테마 적용
  loadStudentData(); // 학생 데이터 로드 (JS 변수 및 fetch 이중 지원)
  setupEventListeners(); // 이벤트 리스너 등록
});

/**
 * 4. 학생 데이터 불러오기 (JS 변수 window.STUDENTS_DATA 선적용으로 CORS 이슈 해결)
 */
async function loadStudentData() {
  try {
    // 1차: script 태그로 로드된 window.STUDENTS_DATA 우선 확인
    if (window.STUDENTS_DATA && Array.isArray(window.STUDENTS_DATA) && window.STUDENTS_DATA.length > 0) {
      allStudents = window.STUDENTS_DATA;
    } else {
      // 2차 예비(Fallback): fetch 사용
      const response = await fetch('students_data.json');
      if (!response.ok) {
        throw new Error(`HTTP 에러! 상태: ${response.status}`);
      }
      allStudents = await response.json();
    }

    filteredStudents = [...allStudents];
    
    // UI 업데이트: 학생 수 및 목록 렌더링
    renderStudentList();
    
    // 첫 번째 학생 자동 선택 (기본값)
    if (filteredStudents.length > 0) {
      selectStudent(filteredStudents[0]);
    }
  } catch (error) {
    console.error('학생 데이터를 불러오는데 실패했습니다:', error);
    studentList.innerHTML = `<li class="student-item" style="color:red; justify-content:center;">데이터 로딩 실패</li>`;
  }
}

/**
 * 5. 이벤트 리스너 설정
 */
function setupEventListeners() {
  // 학급 선택 드롭다운 변경 시
  classSelect.addEventListener('change', filterStudents);
  
  // 검색어 입력 시
  searchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
    filterStudents();
  });
  
  // 검색어 초기화 버튼 클릭 시
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    filterStudents();
    searchInput.focus();
  });
  
  // 테마 전환 버튼
  themeToggleBtn.addEventListener('click', toggleTheme);
  
  // 시간표 인쇄 버튼
  printBtn.addEventListener('click', () => {
    window.print();
  });
}

/**
 * 6. 학생 데이터 필터링 (반 선택 + 이름/번호 검색)
 */
function filterStudents() {
  const selectedClass = classSelect.value;
  const searchTerm = searchInput.value.trim().toLowerCase();
  
  filteredStudents = allStudents.filter(student => {
    // 반 필터 조건 ('all'이거나 반 숫자가 일치할 때)
    const matchesClass = (selectedClass === 'all') || (student.classNum.toString() === selectedClass);
    
    // 이름 또는 번호/학급 검색 조건
    const nameMatch = student.name.toLowerCase().includes(searchTerm);
    const classNumMatch = `${student.classNum}반`.includes(searchTerm);
    const numMatch = `${student.studentNum}번`.includes(searchTerm);
    const matchesSearch = !searchTerm || nameMatch || classNumMatch || numMatch;
    
    return matchesClass && matchesSearch;
  });
  
  renderStudentList();
}

/**
 * 7. 좌측 학생 목록 렌더링 (12학년 표기 적용)
 */
function renderStudentList() {
  totalStudentsCount.textContent = filteredStudents.length;
  studentList.innerHTML = '';
  
  if (filteredStudents.length === 0) {
    studentList.innerHTML = `
      <li style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        검색 결과가 없습니다.
      </li>
    `;
    return;
  }
  
  filteredStudents.forEach(student => {
    const li = document.createElement('li');
    li.className = 'student-item';
    
    // 현재 선택된 학생이면 active 클래스 부여
    if (selectedStudent && selectedStudent.id === student.id) {
      li.classList.add('active');
    }
    
    li.innerHTML = `
      <span class="student-name-text">${student.name}</span>
      <span class="student-class">12학년 ${student.classNum}반 ${student.studentNum}번</span>
    `;
    
    // 학생 클릭 이벤트
    li.addEventListener('click', () => selectStudent(student));
    studentList.appendChild(li);
  });
}

/**
 * 8. 특정 학생 선택 및 시간표 뷰 업데이트 (12학년 표기 적용)
 * @param {Object} student - 선택된 학생 객체
 */
function selectStudent(student) {
  selectedStudent = student;
  activeGroupFilter = null; // 하이라이트 필터 초기화
  
  // 목록 하이라이트 클래스 갱신
  document.querySelectorAll('.student-item').forEach(item => item.classList.remove('active'));
  
  // 목록에서 현재 선택된 아이템 항목 찾아서 active 부여
  const activeItem = Array.from(studentList.children).find(li => li.querySelector('.student-name-text')?.textContent === student.name);
  if (activeItem) {
    activeItem.classList.add('active');
  }
  
  // 엠티 스테이트 감추고 시간표 영역 표시
  emptyState.style.display = 'none';
  timetableContent.style.display = 'block';
  
  // 상단 프로필 카드 정보 갱신
  studentName.textContent = student.name;
  avatarInitial.textContent = student.name.charAt(0);
  studentClassBadge.textContent = `12학년 ${student.classNum}반 ${student.studentNum}번`;
  
  // 선택과목 칩 렌더링
  renderChoiceChips(student);
  
  // 주간 시간표 타임테이블 렌더링
  renderTimetableGrid(student.timetable);
}

/**
 * 9. 선택 과목 (8과목) 칩 렌더링
 * @param {Object} student - 학생 정보 객체
 */
function renderChoiceChips(student) {
  choicesChips.innerHTML = '';
  const choices = student.choices;
  const groupCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  groupCodes.forEach(code => {
    const subjectName = choices[code] || '미선택';
    
    // 해당 과목의 담당 교사 및 수업 장소 수집
    const teachersSet = new Set();
    let mainRoom = "";
    for (let day of DAYS) {
      for (let p = 1; p <= 7; p++) {
        const entries = student.timetable[day][p.toString()] || [];
        const match = entries.find(e => e.group === code);
        if (match) {
          if (match.teacher) teachersSet.add(match.teacher);
          if (match.room) mainRoom = match.room;
        }
      }
    }
    
    const teacherList = Array.from(teachersSet).join(', ');
    const chip = document.createElement('div');
    chip.className = `choice-chip group-${code}`;
    chip.dataset.group = code;
    
    const teacherText = teacherList ? ` (${teacherList})` : '';
    const roomText = mainRoom ? ` [📍${mainRoom}]` : '';
    
    chip.innerHTML = `
      <span class="group-badge">${code}군</span>
      <span>${subjectName}${teacherText}${roomText}</span>
    `;
    
    // 과목 칩 클릭 시 해당 수강 교시 하이라이트 토글
    chip.addEventListener('click', () => {
      if (activeGroupFilter === code) {
        activeGroupFilter = null;
      } else {
        activeGroupFilter = code;
      }
      
      // 칩 하이라이트 클래스 업데이트
      document.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active-highlight'));
      if (activeGroupFilter) {
        chip.classList.add('active-highlight');
      }
      
      // 시간표 하이라이트 적용
      updateTimetableHighlights();
    });
    
    choicesChips.appendChild(chip);
  });
}

/**
 * 10. 주간 시간표 (월~금, 1~7교시) 그리드 렌더링
 * @param {Object} timetable - 학생의 주간 시간표 객체
 */
function renderTimetableGrid(timetable) {
  timetableBody.innerHTML = '';
  
  // 1교시부터 7교시까지 행 생성
  for (let period = 1; period <= 7; period++) {
    const tr = document.createElement('tr');
    
    // 교시 헤더 셀 (예: 1교시)
    const periodTd = document.createElement('td');
    periodTd.className = 'period-cell';
    periodTd.textContent = `${period}교시`;
    tr.appendChild(periodTd);
    
    // 월요일~금요일 과목 셀 생성
    DAYS.forEach(day => {
      const td = document.createElement('td');
      const periodStr = period.toString();
      const entries = timetable[day] && timetable[day][periodStr] ? timetable[day][periodStr] : [];
      
      if (entries.length > 0) {
        entries.forEach(entry => {
          const cellContent = document.createElement('div');
          cellContent.className = `subject-cell-content group-${entry.group}`;
          cellContent.dataset.group = entry.group;
          
          // 배지 문자열 분기 (선택 A~H 또는 SDG's)
          const badgeText = entry.group === 'SDG' ? '학급 과목' : `선택 ${entry.group}`;
          
          // 담당 교사 이름 & 수업 위치 HTML
          const teacherHtml = entry.teacher ? `<span class="teacher-name"><i class="fa-solid fa-chalkboard-user"></i> ${entry.teacher}</span>` : '';
          const roomHtml = entry.room ? `<span class="room-location"><i class="fa-solid fa-location-dot"></i> ${entry.room}</span>` : '';
          
          cellContent.innerHTML = `
            <span class="subject-name">${entry.subject}</span>
            <div class="info-row">
              ${teacherHtml}
              ${roomHtml}
            </div>
            <span class="group-badge">${badgeText}</span>
          `;
          
          td.appendChild(cellContent);
        });
      } else {
        // 수업이 없는 공강/자습 교시
        td.innerHTML = `<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>`;
      }
      
      tr.appendChild(td);
    });
    
    timetableBody.appendChild(tr);
  }
}

/**
 * 11. 선택과목 칩 클릭 시 해당 수강 교시 강조(하이라이트) 업데이트
 */
function updateTimetableHighlights() {
  const allSubjectCells = timetableBody.querySelectorAll('.subject-cell-content');
  
  allSubjectCells.forEach(cell => {
    const groupCode = cell.dataset.group;
    if (activeGroupFilter && groupCode === activeGroupFilter) {
      cell.classList.add('highlight-period');
    } else {
      cell.classList.remove('highlight-period');
    }
  });
}

/**
 * 12. 다크 / 라이트 테마 설정 & 토글
 */
function initTheme() {
  const savedTheme = localStorage.getItem('timetable_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('timetable_theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = themeToggleBtn.querySelector('i');
  if (theme === 'dark') {
    icon.className = 'fa-solid fa-sun';
    themeToggleBtn.title = '라이트 모드로 전환';
  } else {
    icon.className = 'fa-solid fa-moon';
    themeToggleBtn.title = '다크 모드로 전환';
  }
}
