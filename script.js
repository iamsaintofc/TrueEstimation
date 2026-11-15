import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// === ВСТАВЬ СВОИ КЛЮЧИ СЮДА ===
const supabaseUrl = 'https://szmwwykgtwdosauounds.supabase.co'; 
const supabaseKey = 'sb_publishable_0r_O4raj-GlUeg3p8E62TQ_X3gpfZER'; 
// ================================

const supabase = createClient(supabaseUrl, supabaseKey);

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

// Функция Выхода
window.logout = async function() {
    await supabase.auth.signOut();
}

// Функция загрузки и отрисовки треков ИЗ SUPABASE
async function loadTracks() {
    const container = document.getElementById('tracks-container');
    
    // Получаем треки из базы данных
    const { data: tracks, error } = await supabase.from('tracks').select('*');
    if (error) { 
        container.innerHTML = `<p class="text-red-500 text-center bg-red-500/10 p-4 rounded-xl border border-red-500/20">Ошибка загрузки: ${error.message}</p>`;
        return; 
    }

    container.innerHTML = ''; // Очищаем экран

    for (const track of tracks) {
        // Получаем все оценки для этого трека
        const { data: ratings } = await supabase.from('ratings').select('score').eq('track_id', track.id);
        
        // Считаем средний балл
        let avgScore = 0;
        if (ratings && ratings.length > 0) {
            const sum = ratings.reduce((acc, curr) => acc + curr.score, 0);
            avgScore = (sum / ratings.length).toFixed(1);
        }

        // НОВЫЙ ДИЗАЙН КАРТОЧКИ ТРЕКА
        const trackHTML = `
            <div class="bg-white/5 backdrop-blur-sm p-5 md:p-6 rounded-2xl border border-white/10 hover:border-green-500/50 transition-all duration-300 shadow-xl group">
                <div class="flex flex-col md:flex-row gap-5 items-start md:items-center mb-5">
                    
                    <!-- Обложка -->
                    ${track.cover_url 
                        ? `<img src="${track.cover_url}" class="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-300">` 
                        : `<div class="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-lg hidden md:flex shrink-0"><svg class="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>`
                    }
                    
                    <!-- Название и Плеер -->
                    <div class="flex-1 w-full min-w-0">
                        <h2 class="text-2xl font-bold mb-3 tracking-tight truncate">${track.title}</h2>
                        <audio controls src="${track.audio_url}" class="w-full h-12 outline-none rounded-lg"></audio>
                    </div>
                </div>
                
                <!-- Линия-разделитель -->
                <div class="h-px w-full bg-white/10 mb-4"></div>

                <!-- Оценки и Кнопки -->
                <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                    
                    <!-- Средний балл -->
                    <div class="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-xl border border-white/5 w-full md:w-auto justify-center md:justify-start">
                        <span class="text-yellow-400 text-xl">⭐</span>
                        <span class="text-white font-extrabold text-lg">${avgScore > 0 ? avgScore : '-'}</span>
                        <span class="text-gray-400 text-sm font-medium">(${ratings ? ratings.length : 0} голосов)</span>
                    </div>
                    
                    <!-- Кнопки 1-10 -->
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

// Функция постановки оценки (отправляем в Supabase)
window.rateTrack = async function(trackId, score) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        alert('Чтобы ставить оценки, сначала войди или зарегистрируйся!');
        return;
    }

    const user = session.user;

    // Сохраняем или обновляем оценку
    const { error } = await supabase
        .from('ratings')
        .upsert({ 
            user_id: user.id, 
            track_id: trackId, 
            score: score 
        }, { onConflict: 'user_id, track_id' });

    if (error) {
        alert('Ошибка при сохранении: ' + error.message);
    } else {
        loadTracks(); // Перезагружаем, чтобы мгновенно обновить средний балл
    }
}

// Запускаем загрузку при открытии страницы
loadTracks();
