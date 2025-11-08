// ゲーム状態管理
const GameState = {
    currentScreen: 'top',
    selectedSubject: null,
    selectedUnits: [],
    questionCount: null,
    currentQuestions: [],
    currentQuestionIndex: 0,
    correctCount: 0,
    startTime: null,
    currentUP: 0
};

// 問題データ
const questionData = {};

// 解答履歴（localStorageから読み込み）
let answerHistory = JSON.parse(localStorage.getItem('answerHistory') || '{}');

// 学習記録（localStorageから読み込み）
let studyRecords = JSON.parse(localStorage.getItem('studyRecords') || '[]');

// 設定（localStorageから読み込み）
const settings = {
    bgm: localStorage.getItem('bgm') !== 'false',
    sound: localStorage.getItem('sound') !== 'false'
};

// 初期化
function init() {
    setupEventListeners();
    loadSettings();
    updateCalendar();
}

// イベントリスナーの設定
function setupEventListeners() {
    // トップ画面
    document.getElementById('startDrillBtn').addEventListener('click', () => showScreen('drillSetup'));
    document.getElementById('statsBtn').addEventListener('click', () => showScreen('stats'));
    document.getElementById('settingsBtn').addEventListener('click', () => showScreen('settings'));

    // ドリル設定画面
    document.querySelectorAll('.subject-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const subjectBtn = e.target.closest('.subject-btn');
            if (subjectBtn) {
                selectSubject(subjectBtn.dataset.subject);
            }
        });
    });
    document.getElementById('backToTopBtn').addEventListener('click', () => {
        showScreen('top');
        resetDrillSetup();
    });
    document.getElementById('startRaceBtn').addEventListener('click', startDrill);

    // 設定画面
    document.getElementById('bgmToggle').addEventListener('change', (e) => {
        settings.bgm = e.target.checked;
        localStorage.setItem('bgm', settings.bgm);
    });
    document.getElementById('soundToggle').addEventListener('change', (e) => {
        settings.sound = e.target.checked;
        localStorage.setItem('sound', settings.sound);
    });
    document.getElementById('resetDataBtn').addEventListener('click', resetData);
    document.getElementById('backToTopFromSettingsBtn').addEventListener('click', () => showScreen('top'));

    // 成績グラフ画面
    document.getElementById('backToTopFromStatsBtn').addEventListener('click', () => showScreen('top'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateStatsChart(e.target.dataset.tab);
        });
    });

    // リザルト画面
    document.getElementById('retryBtn').addEventListener('click', () => {
        showScreen('drillSetup');
        resetDrillSetup();
    });
    document.getElementById('backToTopFromResultBtn').addEventListener('click', () => {
        showScreen('top');
        resetDrillSetup();
    });

    // 解説モーダル
    document.getElementById('closeExplanationBtn').addEventListener('click', closeExplanation);
    document.getElementById('nextQuestionBtn').addEventListener('click', nextQuestion);
}

// 画面表示切り替え
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    
    const screenMap = {
        'top': 'topScreen',
        'drillSetup': 'drillSetupScreen',
        'quiz': 'quizScreen',
        'result': 'resultScreen',
        'stats': 'statsScreen',
        'settings': 'settingsScreen'
    };
    
    document.getElementById(screenMap[screenName]).classList.add('active');
    GameState.currentScreen = screenName;

    if (screenName === 'stats') {
        updateStatsChart('daily');
    }
}

