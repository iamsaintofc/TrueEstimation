import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// === ВСТАВЬ СВОИ КЛЮЧИ СЮДА ===
const supabaseUrl = 'https://szmwwykgtwdosauounds.supabase.co'; 
const supabaseKey = 'sb_publishable_0r_O4raj-GlUeg3p8E62TQ_X3gpfZER'; 
// ================================

const supabase = createClient(supabaseUrl, supabaseKey);

// Переменная для хранения ID текущего играющего трека
let currentPlayingAudioId = null;

// Проверяем, вошел ли пользователь
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('auth-section').classList.remove('flex');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('user-info').classList.add('flex');
        document.getElementById('user-email').innerText = session.user.email;
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('auth-section').classList.add('flex');
        document.getElementById('user-info').classList.add('hidden');
        document.getElementById('user-info').classList.remove('flex');
    }
});

// Функция Входа/Регистрации
window.login = async function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if(!email || !password) return alert("Введи email и пароль!");
    
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error && error.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) alert('Ошибка регистрации: ' + signUpError.message);
        else alert('Аккаунт создан! Вы вошли.');
    } else if (error) {
        alert('Ошибка: ' + error.message);
    }
}

window.logout = async function() {
    await supabase.auth.signOut();
}

// Форматирование времени (например, 125 сек -> 2:05)
function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Управление плеером (Play/Pause)
window.togglePlay = function(trackId) {
    const audio = document.getElementById(`audio-${trackId}`);
    const btn = document.getElementById(`play-btn-${trackId}`);

    if (audio.paused) {
        // Если другой трек играет, останавливаем его
        if (currentPlayingAudioId && currentPlayingAudioId !== trackId) {
            const oldAudio = document.getElementById(`audio-${currentPlayingAudioId}`);
            const oldBtn = document.getElementById(`play-btn-${currentPlayingAudioId}`);
            if (oldAudio) {
                oldAudio.pause();
                oldAudio.currentTime = 0;
                oldBtn.innerHTML = `<svg class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
            }
        }
        // Включаем новый
        audio.play();
        currentPlayingAudioId = trackId;
        btn.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    } else {
        // Ставим на паузу
        audio.pause();
        btn.innerHTML = `<svg class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    }
}

// Обновление прогресса при проигрывании
window.updateProgress = function(trackId) {
    const audio = document.getElementById(`audio-${trackId}`);
    const progress = document.getElementById(`progress-${trackId}`);
    const timeText = document.getElementById(`current-time-${trackId}`);
    const slider = document.getElementById(`slider-${trackId}`);
    
    if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progress.style.width = `${percent}%`;
        slider.value = audio.currentTime;
        timeText.innerText = formatTime(audio.currentTime);
    }
}

// Загрузка метаданных (получаем длительность)
window.setDuration = function(trackId) {
    const audio = document.getElementById(`audio-${trackId}`);
    const durationText = document.getElementById(`duration-${trackId}`);
    const slider = document.getElementById(`slider-${trackId}`);
    
    durationText.innerText = formatTime(audio.duration);
    slider.max = audio.duration;
}

// Перемотка по клику на слайдер
window.seekAudio = function(trackId, value) {
    const audio = document.getElementById(`audio-${trackId}`);
    audio.currentTime = value;
}

// Когда трек закончился
window.resetPlayBtn = function(trackId) {
    const btn = document.getElementById(`play-btn-${trackId}`);
    const progress = document.getElementById(`progress-${trackId}`);
    btn.innerHTML = `<svg class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    progress.style.width = `0%`;
    currentPlayingAudioId = null;
}

// ГЛАВНАЯ ФУНКЦИЯ ЗАГРУЗКИ ТРЕКОВ
async function loadTracks() {
    const container = document.getElementById('tracks-container');
    const statsContainer = document.getElementById('stats-container');
    
    const { data: tracks, error } = await supabase.from('tracks').select('*');
    if (error) { 
        container.innerHTML = `<p class="text-red-500 text-center">Ошибка загрузки: ${error.message}</p>`;
        return; 
    }

    // Массив для сортировки
    let processedTracks = [];
    let totalGlobalVotes = 0;

    // Собираем данные и считаем средние баллы
    for (const track of tracks) {
        const { data: ratings } = await supabase.from('ratings').select('score').eq('track_id', track.id);
        
        let avgScore = 0;
        let votesCount = ratings ? ratings.length : 0;
        totalGlobalVotes += votesCount;

        if (votesCount > 0) {
            const sum = ratings.reduce((acc, curr) => acc + curr.score, 0);
            avgScore = (sum / votesCount).toFixed(1);
        }

        processedTracks.push({ ...track, avgScore, votesCount });
    }

    // Обновляем статистику
    statsContainer.innerText = `Всего треков: ${processedTracks.length}  |  Всего оценок: ${totalGlobalVotes}`;

    // СОРТИРОВКА: Сначала треки с высоким рейтингом. Если оценок нет, они внизу.
    processedTracks.sort((a, b) => {
        if (b.avgScore == 0) return -1;
        return b.avgScore - a.avgScore;
    });

    container.innerHTML = ''; 

    // Отрисовка
    for (const track of processedTracks) {
        const trackHTML = `
            <div class="bg-white/5 backdrop-blur-sm p-5 md:p-6 rounded-2xl border border-white/10 hover:border-green-500/30 transition-all duration-300 shadow-xl group">
                <div class="flex flex-col md:flex-row gap-5 items-start md:items-center mb-5">
                    
                    <!-- Обложка -->
                    ${track.cover_url 
                        ? `<img src="${track.cover_url}" class="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-300 shrink-0">` 
                        : `<div class="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-lg hidden md:flex shrink-0"><svg class="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>`
                    }
                    
                    <!-- Информация и Кастомный плеер -->
                    <div class="flex-1 w-full min-w-0">
                        <h2 class="text-2xl font-bold mb-3 tracking-tight truncate">${track.title}</h2>
                        
                        <!-- КАСТОМНЫЙ ПЛЕЕР -->
                        <div class="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                            <button id="play-btn-${track.id}" onclick="togglePlay(${track.id})" class="w-10 h-10 flex items-center justify-center bg-green-500 hover:bg-green-400 text-black rounded-full transition-transform active:scale-95 shrink-0">
                                <svg class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </button>
                            
                            <div class="flex-1 flex flex-col gap-1">
                                <!-- Визуальная полоска -->
                                <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative cursor-pointer" id="progress-bar-${track.id}">
                                    <div id="progress-${track.id}" class="h-full bg-green-500 w-0"></div>
                                    <!-- Невидимый слайдер поверх для перемотки -->
                                    <input type="range" id="slider-${track.id}" min="0" max="100" value="0" step="0.1" oninput="seekAudio(${track.id}, this.value)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                                </div>
                                <div class="flex justify-between text-xs text-gray-400 font-medium">
                                    <span id="current-time-${track.id}">0:00</span>
                                    <span id="duration-${track.id}">0:00</span>
                                </div>
                            </div>
                            <!-- Скрытый оригинальный плеер -->
                            <audio id="audio-${track.id}" src="${track.audio_url}" ontimeupdate="updateProgress(${track.id})" onloadedmetadata="setDuration(${track.id})" onended="resetPlayBtn(${track.id})"></audio>
                        </div>
                    </div>
                </div>
                
                <div class="h-px w-full bg-white/10 mb-4"></div>

                <!-- Оценки и Кнопки -->
                <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-xl border border-white/5 w-full md:w-auto justify-center md:justify-start">
                        <span class="text-yellow-400 text-xl">⭐</span>
                        <span class="text-white font-extrabold text-lg">${track.avgScore > 0 ? track.avgScore : '-'}</span>
                        <span class="text-gray-400 text-sm font-medium">(${track.votesCount} голосов)</span>
                    </div>
                    
                    <div class="flex flex-wrap gap-1.5 justify-center">
                        ${[1,2,3,4,5,6,7,8,9,10].map(score => 
                            `<button onclick="rateTrack(${track.id}, ${score})" class="w-9 h-9 rounded-lg bg-white/5 hover:bg-green-500 hover:text-black border border-white/10 font-bold transition-all duration-200 active:scale-90 shadow-sm">${score}</button>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += trackHTML;
    }
}

// Постановка оценки
window.rateTrack = async function(trackId, score) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert('Чтобы ставить оценки, сначала войди или зарегистрируйся!');

    const user = session.user;

    const { error } = await supabase
        .from('ratings')
        .upsert({ user_id: user.id, track_id: trackId, score: score }, { onConflict: 'user_id, track_id' });

    if (error) {
        alert('Ошибка при сохранении: ' + error.message);
    } else {
        // Сохраняем текущее время играющего трека, чтобы плеер не сбрасывался при перерисовке
        let currentTime = 0;
        if (currentPlayingAudioId) {
            const audio = document.getElementById(`audio-${currentPlayingAudioId}`);
            if (audio) currentTime = audio.currentTime;
        }

        await loadTracks(); // Перезагружаем список (сработает сортировка)

        // Восстанавливаем воспроизведение
        if (currentPlayingAudioId) {
            const audio = document.getElementById(`audio-${currentPlayingAudioId}`);
            const btn = document.getElementById(`play-btn-${currentPlayingAudioId}`);
            if (audio) {
                audio.currentTime = currentTime;
                audio.play();
                if(btn) btn.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
            }
        }
    }
}

// Запуск
loadTracks();
