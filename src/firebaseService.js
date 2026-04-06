
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * @param {string} sortBy - сортировка ('newest', 'prize-high', 'prize-low')
 * @param {string} game - фильтр по игре (опционально)
 * @param {number} pageSize - размер страницы
 * @returns {Promise<Array>} массив турниров
 */
export const getTournamentsOptimized = async (sortBy = 'newest', game = null, pageSize = 15) => {
  try {
    let q;

    const orderByField = sortBy === 'newest' ? 'createdAt' : 'prizePool';
    const direction = sortBy === 'prize-low' ? 'asc' : 'desc';

    if (game) {
      q = query(
        collection(db, 'tournaments'),
        where('game', '==', game),
        orderBy(orderByField, direction),
        limit(pageSize)
      );
    } else {
      q = query(
        collection(db, 'tournaments'),
        orderBy(orderByField, direction),
        limit(pageSize)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Ошибка загрузки турниров:', error);
    return [];
  }
};

/**
 * @param {Function} callback - функция, которая вызывается при изменении
 * @param {number} pageSize - размер страницы
 * @returns {Function} функция для отписки
 */
export const subscribeToTournaments = (callback, pageSize = 15) => {
  const q = query(
    collection(db, 'tournaments'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const tournaments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(tournaments);
    },
    (error) => {
      console.error('❌ Ошибка подписки на турниры:', error);
    }
  );
};

/**
 * @param {string} tournamentId - ID турнира
 * @returns {Promise<Object|null>} данные турнира или null
 */
export const getTournamentById = async (tournamentId) => {
  try {
    const docRef = doc(db, 'tournaments', tournamentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('❌ Ошибка загрузки турнира:', error);
    return null;
  }
};

/**
 * @param {string} userId - ID пользователя
 * @returns {Promise<Array>} массив регистраций
 */
export const getUserRegistrations = async (userId) => {
  try {
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Ошибка загрузки регистраций:', error);
    return [];
  }
};

/**
 * @param {string} userId - ID пользователя
 * @param {Function} callback - функция для обновлений
 * @returns {Function} функция для отписки
 */
export const subscribeToUserRegistrations = (userId, callback) => {
  const q = query(
    collection(db, 'registrations'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const registrations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(registrations);
    },
    (error) => {
      console.error('Ошибка подписки на регистрации:', error);
    }
  );
};

/**
 * @param {string} tournamentId - ID турнира
 * @returns {Promise<Array>} массив регистраций
 */
export const getTournamentRegistrations = async (tournamentId) => {
  try {
    const q = query(
      collection(db, 'registrations'),
      where('tournamentId', '==', tournamentId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Ошибка загрузки регистраций турнира:', error);
    return [];
  }
};

/**
 * @param {string} tournamentId - ID турнира
 * @returns {Promise<Array>} массив отзывов
 */
export const getTournamentReviews = async (tournamentId) => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('tournamentId', '==', tournamentId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Ошибка загрузки отзывов:', error);
    return [];
  }
};

/**
 * @param {string} tournamentId - ID турнира
 * @param {Function} callback - функция для обновлений
 * @returns {Function} функция для отписки
 */
export const subscribeToTournamentReviews = (tournamentId, callback) => {
  const q = query(
    collection(db, 'reviews'),
    where('tournamentId', '==', tournamentId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(reviews);
    },
    (error) => {
      console.error('❌ Ошибка подписки на отзывы:', error);
    }
  );
};

/**
 * @param {string} game - название игры
 * @param {string} excludeId - ID турнира для исключения
 * @param {number} limit_num - количество результатов
 * @returns {Promise<Array>} массив похожих турниров
 */
export const getRelatedTournaments = async (game, excludeId = null, limit_num = 3) => {
  try {
    const q = query(
      collection(db, 'tournaments'),
      where('game', '==', game),
      orderBy('createdAt', 'desc'),
      limit(limit_num + 1) // +1 в случае если нужно исключить текущий
    );

    const snapshot = await getDocs(q);
    let tournaments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (excludeId) {
      tournaments = tournaments.filter(t => t.id !== excludeId);
    }

    return tournaments.slice(0, limit_num);
  } catch (error) {
    console.error('Ошибка загрузки похожих турниров:', error);
    return [];
  }
};

export const batchUpdateTournaments = async (updates) => {
  try {
    const batch = writeBatch(db);

    updates.forEach(({ doc: docId, data }) => {
      const docRef = doc(db, 'tournaments', docId);
      batch.update(docRef, data);
    });

    await batch.commit();
    console.log('Пакетное обновление завершено');
  } catch (error) {
    console.error('Ошибка пакетного обновления:', error);
  }
};

/**
 * @returns {Promise<Object>} статистика
 */
export const getAdminStats = async () => {
  try {
    const tournamentsSnap = await getDocs(collection(db, 'tournaments'));
    const tournamentCount = tournamentsSnap.size;

    const registrationsSnap = await getDocs(collection(db, 'registrations'));
    const registrationCount = registrationsSnap.size;

    const usersSnap = await getDocs(collection(db, 'users'));
    const userCount = usersSnap.size;

    return {
      tournaments: tournamentCount,
      registrations: registrationCount,
      users: userCount,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error);
    return null;
  }
};

export default {
  getTournamentsOptimized,
  subscribeToTournaments,
  getTournamentById,
  getUserRegistrations,
  subscribeToUserRegistrations,
  getTournamentRegistrations,
  getTournamentReviews,
  subscribeToTournamentReviews,
  getRelatedTournaments,
  batchUpdateTournaments,
  getAdminStats
};