// 科目選択
async function selectSubject(subject) {
    GameState.selectedSubject = subject;
    
    // 選択状態を更新
    document.querySelectorAll('.subject-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`[data-subject="${subject}"]`).classList.add('selected');

    // 問題データを読み込む
    if (!questionData[subject]) {
        try {
            const response = await fetch(`data/${subject}.json`);
            questionData[subject] = await response.json();
        } catch (error) {
            alert('問題データの読み込みに失敗しました。');
            return;
        }
    }

    // ステップ2を表示
    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.remove('hidden');
    
    // 単元ツリーを構築
    buildUnitTree(questionData[subject]);
}

// 単元ツリーの構築
function buildUnitTree(data) {
    const treeContainer = document.getElementById('unitTree');
    treeContainer.innerHTML = '';

    data.units.forEach(unit => {
        const unitGroup = document.createElement('div');
        unitGroup.className = 'unit-group';
        
        const header = document.createElement('div');
        header.className = 'unit-group-header';
        header.textContent = unit.name;
        header.addEventListener('click', () => {
            unitGroup.classList.toggle('expanded');
            header.classList.toggle('expanded');
        });
        
        const items = document.createElement('div');
        items.className = 'unit-items';
        
        unit.subunits.forEach(subunit => {
            const item = document.createElement('div');
            item.className = 'unit-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = subunit.id;
            checkbox.value = subunit.id;
            checkbox.addEventListener('change', updateSelectedUnits);
            
            const label = document.createElement('label');
            label.htmlFor = subunit.id;
            label.textContent = subunit.name;
            
            item.appendChild(checkbox);
            item.appendChild(label);
            items.appendChild(item);
        });
        
        unitGroup.appendChild(header);
        unitGroup.appendChild(items);
        treeContainer.appendChild(unitGroup);
    });
}

// 選択された単元を更新
function updateSelectedUnits() {
    GameState.selectedUnits = Array.from(document.querySelectorAll('#unitTree input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    if (GameState.selectedUnits.length > 0) {
        document.getElementById('step2').classList.add('hidden');
        document.getElementById('step3').classList.remove('hidden');
        
        // 問題数選択ボタンの設定
        setupQuestionCountButtons();
    }
}

// 問題数選択ボタンの設定
function setupQuestionCountButtons() {
    // 既存のイベントリスナーを削除してから追加
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.classList.remove('selected');
        // 既存のイベントリスナーを削除
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function() {
            document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            GameState.questionCount = this.dataset.count;
            
            if (GameState.questionCount) {
                document.getElementById('startRaceBtn').classList.remove('hidden');
            }
        });
    });
}

// ドリル開始
async function startDrill() {
    if (!GameState.selectedSubject || GameState.selectedUnits.length === 0 || !GameState.questionCount) {
        alert('すべての設定を完了してください。');
        return;
    }

    // 問題リストを取得
    const allQuestions = [];
    const data = questionData[GameState.selectedSubject];
    
    GameState.selectedUnits.forEach(unitId => {
        data.units.forEach(unit => {
            unit.subunits.forEach(subunit => {
                if (subunit.id === unitId) {
                    allQuestions.push(...subunit.questions.map(q => ({
                        ...q,
                        subject: GameState.selectedSubject,
                        subjectName: data.subjectName,
                        unitName: subunit.name
                    })));
                }
            });
        });
    });

    if (allQuestions.length === 0) {
        alert('選択した単元に問題がありません。');
        return;
    }

    // 苦手問題優先アルゴリズムで問題を選択
    GameState.currentQuestions = selectQuestionsByDifficulty(allQuestions, GameState.questionCount);
    
    // ゲーム状態をリセット
    GameState.currentQuestionIndex = 0;
    GameState.correctCount = 0;
    GameState.startTime = Date.now();
    GameState.currentUP = 0;

    // クイズ画面に遷移
    showScreen('quiz');
    displayQuestion();
}

