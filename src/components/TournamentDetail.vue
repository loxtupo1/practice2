<template>
  <div class="detail-container">
    <div v-if="loading" class="loading-spinner">
      <p>Загрузка информации о турнире...</p>
    </div>

    <div v-else-if="!tournament" class="error-state">
      <h2>Турнир не найден</h2>
      <router-link to="/" class="btn btn-primary">Вернуться на главную</router-link>
    </div>

    <div v-else class="tournament-detail">
      <!-- Хедер -->
      <div class="detail-header">
        <div class="header-content">
          <div class="breadcrumb">
            <router-link to="/">Главная</router-link>
            <span>/</span>
            <span>{{ tournament.game }}</span>
          </div>
          <h1 class="detail-title">{{ tournament.name }}</h1>
          <p class="detail-subtitle">{{ tournament.description || 'Эпический киберспортивный турнир' }}</p>
        </div>
      </div>

      <div class="detail-content">
        <div class="main-section">
          <div class="status-banner">
            <div class="status-item">
              <span class="label">Статус:</span>
              <span :class="['status-badge', getStatusClass(tournament)]">
                {{ getStatus(tournament) }}
              </span>
            </div>
            <div class="status-item">
              <span class="label">Участников:</span>
              <span class="value">{{ tournament.registeredTeams || 0 }}/{{ tournament.maxTeams || 16 }}</span>
            </div>
            <div class="status-item">
              <span class="label">Прогресс:</span>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: getProgressPercent(tournament) + '%' }"></div>
              </div>
            </div>
          </div>

          <div v-if="tournament.status === 'completed' && tournament.winner" class="winner-banner">
            <div class="winner-content">
              <div class="trophy-icon">🏆</div>
              <div class="winner-info">
                <h3>Победитель турнира</h3>
                <p class="winner-name">{{ tournament.winner }}</p>
              </div>
            </div>
          </div>

          <div class="action-section">
            <button 
              v-if="isAuthenticated" 
              @click="handleRegister"
              class="btn btn-register"
              :disabled="registering || isFull(tournament) || isRegistered"
            >
              <span v-if="registering">ОБРАБОТКА...</span>
              <span v-else-if="isRegistered">ВЫ ЗАРЕГИСТРИРОВАНЫ</span>
              <span v-else-if="isFull(tournament)">МЕСТ НЕТ</span>
              <span v-else>УЧАСТВОВАТЬ В ТУРНИРЕ</span>
            </button>
            <router-link v-else to="/login" class="btn btn-register">ВОЙТИ ДЛЯ ЗАПИСИ</router-link>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <div class="info-body">
                <h4>Призовой фонд</h4>
                <p class="prize-amount">${{ (tournament.prizePool || 0).toLocaleString() }}</p>
              </div>
            </div>

            <div class="info-card">
              <div class="info-body">
                <h4>Дата старта</h4>
                <p>{{ formatDate(tournament.startDate) }}</p>
              </div>
            </div>

            <div class="info-card">
              <div class="info-body">
                <h4>Регистрация до</h4>
                <p>{{ formatDate(tournament.registrationDeadline) }}</p>
              </div>
            </div>

            <div class="info-card">
              <div class="info-body">
                <h4>Формат</h4>
                <p>{{ tournament.format || 'Best of 3 (BO3)' }}</p>
              </div>
            </div>
          </div>
        </div>

        <aside class="sidebar">
          <div class="sidebar-card">
            <h3>О турнире</h3>
            <div class="info-list">
              <div class="info-item">
                <span class="key">Игра:</span>
                <span class="value">{{ tournament.game }}</span>
              </div>
              <div class="info-item">
                <span class="key">Команд:</span>
                <span class="value">{{ tournament.maxTeams || 16 }}</span>
              </div>
              <div class="info-item">
                <span class="key">Уровень:</span>
                <span class="value">{{ tournament.level || 'Любительский' }}</span>
              </div>
              <div class="info-item">
                <span class="key">Регион:</span>
                <span class="value">{{ tournament.region || 'Online' }}</span>
              </div>
            </div>
          </div>

          <div class="sidebar-card">
            <h3>⭐ Оценка турнира</h3>
            <div class="rating">
              <div class="stars">
                <span v-for="i in 5" :key="i" class="star">★</span>
              </div>
              <p class="rating-text">4.8/5 (245 оценок)</p>
            </div>
          </div>

          <div class="sidebar-card">
            <h3>👤 Организатор</h3>
            <div class="organizer">
              <div class="organizer-avatar">🏆</div>
              <div class="organizer-info">
                <h4>{{ tournament.organizer || 'CYBERTOUR' }}</h4>
                <p>Проверенный организатор</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div v-if="relatedTournaments.length > 0" class="related-section">
        <h2>🎮 Похожие турниры</h2>
        <div class="related-grid">
          <TournamentCard
            v-for="t in relatedTournaments"
            :key="t.id"
            :tournament="t"
            :is-authenticated="isAuthenticated"
            :user-id="userId"
            :user-name="userName"
          />
        </div>
      </div>

      <div class="back-button-container">
        <router-link to="/" class="btn btn-secondary">← Вернуться к каталогу</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getTournamentById, getRelatedTournaments, subscribeToTournamentReviews } from '../firebaseService';
