import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// === ВСТАВЬ СВОИ КЛЮЧИ СЮДА ===
const supabaseUrl = 'https://szmwwykgtwdosouands.supabase.co'; 
const supabaseKey = 'sb_publishable_0r_04raj-G1Ueg3p8E62TQ_X3gpfZER'; 
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

        // Рисуем карточку трека (с поддержкой обложки)
        const trackHTML = `
            <div class="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700 flex gap-4 items-start">
                ${track.cover_url ? `<img src="${track.cover_url}" class="w-24 h-24 rounded-lg object-cover hidden md:block">` : ''}
                
                <div class="flex-1">
                    <h2 class="text-xl font-bold mb-3">${track.title}</h2>
                    <audio controls src="${track.audio_url}" class="w-full mb-4"></audio>
                    
                    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div class="text-yellow-400 font-bold text-lg">
                            ⭐ ${avgScore > 0 ? avgScore : 'Нет оценок'} <span class="text-gray-400 text-sm font-normal">(${ratings ? ratings.length : 0} голосов)</span>
                        </div>
                        
                        <div class="flex flex-wrap gap-1 justify-center">
                            ${[1,2,3,4,5,6,7,8,9,10].map(score => 
                                `<button onclick="rateTrack(${track.id}, ${score})" class="bg-gray-700 hover:bg-green-500 w-8 h-8 rounded-full font-bold transition text-sm">${score}</button>`
                            ).join('')}
                        </div>
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
        loadTracks(); // Перезагружаем, чтобы обновить средний балл
    }
}

// Запускаем загрузку при открытии страницы
loadTracks();