// 苦手問題優先アルゴリズム
function selectQuestionsByDifficulty(questions, count) {
    if (count === 'all') {
        return questions;
    }

    const targetCount = parseInt(count);
    
    // 各問題の優先度スコアを計算
    const questionsWithPriority = questions.map(q => {
        const history = answerHistory[q.id] || { attempts: 0, correct: 0 };
        const accuracy = history.attempts > 0 ? history.correct / history.attempts : 0;
        const priority = (1 - accuracy) * 10; // 正答率が低いほど優先度が高い
        
        return {
            question: q,
            priority: priority
        };
    });

    // 優先度に基づいて重み付けランダム抽選
    const selected = [];
    const remaining = [...questionsWithPriority];
    
    for (let i = 0; i < Math.min(targetCount, questions.length); i++) {
        if (remaining.length === 0) break;
        
        // 優先度の合計を計算
        const totalPriority = remaining.reduce((sum, item) => sum + item.priority, 0);
        
        // ランダムな値を生成
        let random = Math.random() * totalPriority;
        
        // 重み付け抽選
        let selectedIndex = 0;
        for (let j = 0; j < remaining.length; j++) {
            random -= remaining[j].priority;
            if (random <= 0) {
                selectedIndex = j;
                break;
            }
        }
        
        selected.push(remaining[selectedIndex].question);
        remaining.splice(selectedIndex, 1);
    }
    
    return selected;
}

// 問題表示
function displayQuestion() {
    const question = GameState.currentQuestions[GameState.currentQuestionIndex];
    
    // 進捗バーを更新
    const progress = ((GameState.currentQuestionIndex + 1) / GameState.currentQuestions.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('racerPosition').style.left = progress + '%';
    document.getElementById('currentQuestionNum').textContent = GameState.currentQuestionIndex + 1;
    document.getElementById('totalQuestions').textContent = GameState.currentQuestions.length;
    document.getElementById('currentUP').textContent = GameState.currentUP;

    // 問題情報を表示
    document.getElementById('questionSubject').textContent = question.subjectName;
    document.getElementById('questionUnit').textContent = question.unitName;
    document.getElementById('questionText').textContent = question.question;

    // 解答エリアを構築
    const answerArea = document.getElementById('answerArea');
    answerArea.innerHTML = '';

    if (question.type === 'choice') {
        // 選択肢問題
        question.choices.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.textContent = choice;
            btn.addEventListener('click', () => checkAnswer(index === question.answer));
            answerArea.appendChild(btn);
        });
    } else {
        // 入力問題
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'answer-input';
        input.placeholder = '答えを入力してください';
        input.id = 'answerInput';
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'answer-btn';
        submitBtn.textContent = '回答する';
        
        const checkAnswerHandler = () => {
            const userAnswer = input.value.trim();
            const correctAnswer = question.answer.trim();
            // 大文字小文字を区別しない比較
            const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
            input.disabled = true;
            submitBtn.disabled = true;
            checkAnswer(isCorrect, userAnswer, correctAnswer);
        };
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !input.disabled) {
                checkAnswerHandler();
            }
        });
        
        submitBtn.addEventListener('click', checkAnswerHandler);
        
        answerArea.appendChild(input);
        answerArea.appendChild(submitBtn);
        
        // フォーカスを入力欄に
        setTimeout(() => input.focus(), 100);
    }
}

