<template>
  <div class="tournament-card">
    <div class="tournament-header">
      <div class="tournament-game">{{ tournament.game }}</div>
    </div>

    <router-link :to="`/tournament/${tournament.id}`" class="tournament-name-link">
      <h3 class="tournament-name">{{ tournament.name }}</h3>
    </router-link>
    
    <div class="tournament-meta">
      <span>💰 ${{ tournament.prizePool?.toLocaleString() || 0 }}</span>
      <span v-if="tournament.status !== 'completed'" :class="{ 'text-full': isFull(tournament) }">
        Команды: {{ tournament.registeredTeams || 0 }}/{{ tournament.maxTeams || 0 }}
      </span>
    </div>
    
    <div class="tournament-status" :class="getStatusClass(tournament)">
      {{ getStatus(tournament) }}
    </div>

    <div v-if="tournament.status === 'completed' && tournament.winner" class="tournament-winner">
      <span class="winner-label">Победитель:</span>
      <span class="winner-name">{{ tournament.winner }}</span>
    </div>
    
    <div class="tournament-actions">
      <button 
        v-if="isAuthenticated && tournament.status !== 'completed'" 
        @click="handleRegister"
        class="btn-register"
        :disabled="registering || isFull(tournament)"
      >
        <span v-if="registering">ОБРАБОТКА...</span>
        <span v-else-if="isFull(tournament)">МЕСТ НЕТ</span>
        <span v-else>УЧАСТВОВАТЬ</span>
      </button>
      <router-link v-if="!isAuthenticated" to="/login" class="btn-register">ВОЙТИ</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';

const props = defineProps({
  tournament: Object,
  isAuthenticated: Boolean,
  userId: String,
  userName: String
});

const emit = defineEmits(['registered']);
const registering = ref(false);

const handleRegister = async () => {
  if (registering.value) return;

  const max = Number(props.tournament.maxTeams) || 16;
  const current = Number(props.tournament.registeredTeams) || 0;

  if (current >= max) {
    alert('Ошибка: Места в этом турнире действительно закончились!');
    return;
  }

  registering.value = true;
  
  try {
    await addDoc(collection(db, 'registrations'), {
      tournamentId: props.tournament.id,
      tournamentName: props.tournament.name,
      game: props.tournament.game,
      userId: props.userId,
      userName: props.userName || 'Аноним',
      status: 'pending',
      createdAt: serverTimestamp()
    });

    const tournamentRef = doc(db, 'tournaments', props.tournament.id);
    await updateDoc(tournamentRef, {
      registeredTeams: increment(1)
    });

    alert('Успешная регистрация!');
    emit('registered');

  } catch (e) {
    console.error("ОШИБКА ФАЙРБЕЙСА:", e.code, e.message);
    if (e.code === 'permission-denied') {
      alert('Ошибка доступа: Проверьте правила безопасности Firebase!');
    } else {
      alert('Произошла ошибка при регистрации. Попробуйте позже.');
    }
  } finally {
    registering.value = false;
  }
};

const getStatus = (t) => {
  if (t.status === 'completed') return 'ЗАВЕРШЕН';
  return t.registeredTeams >= t.maxTeams ? 'РЕГИСТРАЦИЯ ЗАКРЫТА' : 'ИДЕТ НАБОР';
};

const getStatusClass = (t) => {
  if (t.status === 'completed') return 'status-completed';
  return t.registeredTeams >= t.maxTeams ? 'status-closed' : 'status-open';
};
const isFull = (t) => (t.registeredTeams || 0) >= (t.maxTeams || 0);

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
};
</script>

<style scoped>
.tournament-card { 
  background: #14181c; 
  border: 1px solid #2a2e32; 
  padding: 1.5rem; 
  border-radius: 8px; 
  transition: 0.3s; 
}

.tournament-card:hover { 
  border-color: #00ffff;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
}

.tournament-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.tournament-game { 
  color: #00ffff; 
  font-size: 0.8rem; 
  font-weight: bold; 
  text-transform: uppercase; 
}

.view-details-link {
  font-size: 1.2rem;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.3s;
}

.view-details-link:hover {
  transform: scale(1.2);
}

.tournament-name-link {
  text-decoration: none;
  color: inherit;
}

.tournament-name { 
  color: white; 
  margin: 0;
  font-size: 1.4rem; 
  transition: color 0.3s;
}

.tournament-name-link:hover .tournament-name {
  color: #00ffff;
}

.tournament-meta { 
  display: flex; 
  gap: 1rem; 
  color: #808080; 
  margin-bottom: 1rem; 
  font-size: 0.9rem;
}

.text-full { 
  color: #ff4444; 
  font-weight: bold; 
}

.tournament-status { 
  display: inline-block; 
  padding: 4px 12px; 
  border-radius: 4px; 
  font-size: 0.8rem; 
  font-weight: bold; 
  margin-bottom: 1rem; 
}

.status-open { 
  background: rgba(0, 255, 0, 0.1); 
  color: #00ff00; 
}

.status-closed { 
  background: rgba(255, 68, 68, 0.1); 
  color: #ff4444; 
}

.status-completed {
  background: rgba(255, 165, 0, 0.1);
  color: #ffa500;
}

.tournament-winner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: rgba(255, 165, 0, 0.1);
  border-radius: 4px;
}

.winner-label {
  color: #808080;
  font-size: 0.9rem;
}

.winner-name {
  color: #ffa500;
  font-weight: bold;
}

.btn-register { 
  width: 100%; 
  padding: 0.8rem; 
  background: #00ffff; 
  border: none; 
  font-weight: bold; 
  cursor: pointer; 
  transition: 0.3s; 
  color: #000;
  border-radius: 4px;
  text-decoration: none;
  display: block;
  text-align: center;
}

.btn-register:hover:not(:disabled) { 
  background: #00cccc; 
  transform: translateY(-2px); 
  box-shadow: 0 5px 15px rgba(0, 255, 255, 0.3);
}

.btn-register:disabled { 
  background: #333; 
  color: #666; 
  cursor: not-allowed; 
}

@media (max-width: 768px) {
  .tournament-card {
    padding: 1rem;
  }

  .tournament-name {
    font-size: 1.2rem;
  }

  .tournament-meta {
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .tournament-winner {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .btn-register {
    padding: 0.7rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .tournament-card {
    padding: 0.8rem;
  }

  .tournament-header {
    margin-bottom: 0.3rem;
  }

  .tournament-game {
    font-size: 0.7rem;
  }

  .tournament-name {
    font-size: 1.1rem;
  }

  .tournament-meta {
    font-size: 0.8rem;
  }

  .tournament-status {
    font-size: 0.7rem;
    padding: 3px 8px;
  }

  .tournament-winner {
    padding: 0.4rem;
  }

  .winner-label,
  .winner-name {
    font-size: 0.8rem;
  }

  .btn-register {
    padding: 0.6rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 360px) {
  .tournament-card {
    padding: 0.6rem;
  }

  .tournament-name {
    font-size: 1rem;
  }

  .tournament-meta {
    font-size: 0.75rem;
  }

  .tournament-status {
    font-size: 0.65rem;
    padding: 2px 6px;
  }

  .tournament-winner {
    padding: 0.3rem;
  }

  .winner-label,
  .winner-name {
    font-size: 0.75rem;
  }

  .btn-register {
    padding: 0.5rem;
    font-size: 0.75rem;
  }
}
</style>