import TournamentCard from './TournamentCard.vue';

const route = useRoute();
const props = defineProps({
  isAuthenticated: Boolean,
  userId: String,
  userName: String
});

const tournament = ref(null);
const allTournaments = ref([]);
const reviews = ref([]);
const loading = ref(true);
const registering = ref(false);
const isRegistered = ref(false);
let unsubscribeReviews = null;

const tournamentId = route.params.id;

const loadTournament = async () => {
  try {
    tournament.value = await getTournamentById(tournamentId);
    if (tournament.value) {
      checkIfRegistered();
      loadRelatedTournaments();
      subscribeReviews();
    }
  } catch (error) {
    console.error('Ошибка загрузки турнира:', error);
    tournament.value = null;
  } finally {
    loading.value = false;
  }
};

const checkIfRegistered = async () => {
  if (!props.isAuthenticated || !props.userId) return;
  
  try {
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', props.userId),
      where('tournamentId', '==', tournamentId)
    );
    const querySnapshot = await getDocs(q);
    isRegistered.value = !querySnapshot.empty;
  } catch (error) {
    console.error('Ошибка проверки регистрации:', error);
  }
};

const loadRelatedTournaments = async () => {
  try {
    if (tournament.value) {
      allTournaments.value = await getRelatedTournaments(tournament.value.game, tournamentId, 3);
    }
  } catch (error) {
    console.error('Ошибка загрузки похожих турниров:', error);
  }
};

const subscribeReviews = () => {
  if (!tournament.value) return;
  
  const q = query(
    collection(db, 'reviews'),
    where('tournamentId', '==', tournamentId)
  );

  unsubscribeReviews = getDocs(q).then(snapshot => {
    reviews.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });
};

const relatedTournaments = computed(() => allTournaments.value);