// 答え合わせ
function checkAnswer(isCorrect, userAnswer = null, correctAnswer = null) {
    const question = GameState.currentQuestions[GameState.currentQuestionIndex];
    
    // 解答履歴を更新
    if (!answerHistory[question.id]) {
        answerHistory[question.id] = { attempts: 0, correct: 0 };
    }
    answerHistory[question.id].attempts++;
    if (isCorrect) {
        answerHistory[question.id].correct++;
        GameState.correctCount++;
        GameState.currentUP += 10;
        
        // 正解エフェクト
        playSound('correct');
        document.getElementById('currentUP').textContent = GameState.currentUP;
    } else {
        // 不正解エフェクト
        playSound('incorrect');
    }
    
    // localStorageに保存
    localStorage.setItem('answerHistory', JSON.stringify(answerHistory));

    // 選択肢問題の場合、正解・不正解を表示
    if (question.type === 'choice') {
        document.querySelectorAll('.answer-btn').forEach((btn, index) => {
            btn.disabled = true;
            if (index === question.answer) {
                btn.classList.add('correct');
            } else {
                btn.classList.add('incorrect');
            }
        });
    } else if (question.type === 'input') {
        // 入力問題の場合、正解・不正解を表示
        const input = document.getElementById('answerInput');
        const submitBtn = document.querySelector('.answer-btn');
        if (isCorrect) {
            input.style.borderColor = '#228B22';
            input.style.background = '#90EE90';
        } else {
            input.style.borderColor = '#DC143C';
            input.style.background = '#FFB6C1';
            // 正解を表示
            const correctDisplay = document.createElement('div');
            correctDisplay.style.marginTop = '10px';
            correctDisplay.style.padding = '10px';
            correctDisplay.style.background = '#FFF8DC';
            correctDisplay.style.borderRadius = '5px';
            correctDisplay.innerHTML = `<strong>正解:</strong> ${correctAnswer}`;
            document.getElementById('answerArea').appendChild(correctDisplay);
        }
    }

    // 不正解の場合は解説を表示
    if (!isCorrect) {
        setTimeout(() => {
            showExplanation(question.explanation);
        }, 1500);
    } else {
        // 正解の場合は次の問題へ
        setTimeout(() => {
            nextQuestion();
        }, 2000);
    }
}

// 解説を表示
function showExplanation(explanation) {
    document.getElementById('explanationText').textContent = explanation;
    document.getElementById('explanationModal').classList.remove('hidden');
}

// 解説を閉じる
function closeExplanation() {
    document.getElementById('explanationModal').classList.add('hidden');
    nextQuestion();
}

// 次の問題へ
function nextQuestion() {
    GameState.currentQuestionIndex++;
    
    if (GameState.currentQuestionIndex >= GameState.currentQuestions.length) {
        // リザルト画面へ
        showResult();
    } else {
        displayQuestion();
    }
}

// リザルト表示
function showResult() {
    const elapsedTime = Math.floor((Date.now() - GameState.startTime) / 1000);
    const accuracy = GameState.currentQuestions.length > 0 
        ? Math.round((GameState.correctCount / GameState.currentQuestions.length) * 100) 
        : 0;

    // 学習記録を保存
    const record = {
        date: new Date().toISOString().split('T')[0],
        subject: GameState.selectedSubject,
        totalQuestions: GameState.currentQuestions.length,
        correctCount: GameState.correctCount,
        accuracy: accuracy,
        time: elapsedTime,
        up: GameState.currentUP
    };
    studyRecords.push(record);
    localStorage.setItem('studyRecords', JSON.stringify(studyRecords));

    // リザルト画面を更新
    document.getElementById('resultCorrect').textContent = GameState.correctCount;
    document.getElementById('resultTime').textContent = elapsedTime + '秒';
    document.getElementById('resultUP').textContent = GameState.currentUP;
    document.getElementById('resultRate').textContent = accuracy + '%';

    // メッセージを設定
    let message = '';
    if (accuracy === 100) {
        message = '🎉 完璧！黄金のうんちレーサーだ！';
    } else if (accuracy >= 80) {
        message = '✨ すばらしい！スッキリ快便！';
    } else if (accuracy >= 60) {
        message = '👍 よく頑張った！もう少しで完璧！';
    } else {
        message = '💪 次はもっと頑張ろう！';
    }
    document.getElementById('resultMessage').textContent = message;

    showScreen('result');
}

