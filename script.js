import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// === ВСТАВЬ СВОИ КЛЮЧИ СЮДА ===
const supabaseUrl = 'https://szmwwykgtwdosouands.supabase.co'; // Твой Project URL
const supabaseKey = 'sb_publishable_0r_04raj-...'; // Твой Publishable Key (длинная строка)
// ==============================

const supabase = createClient(supabaseUrl, supabaseKey);

// Проверяем, вошел ли пользователь
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        // Если вошел — показываем его email и кнопку выхода
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('auth-section').classList.remove('flex');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('user-info').classList.add('flex');
        document.getElementById('user-email').innerText = session.user.email;
    } else {
        // Если вышел — показываем форму входа
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
    
    // Пытаемся войти
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Если юзера нет, автоматически регистрируем
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

// Функция загрузки и отрисовки треков
async function loadTracks() {
    const container = document.getElementById('tracks-container');
    
    // Получаем треки из базы
    const { data: tracks, error } = await supabase.from('tracks').select('*');
    if (error) { 
        container.innerHTML = `<p class="text-red-500">Ошибка загрузки: ${error.message}</p>`;
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

        // Рисуем карточку трека
        const trackHTML = `
            <div class="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700">
                <h2 class="text-xl font-bold mb-3">${track.title}</h2>
                <audio controls src="${track.audio_url}" class="w-full mb-4"></audio>
                
                <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="text-yellow-400 font-bold text-lg">
                        ⭐ ${avgScore > 0 ? avgScore : 'Нет оценок'} <span class="text-gray-400 text-sm font-normal">(${ratings ? ratings.length : 0} голосов)</span>
                    </div>
                    
                    <!-- Кнопки оценок от 1 до 10 -->
                    <div class="flex flex-wrap gap-1 justify-center">
                        ${[1,2,3,4,5,6,7,8,9,10].map(score => 
                            `<button onclick="rateTrack(${track.id}, ${score})" class="bg-gray-700 hover:bg-green-500 w-8 h-8 rounded-full font-bold transition text-sm">${score}</button>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += trackHTML;
    }
}

// Функция постановки оценки
window.rateTrack = async function(trackId, score) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        alert('Чтобы ставить оценки, сначала войди или зарегистрируйся!');
        return;
    }

    const user = session.user;

    // Сохраняем или обновляем оценку (благодаря правилу unique в базе)
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
        // Если всё ок, перезагружаем список, чтобы обновить средний балл
        loadTracks(); 
    }
}

// Запускаем загрузку треков при открытии страницы
loadTracks();