const handleRegister = async () => {
  if (registering.value || isRegistered.value) return;
  
  registering.value = true;
  try {
    await addDoc(collection(db, 'registrations'), {
      tournamentId: tournamentId,
      tournamentName: tournament.value.name,
      game: tournament.value.game,
      userId: props.userId,
      userName: props.userName || 'Аноним',
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    alert('✅ Успешная регистрация!');
    isRegistered.value = true;
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    alert('❌ Ошибка при регистрации. Попробуйте позже.');
  } finally {
    registering.value = false;
  }
};

const isFull = (t) => (t.registeredTeams || 0) >= (t.maxTeams || 16);

const getStatus = (t) => {
  if (t.status === 'completed') return 'ЗАВЕРШЕН';
  const now = new Date();
  const deadline = new Date(t.registrationDeadline);
  if (now > deadline) return 'РЕГИСТРАЦИЯ ЗАКРЫТА';
  return 'ОТКРЫТА РЕГИСТРАЦИЯ';
};

const getStatusClass = (t) => {
  if (t.status === 'completed') return 'completed';
  return new Date() > new Date(t.registrationDeadline) ? 'closed' : 'open';
};

const getProgressPercent = (t) => {
  const percent = Math.round(((t.registeredTeams || 0) / (t.maxTeams || 16)) * 100);
  return Math.min(percent, 100);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(() => {
  loadTournament();
});

onUnmounted(() => {
  if (unsubscribeReviews) unsubscribeReviews();
});
</script>

<style scoped>
.detail-container {
  background: #0a0c0f;
  color: #e0e0e0;
  min-height: 100vh;
  padding: 2rem;
}

.loading-spinner,
.error-state {
  text-align: center;
  padding: 4rem 2rem;
  font-size: 1.1rem;
  color: #808080;
}

.error-state h2 {
  color: #ff4444;
  margin-bottom: 2rem;
}

.tournament-detail {
  max-width: 1200px;
  margin: 0 auto;
}

/* Хедер */
.detail-header {
  background: linear-gradient(135deg, #1a1e22 0%, #14181c 100%);
  padding: 3rem 2rem;
  border: 1px solid #2a2e32;
  margin-bottom: 3rem;
  border-radius: 8px;
}

.breadcrumb {
  color: #808080;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.breadcrumb a {
  color: #00ffff;
  text-decoration: none;
  transition: color 0.3s;
}

.breadcrumb a:hover {
  color: #fff;
}

.detail-title {
  font-size: 2.5rem;
  font-weight: 900;
  color: #fff;
  margin-bottom: 0.5rem;
  letter-spacing: 0.1rem;
}

.detail-subtitle {
  color: #808080;
  font-size: 1.1rem;
}

/* Контент */
.detail-content {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
  margin-bottom: 4rem;
}

/* Основная секция */
.status-banner {
  background: #14181c;
  border: 1px solid #2a2e32;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border-radius: 4px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  color: #808080;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05rem;
}

.value {
  color: #fff;
  font-weight: 600;
  font-size: 1.1rem;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.9rem;
  width: fit-content;
}

.status-badge.open {
  background: #28a745;
  color: #fff;
}

.status-badge.closed {
  background: #dc3545;
  color: #fff;
}

.status-badge.completed {
  background: #ffa500;
  color: #000;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #2a2e32;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ffff 0%, #0088ff 100%);
  transition: width 0.3s ease;
}

/* Победитель */
.winner-banner {
  background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%);
  border: 1px solid #ff8c00;
  padding: 2rem;
  margin-bottom: 2rem;
  border-radius: 8px;
  text-align: center;
}

.winner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.trophy-icon {
  font-size: 3rem;
  animation: bounce 2s infinite;
}

.winner-info h3 {
  color: #000;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.winner-name {
  color: #000;
  font-size: 1.8rem;
  font-weight: bold;
}

/* Кнопка действия */
.action-section {
  margin-bottom: 2rem;
}

.btn-register {
  width: 100%;
  padding: 1.2rem;
  background: linear-gradient(135deg, #00ffff 0%, #0088ff 100%);
  color: #000;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.1rem;
}

.btn-register:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 255, 255, 0.3);
}

.btn-register:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Инфо карточки */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.info-card {
  background: #14181c;
  border: 1px solid #2a2e32;
  padding: 1.5rem;
  border-radius: 4px;
  display: flex;
  gap: 1rem;
  transition: all 0.3s ease;
}

.info-card:hover {
  border-color: #00ffff;
  transform: translateY(-3px);
}

.info-body h4 {
  color: #808080;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05rem;
  margin-bottom: 0.5rem;
}

.info-body p {
  color: #fff;
  font-weight: 600;
  font-size: 1.05rem;
}

.prize-amount {
  color: #00ffff;
  font-size: 1.3rem;
}

/* Боковая панель */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sidebar-card {
  background: #14181c;
  border: 1px solid #2a2e32;
  padding: 1.5rem;
  border-radius: 4px;
}

.sidebar-card h3 {
  color: #fff;
  font-size: 1.05rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #2a2e32;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #1a1e22;
}

.info-item .key {
  color: #808080;
  font-size: 0.85rem;
}

.info-item .value {
  color: #00ffff;
  font-weight: 600;
}

.rating {
  text-align: center;
}

.stars {
  font-size: 1.8rem;
  color: #ffb800;
  margin-bottom: 0.5rem;
  letter-spacing: 0.2rem;
}

.rating-text {
  color: #808080;
  font-size: 0.9rem;
}

.organizer {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.organizer-avatar {
  font-size: 2.5rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0c0f;
  border-radius: 50%;
}

.organizer-info h4 {
  color: #fff;
  margin-bottom: 0.25rem;
}

.organizer-info p {
  color: #808080;
  font-size: 0.85rem;
}

/* Похожие турниры */
.related-section {
  margin-bottom: 4rem;
}

.related-section h2 {
  color: #fff;
  font-size: 1.5rem;
  margin-bottom: 2rem;
  letter-spacing: 0.1rem;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* Назад кнопка */
.back-button-container {
  text-align: center;
  padding: 2rem 0;
}

.btn-secondary {
  display: inline-block;
  padding: 0.8rem 2rem;
  background: #14181c;
  color: #00ffff;
  border: 1px solid #2a2e32;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  border-color: #00ffff;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
}

@media (max-width: 768px) {
  .detail-content {
    grid-template-columns: 1fr;
  }

  .detail-title {
    font-size: 1.5rem;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .status-banner {
    grid-template-columns: 1fr;
  }

  .tournament-detail {
    padding: 1rem;
  }

  .detail-header {
    margin-bottom: 1.5rem;
  }

  .organizer-info {
    margin-bottom: 1.5rem;
  }

  .info-section {
    margin-bottom: 1.5rem;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    margin-bottom: 0.5rem;
  }
}

@media (max-width: 480px) {
  .tournament-detail {
    padding: 0.5rem;
  }

  .detail-title {
    font-size: 1.3rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .info-item {
    padding: 0.5rem;
  }

  .info-label {
    font-size: 0.8rem;
  }

  .info-value {
    font-size: 0.9rem;
  }

  .status-banner {
    padding: 0.5rem;
  }

  .status-text {
    font-size: 0.9rem;
  }

  .organizer-avatar {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .organizer-details h3 {
    font-size: 1rem;
  }

  .organizer-details p {
    font-size: 0.8rem;
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.7rem 1rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 360px) {
  .tournament-detail {
    padding: 0.3rem;
  }

  .detail-title {
    font-size: 1.1rem;
  }

  .info-grid {
    gap: 0.3rem;
  }

  .info-item {
    padding: 0.4rem;
  }

  .info-label {
    font-size: 0.75rem;
  }

  .info-value {
    font-size: 0.8rem;
  }

  .status-banner {
    padding: 0.4rem;
  }

  .status-text {
    font-size: 0.8rem;
  }

  .organizer-avatar {
    width: 35px;
    height: 35px;
    font-size: 0.9rem;
  }

  .organizer-details h3 {
    font-size: 0.9rem;
  }

  .organizer-details p {
    font-size: 0.75rem;
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.6rem 0.8rem;
    font-size: 0.8rem;
  }

  .participants-section h3 {
    font-size: 1rem;
  }

  .participant-item {
    padding: 0.4rem;
    font-size: 0.8rem;
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}
</style>