// ドリル設定をリセット
function resetDrillSetup() {
    GameState.selectedSubject = null;
    GameState.selectedUnits = [];
    GameState.questionCount = null;
    document.querySelectorAll('.subject-btn').forEach(btn => btn.classList.remove('selected'));
    const unitTree = document.getElementById('unitTree');
    if (unitTree) {
        unitTree.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
    document.querySelectorAll('.count-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('step1').classList.remove('hidden');
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.add('hidden');
    document.getElementById('startRaceBtn').classList.add('hidden');
}

// 設定の読み込み
function loadSettings() {
    document.getElementById('bgmToggle').checked = settings.bgm;
    document.getElementById('soundToggle').checked = settings.sound;
}

// データリセット
function resetData() {
    if (confirm('全うんち記録（解いた数、正答数、正答率）をリセットしますか？\n（この操作は取り消せません）')) {
        localStorage.removeItem('answerHistory');
        localStorage.removeItem('studyRecords');
        answerHistory = {};
        studyRecords = [];
        alert('データをリセットしました。');
    }
}

// カレンダー更新
function updateCalendar() {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    calendar.innerHTML = '';
    
    // 曜日ヘッダー
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    weekdays.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day';
        header.style.fontWeight = 'bold';
        header.textContent = day;
        calendar.appendChild(header);
    });
    
    // 空白を追加
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        calendar.appendChild(empty);
    }
    
    // 日付を追加
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasData = studyRecords.some(r => r.date === dateStr);
        
        if (hasData) {
            dayElement.classList.add('has-data');
            dayElement.innerHTML = `${day}<br>💩`;
        }
        
        if (day === today.getDate() && month === today.getMonth()) {
            dayElement.classList.add('selected');
        }
        
        calendar.appendChild(dayElement);
    }
}

// 統計グラフ更新
function updateStatsChart(tab) {
    const canvas = document.getElementById('statsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;
    
    ctx.clearRect(0, 0, width, height);
    
    if (studyRecords.length === 0) {
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#8B4513';
        ctx.textAlign = 'center';
        ctx.fillText('まだデータがありません', width / 2, height / 2);
        return;
    }
    
    // データを集計
    let data = [];
    if (tab === 'daily') {
        // 日別データ（直近30日）
        const last30Days = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const records = studyRecords.filter(r => r.date === dateStr);
            last30Days.push({
                date: dateStr,
                total: records.reduce((sum, r) => sum + r.totalQuestions, 0),
                correct: records.reduce((sum, r) => sum + r.correctCount, 0)
            });
        }
        data = last30Days;
    } else if (tab === 'weekly') {
        // 週別データ（簡易実装）
        const weeks = {};
        studyRecords.forEach(r => {
            const date = new Date(r.date);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            if (!weeks[weekKey]) {
                weeks[weekKey] = { total: 0, correct: 0 };
            }
            weeks[weekKey].total += r.totalQuestions;
            weeks[weekKey].correct += r.correctCount;
        });
        data = Object.entries(weeks).map(([date, stats]) => ({ date, ...stats }));
    } else if (tab === 'monthly') {
        // 月別データ
        const months = {};
        studyRecords.forEach(r => {
            const monthKey = r.date.substring(0, 7);
            if (!months[monthKey]) {
                months[monthKey] = { total: 0, correct: 0 };
            }
            months[monthKey].total += r.totalQuestions;
            months[monthKey].correct += r.correctCount;
        });
        data = Object.entries(months).map(([date, stats]) => ({ date, ...stats }));
    }
    
    if (data.length === 0) return;
    
    // グラフを描画
    const maxTotal = Math.max(...data.map(d => d.total), 1);
    const barWidth = width / (data.length + 1);
    const barSpacing = barWidth * 0.2;
    const actualBarWidth = barWidth - barSpacing;
    
    data.forEach((item, index) => {
        const x = (index + 0.5) * barWidth;
        const totalHeight = (item.total / maxTotal) * (height - 60);
        const correctHeight = (item.correct / maxTotal) * (height - 60);
        
        // 総問題数のバー
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x - actualBarWidth / 2, height - 40 - totalHeight, actualBarWidth, totalHeight);
        
        // 正答数のバー
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - actualBarWidth / 2, height - 40 - correctHeight, actualBarWidth, correctHeight);
    });
}

// 効果音再生（簡易実装）
function playSound(type) {
    if (!settings.sound) return;
    // 実際の実装では音声ファイルを再生
    console.log(`Playing ${type} sound`);
}

// ページ読み込み時に初期化
window.addEventListener('load', init);
